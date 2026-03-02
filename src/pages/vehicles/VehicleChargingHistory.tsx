import { useState, useMemo, useEffect, useRef } from 'react'

import {
    Zap,
    Clock,
    RotateCw,
    FileUp,
    X,
    Save
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useVehicles, useVehicleFuel, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { createFuelLog, updateFuelLog, type FuelLogRecord } from '../../lib/vehicles/vehicleService'
import HeaderBar from '../../components/layout/HeaderBar'

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)

export default function VehicleChargingHistory() {
    // Use the first electric vehicle as default, or you can pass ID via state
    const { data: vehicles = [] } = useVehicles()
    const electricVehicles = vehicles.filter(v => v.fuel_type === 'electric')
    const selectedVehicle = electricVehicles[0] // Simple approach for now

    const { data: allLogs = [], isLoading, refetch } = useVehicleFuel(selectedVehicle?.id)

    const queryClient = useQueryClient()
    const [isImporting, setIsImporting] = useState(false)
    const [editingLog, setEditingLog] = useState<FuelLogRecord | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !selectedVehicle) return

        setIsImporting(true)
        const toastId = toast.loading('Đang xử lý file...')

        try {
            const ExcelJS = (await import('exceljs')).default
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(await file.arrayBuffer())

            const worksheet = workbook.worksheets[0] // get first sheet
            if (!worksheet) throw new Error('Cấu trúc file không hợp lệ')

            const logsToCreate: any[] = []

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return // skip header

                const dateVal = row.getCell(1).value
                const stationStr = row.getCell(2).text || ''

                const parseTimeCell = (cell: any) => {
                    if (!cell) return ''
                    if (cell.value instanceof Date) {
                        return `${cell.value.getUTCHours().toString().padStart(2, '0')}:${cell.value.getUTCMinutes().toString().padStart(2, '0')}`
                    }
                    if (typeof cell.value === 'number') {
                        const totalMinutes = Math.round(cell.value * 24 * 60)
                        const h = Math.floor(totalMinutes / 60)
                        const m = totalMinutes % 60
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                    }
                    const text = (cell.text || cell.toString() || '').trim()
                    const match = text.match(/(\d{1,2}:\d{2})/)
                    if (match) return match[1].padStart(5, '0')
                    return text
                }

                const getNum = (cell: any, isFloat = false) => {
                    if (!cell) return 0
                    if (typeof cell.value === 'number') return cell.value
                    if (cell.value && typeof cell.value.result === 'number') return cell.value.result
                    const t = (cell.text || '').trim()
                    if (!t) return 0
                    if (isFloat) return parseFloat(t.replace(',', '.')) || 0
                    return parseInt(t.replace(/\D/g, ''), 10) || 0
                }

                const headerRow = worksheet.getRow(1)
                const col3Header = (headerRow.getCell(3).text || '').toLowerCase()
                let timeCol = 4
                if (col3Header.includes('bắt đầu') || col3Header.includes('giờ') || col3Header.includes('thời gian')) {
                    timeCol = 3
                }

                const odoVal = timeCol === 4 ? getNum(row.getCell(3)) : 0
                const startTimeStr = parseTimeCell(row.getCell(timeCol))
                const endTimeStr = parseTimeCell(row.getCell(timeCol + 1))
                const durationStr = parseTimeCell(row.getCell(timeCol + 2))

                const kwh = getNum(row.getCell(timeCol + 3), true)
                const unitPrice = Math.round(getNum(row.getCell(timeCol + 4)))
                const cost = Math.round(getNum(row.getCell(timeCol + 5)))
                const notesStr = row.getCell(timeCol + 6).text || ''

                // Parse Date avoiding 1-day offset issues
                let refuelDateParam = new Date().toISOString().split('T')[0]
                if (dateVal) {
                    if (dateVal instanceof Date) {
                        refuelDateParam = new Date(dateVal.getTime() - (dateVal.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                    } else {
                        const dateStrVal = dateVal.toString().trim()
                        if (dateStrVal.includes('/')) {
                            const parts = dateStrVal.split('/')
                            if (parts.length === 3) {
                                const y = parts[2].length === 2 ? '20' + parts[2] : parts[2]
                                refuelDateParam = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
                            }
                        }
                    }
                }

                let durationMins = 0
                if (startTimeStr && endTimeStr) {
                    const startParts = startTimeStr.split(':')
                    const endParts = endTimeStr.split(':')
                    if (startParts.length >= 2 && endParts.length >= 2) {
                        const startTotal = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10)
                        let endTotal = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10)
                        if (endTotal < startTotal) {
                            endTotal += 24 * 60 // Sạc qua đêm
                        }
                        durationMins = endTotal - startTotal
                    }
                } else if (durationStr) {
                    const durParts = durationStr.split(':')
                    if (durParts.length >= 2) durationMins = parseInt(durParts[0], 10) * 60 + parseInt(durParts[1], 10)
                }

                let finalNotes = notesStr
                if (endTimeStr) {
                    const endMatch = endTimeStr.match(/^(\d{1,2}:\d{2})/) || endTimeStr.match(/(\d{1,2}:\d{2})/)
                    if (endMatch) {
                        finalNotes += ` \nKết thúc: ${endMatch[1].padStart(5, '0')}`
                    }
                }
                if (durationMins > 0) finalNotes += ` \nThời gian sạc: ${durationMins} phút`
                if (unitPrice === 3858) {
                    // Mốc giá 3.858đ là điểm sạc có VAT. total_amount (gốc) mình sẽ tính từ kwh * 3.858, phần còn lại cost (thực tế trả qua excel)
                    const expectedTotal = Math.round(kwh * unitPrice)
                    if (expectedTotal > cost) finalNotes += ` \nKhuyến mãi: -${(expectedTotal - cost).toLocaleString('vi-VN')}đ`
                }

                let validRefuelTime = null
                if (startTimeStr) {
                    const timeMatch = startTimeStr.match(/^(\d{1,2}:\d{2})/) || startTimeStr.match(/(\d{1,2}:\d{2})/)
                    if (timeMatch) validRefuelTime = timeMatch[1].padStart(5, '0')
                }

                logsToCreate.push({
                    vehicle_id: selectedVehicle.id,
                    refuel_date: refuelDateParam,
                    refuel_time: validRefuelTime,
                    odometer_at_refuel: Number(odoVal) || 0,
                    fuel_type: 'electric',
                    fuel_category: 'electric',
                    station_name: stationStr || 'Nhập từ Excel',
                    notes: finalNotes.trim() || null,
                    kwh: kwh,
                    unit_price: unitPrice || null,
                    total_amount: cost, // Keep as cost like the screenshot format represents net flow usually 
                    total_cost: cost,
                    charge_duration_minutes: durationMins || null
                })
            })

            let successCount = 0
            for (const payload of logsToCreate) {
                try {
                    await createFuelLog(payload as any)
                    successCount++
                } catch (e) { console.error('Lỗi khi import:', e) }
            }

            toast.success(`Nhập thành công ${successCount} trạm sạc`, { id: toastId })
            queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicle.id) })

        } catch (error) {
            console.error(error)
            toast.error('Có lỗi xảy ra khi nhập file', { id: toastId })
        } finally {
            setIsImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Filter electric logs
    const logs = allLogs.filter(log => log.fuel_type === 'electric' || log.fuel_category === 'electric')

    const [filterYear, setFilterYear] = useState<'all' | number>('all')
    const [filterMonth, setFilterMonth] = useState<'all' | number>('all')

    const availableYears = useMemo(() => {
        const years = new Set(logs.map(log => new Date(log.refuel_date).getFullYear()))
        return Array.from(years).sort((a, b) => b - a)
    }, [logs])

    const availableMonths = useMemo(() => {
        if (filterYear === 'all') return []
        const months = new Set(logs.filter(log => new Date(log.refuel_date).getFullYear() === filterYear).map(log => new Date(log.refuel_date).getMonth() + 1))
        return Array.from(months).sort((a, b) => b - a)
    }, [logs, filterYear])

    // When year changes, reset month to 'all'
    useEffect(() => {
        setFilterMonth('all')
    }, [filterYear])

    const filteredLogs = useMemo(() => {
        let result = logs
        if (filterYear !== 'all') {
            result = result.filter(log => new Date(log.refuel_date).getFullYear() === filterYear)
        }
        if (filterMonth !== 'all') {
            result = result.filter(log => (new Date(log.refuel_date).getMonth() + 1) === filterMonth)
        }
        return result
    }, [logs, filterYear, filterMonth])

    // Stats
    const totalKwh = filteredLogs.reduce((sum, log) => sum + (log.kwh || 0), 0)
    const totalDurationMins = filteredLogs.reduce((sum, log) => {
        let mins = log.charge_duration_minutes || 0
        if (log.notes) {
            const match = log.notes.match(/Thời gian sạc:\s*(\d+)/)
            if (match) mins = parseInt(match[1], 10)
        }
        return sum + mins
    }, 0)
    const pluggedHours = Math.floor(totalDurationMins / 60)
    const pluggedMins = totalDurationMins % 60
    const pluggedDisplay = pluggedHours > 0 ? `${pluggedHours}h ${pluggedMins}m` : `${pluggedMins}m`
    const totalCost = filteredLogs.reduce((sum, log) => sum + (log.total_cost ?? log.total_amount ?? 0), 0)

    // Calculate saved amount (total_amount - total_cost)
    const totalSaved = filteredLogs.reduce((sum, log) => {
        const amount = log.total_amount || 0
        const cost = log.total_cost ?? log.total_amount ?? 0
        return sum + Math.max(0, amount - cost)
    }, 0)

    // Helpers
    const calculateEndTime = (startTimeStr: string, durationMins: number) => {
        if (!startTimeStr || !durationMins) return ''
        const [hours, minutes] = startTimeStr.split(':').map(Number)
        const d = new Date()
        d.setHours(hours, minutes, 0)
        d.setMinutes(d.getMinutes() + durationMins)
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <RotateCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Lịch sử chi tiết"
                onReload={() => { refetch(); }}
                customContent={
                    <>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95 disabled:opacity-50"
                            title="Nhập Excel"
                        >
                            {isImporting ? (
                                <RotateCw className="h-5 w-5 text-slate-500 animate-spin" />
                            ) : (
                                <FileUp className="h-5 w-5 text-slate-500" />
                            )}
                        </button>
                    </>
                }
            />

            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
                {/* Summary Info Row */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-white border border-slate-100 px-4 py-3 shadow-md">
                    <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">{filteredLogs.length}</span> / {logs.length} phiên sạc
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {filterYear === 'all' ? 'Tất cả thời gian' : `Năm ${filterYear}`}
                    </p>
                </div>

                {/* Segmented Control */}
                <div className={`flex items-center gap-3 ${filterYear === 'all' ? 'mb-6' : 'mb-3'}`}>
                    <button
                        onClick={() => setFilterYear('all')}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterYear === 'all'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        Tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setFilterYear(year)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterYear === year
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-transparent text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>

                {filterYear !== 'all' && availableMonths.length > 0 && (
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
                        <button
                            onClick={() => setFilterMonth('all')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterMonth === 'all'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-md'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            Cả năm
                        </button>
                        {availableMonths.map(month => (
                            <button
                                key={month}
                                onClick={() => setFilterMonth(month)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterMonth === month
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-md'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                T{month}
                            </button>
                        ))}
                    </div>
                )}

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-[#f0fdf4] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-md border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase mb-1.5 leading-none">Năng lượng</p>
                        <p className="text-xl font-black text-emerald-700 leading-none">{Math.round(totalKwh)} kWh</p>
                    </div>
                    <div className="bg-[#fdf4ff] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-md border border-fuchsia-200">
                        <p className="text-[10px] font-bold text-fuchsia-600 tracking-widest uppercase mb-1.5 leading-none">Cắm sạc</p>
                        <p className="text-xl font-black text-fuchsia-700 leading-none">{pluggedDisplay}</p>
                    </div>
                    <div className="bg-[#eff6ff] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-md border border-blue-200">
                        <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase mb-1.5 leading-none">Chi phí</p>
                        <p className="text-xl font-black text-blue-700 leading-none">{formatCurrency(totalCost).replace('₫', 'đ').trim()}</p>
                    </div>
                    <div className="bg-[#fffbeb] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-md border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-600 tracking-widest uppercase mb-1.5 leading-none">Tiết kiệm</p>
                        <p className="text-xl font-black text-amber-600 leading-none">{formatCurrency(totalSaved).replace('₫', 'đ').trim()}</p>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredLogs.map(log => {
                        let parsedEndTime = ''
                        let parsedDurationMins = log.charge_duration_minutes || 0

                        // Parse exact times and clean notes
                        let cleanNotesStr = ''
                        if (log.notes) {
                            const lines = log.notes.split('\n')
                            for (const line of lines) {
                                if (line.includes('Kết thúc:')) {
                                    const match = line.match(/Kết thúc:\s*([0-9:]+)/)
                                    if (match) parsedEndTime = match[1].trim()
                                }
                                if (line.includes('Thời gian sạc:')) {
                                    const match = line.match(/Thời gian sạc:\s*(\d+)/)
                                    if (match) parsedDurationMins = parseInt(match[1], 10)
                                }
                            }

                            const cleanLines = lines.filter(l => !l.includes('📍') && !l.includes('🔗') && !l.includes('GPS:') && !l.includes('https://www.google.com/maps'))
                            cleanNotesStr = cleanLines.map(l => l.replace(/[⏱⏳]/g, '').trim()).filter(Boolean).join(' ')
                        }

                        const dateObj = new Date(log.refuel_date)
                        const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        const startTime = log.refuel_time?.slice(0, 5) || '--:--'
                        const endTime = parsedEndTime || calculateEndTime(startTime, parsedDurationMins) || '--:--'
                        const price = log.unit_price || 0
                        const locationParts = [log.station_name, log.location].filter(Boolean)
                        const title = locationParts[0] || 'Trạm sạc'
                        const subtitle = locationParts[1] || 'Không rõ địa điểm'

                        return (
                            <div key={log.id} onClick={() => setEditingLog(log as FuelLogRecord)} className="bg-white rounded-[20px] p-5 shadow-md border border-gray-300 flex flex-col gap-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
                                {/* Header */}
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-bold text-slate-800 truncate">{title}</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-0.5 truncate">{subtitle}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-slate-700">{dateStr}</p>
                                        <p className="text-xs font-medium text-slate-400 mt-0.5">{startTime} → {endTime}</p>
                                    </div>
                                </div>

                                {/* Bottom Stats */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="h-4 w-4 text-emerald-500" />
                                            <span className="text-[15px] font-black text-slate-800">{log.kwh?.toFixed(1) || 0} kWh</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-blue-500" />
                                            <span className="text-[13px] font-semibold text-slate-600">{parsedDurationMins}m</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {/* Show crossed original price and Free badge if cost is 0 */}
                                        {log.total_cost === 0 ? (
                                            <>
                                                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mr-1.5 uppercase">Free</span>
                                                <span className="text-xs font-medium text-slate-400 line-through">{formatCurrency((log.kwh || 0) * (price || 3858)).replace('₫', 'đ').trim()}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[15px] font-black text-slate-800">{formatCurrency(log.total_cost || log.total_amount || 0).replace('₫', 'đ').trim()}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="mt-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1.5 px-0.5">
                                        <span>Tỉ lệ sạc</span>
                                        <span className="text-emerald-500 font-bold">{Math.round(Math.min(100, Math.max(0, ((log.kwh || 0) / 37.23) * 100)))}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(0, ((log.kwh || 0) / 37.23) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Clean Notes display if any exist */}
                                {cleanNotesStr && (
                                    <div className="pt-3 border-t border-slate-100 mt-0.5">
                                        <p className="text-[13px] text-slate-600 font-medium">Ghi chú: <span className="text-slate-500 font-normal">{cleanNotesStr}</span></p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            {/* Edit Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[3px]">
                    <div className="w-full rounded-t-3xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-blue-600 rounded-t-3xl px-5 pt-5 pb-4 text-white">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <Zap className="h-5 w-5 fill-white/20" />
                                    Chỉnh sửa chi phí sạc
                                </h3>
                                <button onClick={() => setEditingLog(null)} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-xs opacity-80 mt-1 ml-7">{editingLog.station_name} · {new Date(editingLog.refuel_date).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-5">
                            <form onSubmit={async (e) => {
                                e.preventDefault()
                                const form = e.target as HTMLFormElement
                                const price = Number(form.price.value) || 0
                                const cost = Number(form.cost.value) || 0
                                const notes = form.notes.value.trim()

                                const toastId = toast.loading('Đang cập nhật...')
                                try {
                                    await updateFuelLog(editingLog.id, {
                                        unit_price: price,
                                        total_cost: cost,
                                        total_amount: cost,
                                        notes: notes || undefined
                                    })
                                    toast.success('Đã cập nhật thành công', { id: toastId })
                                    setEditingLog(null)
                                    queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicle?.id as string) })
                                } catch (error) {
                                    toast.error('Lỗi khi cập nhật', { id: toastId })
                                }
                            }} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Đơn giá (đ/kWh)</label>
                                        <input type="number" name="price" defaultValue={editingLog.unit_price || ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white outline-none" placeholder="VD: 3858" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thành tiền (VNĐ)</label>
                                        <input type="number" name="cost" required defaultValue={editingLog.total_cost ?? editingLog.total_amount ?? ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ghi chú & Khuyến mãi</label>
                                    <textarea name="notes" rows={4} defaultValue={editingLog.notes || ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white outline-none" placeholder="Nhập ghi chú hoặc thông tin khuyến mãi..."></textarea>
                                </div>
                                <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3.5 font-bold transition-all mt-2">
                                    <Save className="h-5 w-5" />
                                    Lưu thay đổi
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
