import { useState, useMemo, useEffect, useRef } from 'react'

import {
    Zap,
    Clock,
    RotateCw,
    FileUp,
    X,
    Save,
    Search,
    Filter
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
                    // If it's a Date object, it's likely a Time-formatted cell in Excel
                    if (cell.value instanceof Date) {
                        // Use getHours/getMinutes for local time representation from ExcelJS
                        const h = cell.value.getHours()
                        const m = cell.value.getMinutes()
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                    }
                    if (typeof cell.value === 'number') {
                        // Excel stores time as a fraction of a 24-hour day
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
                        
                        // Handle overnight charging or simply chronological end > start
                        if (endTotal < startTotal) {
                            endTotal += 24 * 60 
                        }
                        durationMins = endTotal - startTotal
                    }
                }
                
                // If duration column is available and we didn't calculate from start/end (or calculation resulted in 0)
                if (durationMins <= 0 && durationStr) {
                    const durParts = durationStr.split(':')
                    if (durParts.length >= 2) {
                        durationMins = parseInt(durParts[0], 10) * 60 + parseInt(durParts[1], 10)
                    } else if (!isNaN(parseInt(durationStr, 10))) {
                        durationMins = parseInt(durationStr, 10)
                    }
                }

                let finalNotes = notesStr
                if (endTimeStr) {
                    const endMatch = endTimeStr.match(/^(\d{1,2}:\d{2})/) || endTimeStr.match(/(\d{1,2}:\d{2})/)
                    if (endMatch) {
                        finalNotes += ` \nKết thúc: ${endMatch[1].padStart(5, '0')}`
                    }
                }
                if (durationMins > 0) {
                    const h_final = Math.floor(durationMins / 60)
                    const m_final = durationMins % 60
                    const durStrNote = h_final > 0 ? `${h_final} giờ ${m_final} phút` : `${m_final} phút`
                    finalNotes += ` \nThời gian sạc: ${durStrNote}`
                }
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
    const [searchTerm, setSearchTerm] = useState('')
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

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

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim()

            // Smart queries
            if (term.includes('chi phí cao nhất') || term.includes('tiền nhiều nhất') || term.includes('đắt nhất')) {
                const maxCost = Math.max(0, ...result.map(l => l.total_cost || l.total_amount || 0))
                result = result.filter(l => (l.total_cost || l.total_amount || 0) === maxCost && maxCost > 0)
            } else if (term.includes('chi phí thấp nhất') || term.includes('rẻ nhất')) {
                const minCost = Math.min(...result.filter(l => (l.total_cost || l.total_amount || 0) > 0).map(l => l.total_cost || l.total_amount || 0))
                result = result.filter(l => (l.total_cost || l.total_amount || 0) === minCost)
            } else if (term.includes('nhiều năng lượng') || term.includes('nhiều điện') || term.includes('kwh cao nhất')) {
                const maxKwh = Math.max(0, ...result.map(l => l.kwh || 0))
                result = result.filter(l => (l.kwh || 0) === maxKwh && maxKwh > 0)
            } else if (term.includes('thời gian sạc lâu nhất') || term.includes('sạc lâu')) {
                const getDuration = (l: FuelLogRecord) => {
                    let mins = l.charge_duration_minutes || 0
                    if (l.notes) {
                        const match = l.notes.match(/Thời gian sạc:\s*(\d+)/)
                        if (match) mins = parseInt(match[1], 10)
                    }
                    return mins
                }
                const maxDur = Math.max(0, ...result.map(getDuration))
                result = result.filter(l => getDuration(l) === maxDur && maxDur > 0)
            } else {
                // Normal search
                result = result.filter(log => {
                    const searchFields = [
                        log.station_name,
                        log.location,
                        log.notes,
                        log.kwh?.toString(),
                        log.total_cost?.toString(),
                    ].filter(Boolean).map(s => String(s).toLowerCase())
                    return searchFields.some(field => field.includes(term))
                })
            }
        }

        return result
    }, [logs, filterYear, filterMonth, searchTerm])

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
    const pluggedDisplay = pluggedHours > 0 ? `${pluggedHours} giờ ${pluggedMins} phút` : `${pluggedMins} phút`
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
        d.setHours(hours, minutes, 0, 0)
        d.setMinutes(d.getMinutes() + durationMins)
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }

    const formatDuration = (mins: number, isShort = false) => {
        if (!mins || mins <= 0) return isShort ? '--' : '0 phút'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        // Standardize to full words for everything as requested
        if (h > 0) return `${h} giờ ${m} phút`
        return `${m} phút`
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

            <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-4 pt-4 pb-4">
                {/* Summary Info Row */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-white border border-slate-100 px-4 py-3 shadow-md">
                    <p className="text-sm font-semibold text-slate-600">
                        <span className="font-black text-slate-800">{filteredLogs.length}</span> / {logs.length} phiên sạc
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {filterYear === 'all' ? 'Tất cả thời gian' : `Năm ${filterYear}`}
                    </p>
                </div>

                {/* Segmented Control & Filter Button */}
                <div className={`flex items-center justify-between gap-3 ${filterYear === 'all' ? 'mb-6' : 'mb-3'}`}>
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1">
                        <button
                            onClick={() => setFilterYear('all')}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${filterYear === 'all'
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
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ${filterYear === year
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                    : 'bg-transparent text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    {/* Filter Icon Button */}
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`p-2 rounded-3xl transition-all shadow-xl shrink-0 ${searchTerm ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
                            }`}
                        title="Tìm kiếm & Cấu hình lọc"
                    >
                        {searchTerm ? <Filter className="h-5 w-5 fill-blue-600/20" /> : <Search className="h-5 w-5" />}
                    </button>
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
                    <div className="bg-[#f0fdf4] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-md border border-green-200">
                        <p className="text-[10px] font-bold text-green-600 tracking-widest uppercase mb-1.5 leading-none">Năng lượng</p>
                        <p className="text-xl font-black text-green-700 leading-none">{Math.round(totalKwh)} kWh</p>
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
                    {filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                <Search className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Không tìm thấy kết quả nào</p>
                            <p className="mt-1 text-xs text-slate-400">Hãy thử thay đổi từ khóa hoặc bộ lọc</p>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-full">
                                    Xóa tìm kiếm
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredLogs.map(log => {
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
                                        const hMatch = line.match(/(\d+)\s*(g|h|giờ|hour)/i)
                                        const mMatch = line.match(/(\d+)\s*(p|ph|m|phút|minute)/i)
                                        let totalMins = 0
                                        if (hMatch) totalMins += parseInt(hMatch[1], 10) * 60
                                        if (mMatch) totalMins += parseInt(mMatch[1], 10)
                                        if (!hMatch && !mMatch) {
                                            const simpleMatch = line.match(/(\d+)/)
                                            if (simpleMatch) totalMins = parseInt(simpleMatch[1], 10)
                                        }
                                        if (totalMins > 0) parsedDurationMins = totalMins
                                    }
                                }

                                const cleanLines = lines.filter(l => !l.includes('📍') && !l.includes('🔗') && !l.includes('GPS:') && !l.includes('https://www.google.com/maps') && !l.includes('Kết thúc:') && !l.includes('Thời gian sạc:') && !l.includes('Khuyến mãi:'))
                                cleanNotesStr = cleanLines.map(l => l.replace(/[⏱⏳]/g, '').trim()).filter(Boolean).join(' ')
                            }

                            const dateObj = new Date(log.refuel_date)
                            const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            const startTime = log.refuel_time?.slice(0, 5) || '--:--'
                            
                            // Prioritize calculation from START and END if both exist
                            if (startTime !== '--:--' && parsedEndTime) {
                                const [sh, sm] = startTime.split(':').map(Number)
                                const [eh, em] = parsedEndTime.split(':').map(Number)
                                let calcMins = (eh * 60 + em) - (sh * 60 + sm)
                                if (calcMins < 0) calcMins += 24 * 60
                                if (calcMins > 0) parsedDurationMins = calcMins
                            }

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
                                                <Zap className="h-4 w-4 text-green-500" />
                                                <span className="text-[15px] font-black text-slate-800">{log.kwh?.toFixed(1) || 0} kWh</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4 text-blue-500" />
                                                <span className="text-[13px] font-semibold text-slate-600">{formatDuration(parsedDurationMins, true)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {/* Show crossed original price and Free badge if cost is 0 */}
                                            {log.total_cost === 0 ? (
                                                <>
                                                    <span className="text-xs font-extrabold text-green-600 bg-green-50 px-2 py-0.5 rounded-md mr-1.5 uppercase">Free</span>
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
                                            <span className="text-green-500 font-bold">{Math.round(Math.min(100, Math.max(0, ((log.kwh || 0) / 37.23) * 100)))}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all duration-500"
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
                        })
                    )}
                </div>
                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            {/* Details & Edit Modal */}
            {editingLog && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={() => setEditingLog(null)}>
                    <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-600 px-5 pt-3 pb-5 text-white shrink-0">
                            {/* Mobile Handle */}
                            <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                                <div className="h-1.5 w-12 rounded-full bg-white/40" />
                            </div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Zap className="h-5 w-5 fill-white/20" />
                                    Chi tiết phiên sạc
                                </h3>
                                <button onClick={() => setEditingLog(null)} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm opacity-90 mt-1 ml-7">{editingLog.station_name} · {new Date(editingLog.refuel_date).toLocaleDateString('vi-VN')} {editingLog.refuel_time?.slice(0, 5) || ''}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
                            {(() => {
                                let parsedEndTimeModal = ''
                                let parsedDurationMinsModal = editingLog.charge_duration_minutes || 0
                                let parsedKhuyenMai = ''
                                let cleanNotesModal = ''

                                if (editingLog.notes) {
                                    const lines = editingLog.notes.split('\n')
                                    for (const line of lines) {
                                        if (line.includes('Kết thúc:')) {
                                            const match = line.match(/Kết thúc:\s*([0-9:]+)/)
                                            if (match) parsedEndTimeModal = match[1].trim()
                                        }
                                        if (line.includes('Thời gian sạc:')) {
                                            const hMatch = line.match(/(\d+)\s*(g|h|giờ|hour)/i)
                                            const mMatch = line.match(/(\d+)\s*(p|ph|m|phút|minute)/i)
                                            
                                            let totalMins = 0
                                            if (hMatch) totalMins += parseInt(hMatch[1], 10) * 60
                                            if (mMatch) totalMins += parseInt(mMatch[1], 10)
                                            
                                            if (!hMatch && !mMatch) {
                                                const simpleMatch = line.match(/(\d+)/)
                                                if (simpleMatch) totalMins = parseInt(simpleMatch[1], 10)
                                            }
                                            
                                            if (totalMins > 0) parsedDurationMinsModal = totalMins
                                        }
                                        if (line.includes('Khuyến mãi:')) {
                                            const match = line.match(/Khuyến mãi:\s*([^\n]+)/)
                                            if (match) parsedKhuyenMai = match[1].trim()
                                        }
                                    }
                                    const cleanLines = lines.filter(l => !l.includes('📍') && !l.includes('🔗') && !l.includes('GPS:') && !l.includes('https://www.google.com/maps') && !l.includes('Kết thúc:') && !l.includes('Thời gian sạc:') && !l.includes('Khuyến mãi:'))
                                    cleanNotesModal = cleanLines.map(l => l.replace(/[⏱⏳]/g, '').trim()).filter(Boolean).join(' ')
                                }

                                const startTimeModal = editingLog.refuel_time?.slice(0, 5) || '--:--'
                                
                                // RE-CALCULATE duration from START and END if available
                                if (startTimeModal !== '--:--' && parsedEndTimeModal) {
                                     const [sh, sm] = startTimeModal.split(':').map(Number)
                                     const [eh, em] = parsedEndTimeModal.split(':').map(Number)
                                     let calcMins = (eh * 60 + em) - (sh * 60 + sm)
                                     if (calcMins < 0) calcMins += 24 * 60
                                     if (calcMins > 0) parsedDurationMinsModal = calcMins
                                }

                                const endTimeModal = parsedEndTimeModal || calculateEndTime(startTimeModal, parsedDurationMinsModal) || '--:--'
                                const durationModal = formatDuration(parsedDurationMinsModal)
                                const percentModal = Math.round(Math.min(100, Math.max(0, ((editingLog.kwh || 0) / 37.23) * 100)))
                                const actualCostModal = editingLog.total_cost !== undefined && editingLog.total_cost !== null ? editingLog.total_cost : (editingLog.total_amount || 0)
                                const originalCostModal = (editingLog.kwh || 0) * (editingLog.unit_price || 3858)

                                return (
                                    <>
                                        {/* Read-only details */}
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian</p>
                                                <p className="text-sm font-bold text-slate-800">{startTimeModal} → {endTimeModal}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời lượng sạc</p>
                                                <p className="text-sm font-bold text-slate-800">{durationModal}</p>
                                            </div>

                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vị trí địa chỉ</p>
                                                <p className="text-sm font-bold text-slate-800 leading-snug">{editingLog.station_name}{editingLog.location ? ` - ${editingLog.location}` : ''}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Năng lượng</p>
                                                <p className="text-sm font-bold text-slate-800">{editingLog.kwh ? `${editingLog.kwh.toFixed(2)} kWh` : '--'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tỉ lệ sạc</p>
                                                <p className="text-sm font-bold text-green-600">~{percentModal}% pin</p>
                                            </div>

                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chi phí phiên sạc</p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-black text-blue-600">
                                                        {actualCostModal === 0 ? 'Miễn phí' : formatCurrency(actualCostModal).replace('₫', 'đ').trim()}
                                                    </span>
                                                    {(actualCostModal < originalCostModal || parsedKhuyenMai) && (
                                                        <span className="text-xs font-semibold text-slate-400 line-through">
                                                            {formatCurrency(originalCostModal).replace('₫', 'đ').trim()}
                                                        </span>
                                                    )}
                                                    {parsedKhuyenMai && (
                                                        <span className="text-xs font-bold text-green-500 bg-green-50 px-1.5 py-0.5 rounded">
                                                            KM: {parsedKhuyenMai}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {cleanNotesModal && (
                                                <div className="col-span-2">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</p>
                                                    <p className="text-sm font-medium text-slate-700">{cleanNotesModal}</p>
                                                </div>
                                            )}
                                        </div>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault()
                                            const form = e.target as HTMLFormElement
                                            const notes = form.notes.value.trim()

                                            const toastId = toast.loading('Đang cập nhật...')
                                            try {
                                                await updateFuelLog(editingLog.id, {
                                                    notes: notes || undefined
                                                })
                                                toast.success('Đã cập nhật thành công', { id: toastId })
                                                setEditingLog(null)
                                                queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicle?.id as string) })
                                            } catch (error) {
                                                toast.error('Lỗi khi cập nhật', { id: toastId })
                                            }
                                        }} className="space-y-4 border-t border-slate-100 pt-5">
                                            <h4 className="font-bold text-slate-800 text-sm mb-3">Chỉnh sửa ghi chú</h4>
                                            <div>
                                                <textarea name="notes" rows={4} defaultValue={editingLog.notes || ''} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:bg-white outline-none transition-colors" placeholder="Dữ liệu import thường lưu trữ tại đây..."></textarea>
                                            </div>
                                            <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3.5 font-bold transition-all shadow-md shadow-blue-200">
                                                <Save className="h-5 w-5" />
                                                Lưu cập nhật
                                            </button>
                                        </form>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={() => setIsFilterModalOpen(false)}>
                    <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                        {/* Mobile Handle */}
                        <div className="flex w-full justify-center pt-3 pb-1 flex-shrink-0 bg-white sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800">Tìm kiếm & Lọc</h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-6 overflow-y-auto">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Từ khóa tìm kiếm</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Tên trạm, địa chỉ, ghi chú..."
                                        className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tìm kiếm thông minh</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Chi phí cao nhất',
                                        'Chi phí thấp nhất',
                                        'Nhiều điện nhất',
                                        'Sạc lâu nhất'
                                    ].map(suggest => (
                                        <button
                                            key={suggest}
                                            onClick={() => setSearchTerm(suggest)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${searchTerm === suggest
                                                ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            {suggest}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setIsFilterModalOpen(false)}
                                    className="w-full rounded-2xl bg-blue-600 text-white font-bold py-3.5 hover:bg-blue-700 active:scale-[0.98] transition-all"
                                >
                                    Xem kết quả ({filteredLogs.length})
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchTerm('')
                                        setFilterYear('all')
                                        setIsFilterModalOpen(false)
                                    }}
                                    className="w-full mt-2 rounded-2xl bg-slate-100 text-slate-600 font-bold py-3.5 hover:bg-slate-200 active:scale-[0.98] transition-all"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

