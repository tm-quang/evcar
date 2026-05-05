import { useState, useMemo, useEffect, useRef } from 'react'

import {
    Zap,
    Clock,
    RotateCw,
    FileUp,
    X,
    Save,
    Search,
    Filter,
    TrendingUp,
    ChevronRight,
    MapPin,
} from 'lucide-react'
import { LuDollarSign } from "react-icons/lu";
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useVehicles, useVehicleCharging, vehicleKeys } from '../../lib/ev/useVehicleQueries'
import { createFuelLog, updateFuelLog, type FuelLogRecord } from '../../lib/ev/vehicleService'
import { useAppearance } from '../../contexts/AppearanceContext'
import HeaderBar from '../../components/layout/HeaderBar'

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0,
    }).format(Math.round(value)) + ' đ'

const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)

export default function VehicleChargingHistory() {
    // Use the first electric vehicle as default, or you can pass ID via state
    const { data: vehicles = [] } = useVehicles()
    const electricVehicles = vehicles.filter(v => v.fuel_type === 'electric')
    const selectedVehicle = electricVehicles[0] // Simple approach for now

    const { isDarkMode } = useAppearance()
    const { data: allLogs = [], isLoading, refetch } = useVehicleCharging(selectedVehicle?.id)

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
                    if (typeof cell.value === 'number') return isFloat ? cell.value : Math.round(cell.value)
                    if (cell.value && typeof cell.value.result === 'number') return isFloat ? cell.value.result : Math.round(cell.value.result)
                    const t = (cell.text || '').trim()
                    if (!t) return 0
                    if (isFloat) return parseFloat(t.replace(',', '.')) || 0
                    return Math.round(parseFloat(t.replace(/\D/g, '')) || 0)
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
                const unitPrice = getNum(row.getCell(timeCol + 4))
                const cost = getNum(row.getCell(timeCol + 5))
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
                    const expectedTotal = kwh * unitPrice
                    if (expectedTotal > cost) finalNotes += ` \nKhuyến mãi: -${(expectedTotal - cost).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`
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
                    total_amount: Math.round(cost), // Keep as cost like the screenshot format represents net flow usually 
                    total_cost: Math.round(cost),
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

        // Sort newest first (by date then by created_at or refuel_time)
        return [...result].sort((a, b) => {
            const dateA = new Date(a.refuel_date).getTime()
            const dateB = new Date(b.refuel_date).getTime()
            if (dateB !== dateA) return dateB - dateA

            // Same date, use time if available
            if (a.refuel_time && b.refuel_time) {
                return b.refuel_time.localeCompare(a.refuel_time)
            }

            // Fallback to created_at
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
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
    const totalCost = filteredLogs.reduce((sum, log) => {
        const cost = log.total_cost ?? log.total_amount ?? 0
        return sum + Math.round(Number(cost))
    }, 0)

    // Calculate saved amount (total_amount - total_cost)
    const totalSaved = filteredLogs.reduce((sum, log) => {
        const amount = Math.round(Number(log.total_amount || 0))
        const cost = Math.round(Number(log.total_cost ?? log.total_amount ?? 0))
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
        if (isShort) {
            if (h > 0) return `${h}h ${m}m`
            return `${m}m`
        }
        if (h > 0) return `${h} giờ ${m} phút`
        return `${m} phút`
    }

    if (isLoading) {
        return (
            <div className={`flex h-screen items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
                <RotateCw className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: 'var(--app-home-bg)' }}>
            <HeaderBar
                variant="page"
                title="Chi tiết sạc pin"
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
                            className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
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

            <main className="flex-1 overflow-y-auto min-h-0 w-full max-w-md mx-auto px-4 pt-4 pb-28">
                {/* Summary Info Row */}
                <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Dữ liệu phiên sạc
                    </p>
                    <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
                        {filterYear === 'all' ? 'Toàn bộ' : `${filterYear}`} · {filteredLogs.length} phiên
                    </p>
                </div>

                {/* Segmented Control & Filter Button */}
                <div className={`flex items-center justify-between gap-3 ${filterYear === 'all' ? 'mb-2' : 'mb-2'}`}>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 py-1">
                        <button
                            onClick={() => setFilterYear('all')}
                            className={`px-5 py-2.5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${filterYear === 'all'
                                ? 'bg-[#0F172A] text-white shadow-md'
                                : 'bg-white text-slate-400 border border-slate-200'
                                }`}
                        >
                            Tất cả
                        </button>
                        {availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => setFilterYear(year)}
                                className={`px-5 py-2.5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${filterYear === year
                                    ? (isDarkMode ? 'bg-slate-100 text-slate-900 shadow-md' : 'bg-[#0F172A] text-white shadow-md')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-slate-400 border border-slate-200')
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    {/* Filter Icon Button */}
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`h-10 w-10 flex items-center justify-center rounded-3xl transition-all shrink-0 border ${searchTerm ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm')
                            }`}
                        title="Tìm kiếm & Cấu hình lọc"
                    >
                        {searchTerm ? <Filter className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    </button>
                </div>

                {filterYear !== 'all' && availableMonths.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide pb-2">
                        <button
                            onClick={() => setFilterMonth('all')}
                            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filterMonth === 'all'
                                ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm')
                                : (isDarkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50')
                                }`}
                        >
                            Cả năm
                        </button>
                        {availableMonths.map(month => (
                            <button
                                key={month}
                                onClick={() => setFilterMonth(month)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filterMonth === month
                                    ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-sm' : 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50')
                                    }`}>
                                T{month}
                            </button>
                        ))}
                    </div>
                )}

                {/* 4 Cards Grid - Premium Dark Theme for stats */}
                <div className="relative overflow-hidden rounded-3xl bg-[#1E40AF] p-4 text-white shadow-md shadow-blue-900/60 mb-5 border border-white/10">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-[90px]" />
                    <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-300/10 blur-[90px]" />

                    <div className="relative z-10 grid grid-cols-2 gap-y-8 gap-x-6">
                        {/* Energy Card */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                                    <Zap className="h-4 w-4 fill-emerald-400/20" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Năng lượng</span>
                            </div>
                            <p className="text-[25px] font-black leading-none flex items-baseline gap-1.5">
                                {totalKwh.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                <span className="text-xs font-black text-white/40 uppercase tracking-wider">KWH</span>
                            </p>
                        </div>
                        {/* Plugged Card */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-8 w-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-300 border border-orange-500/10">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Cắm sạc</span>
                            </div>
                            <p className="text-[25px] font-black leading-none flex items-baseline gap-1.5">
                                {pluggedHours}h
                                <span className="text-[13px] font-black text-white/40 uppercase tracking-wider">{pluggedMins}M</span>
                            </p>
                        </div>
                        {/* Cost Card */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-8 w-8 rounded-xl bg-blue-400/20 flex items-center justify-center text-blue-300 border border-blue-400/10">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Chi phí</span>
                            </div>
                            <p className="text-[25px] font-black leading-none flex items-baseline gap-1.5">
                                {Math.round(totalCost) <= 0 ? (
                                    <span className="text-emerald-400">0</span>
                                ) : (
                                    <>
                                        {formatNumber(totalCost, 0)}
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">VND</span>
                                    </>
                                )}
                            </p>
                        </div>



                        {/* Savings Card */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-8 w-8 rounded-xl bg-red-500/20 flex items-center justify-center text-red-300 border border-red-500/10">
                                    <LuDollarSign className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60">Tiết kiệm</span>
                            </div>
                            <p className="text-[25px] font-black leading-none text-[#10B981] flex items-baseline gap-1.5">
                                {formatNumber(totalSaved, 0)}
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">VND</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* List Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Danh sách phiên sạc</h3>
                </div>

                {/* List Container with Timeline */}
                <div className="relative ml-2 pl-4 border-l border-slate-200 space-y-6 pb-10">
                    {filteredLogs.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-20 px-8 text-center rounded-3xl border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-slate-100/50'}`}>
                            <div className={`mb-4 rounded-3xl p-6 shadow-inner ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                <Search className={`h-10 w-10 ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`} />
                            </div>
                            <p className={`mt-2 text-xs font-medium leading-relaxed uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Không tìm thấy phiên sạc, không có dữ liệu phiên sạc</p>
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
                            const shortDateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`
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
                            const locationParts = [log.station_name, log.location].filter(Boolean)
                            const title = locationParts[0] || 'Trạm sạc'
                            const subtitle = locationParts[1] || 'VinFast Station Charging'
                            const percentage = Math.round(Math.min(100, Math.max(0, ((log.kwh || 0) / 37.23) * 100)))

                            const originalCost = (log.kwh || 0) * (log.unit_price || 3858)
                            const rawDisplayCost = log.total_cost ?? log.total_amount ?? 0
                            const displayCost = Math.round(Number(rawDisplayCost))
                            const isDiscounted = displayCost < Math.round(originalCost) || (log.notes?.includes('Khuyến mãi'))

                            return (
                                <div key={log.id} className="relative">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[17px] top-6 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-300">
                                        <span className="text-[9px] font-black text-slate-400 py-1 leading-none" style={{ backgroundColor: 'var(--app-home-bg)' }}>{shortDateStr}</span>
                                        <div className="h-3.5 w-3.5 rounded-full border-[3px] bg-green-600 shadow-sm" style={{ borderColor: 'var(--app-home-bg)' }} />
                                    </div>

                                    <div
                                        onClick={() => setEditingLog(log as FuelLogRecord)}
                                        className={`group relative overflow-hidden rounded-3xl p-4 shadow-md border transition-all duration-300 hover:shadow-xl hover:translate-x-1 cursor-pointer ${isDarkMode ? 'bg-[#1e293b] border-slate-700 shadow-none hover:bg-slate-800' : 'bg-white border-slate-300 shadow-slate-200'}`}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                        {/* Header Row */}
                                        <div className="flex justify-between items-start gap-4 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`text-[15px] font-black truncate uppercase tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    <p className="text-[11px] font-bold text-slate-400 truncate uppercase tracking-tighter">{subtitle}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-[11px] font-black border rounded-full px-2.5 py-1 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>{dateStr}</p>
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className={`grid grid-cols-3 gap-4 mb-5 border-y py-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Số điện</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{log.kwh?.toLocaleString('vi-VN', { maximumFractionDigits: 3 }) || 0}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">kWh</span>
                                                </div>
                                            </div>
                                            <div className={`flex flex-col border-x px-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Thời gian</p>
                                                <div className="flex items-baseline gap-1 mt-1">
                                                    <span className={`text-base font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatDuration(parsedDurationMins, true)}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Chi phí</p>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    {isDiscounted && originalCost > 0 && (
                                                        <span className="text-[11px] font-bold text-slate-400 line-through decoration-slate-400/50 leading-none">
                                                            {formatNumber(originalCost, 0)}
                                                        </span>
                                                    )}
                                                    <p className={`text-sm font-black leading-none ${displayCost <= 0 ? 'text-emerald-500' : (isDarkMode ? 'text-slate-100' : 'text-slate-900')}`}>
                                                        {displayCost <= 0 ? 'FREE' : formatNumber(displayCost, 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Row - Progress and Timeline */}
                                        <div className="flex items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tỉ lệ sạc</span>
                                                    <span className={`text-[10px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>{percentage}%</span>
                                                </div>
                                                <div className={`h-1.5 w-full rounded-full overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200/50'}`}>
                                                    <div
                                                        className="h-full bg-green-600 rounded-full transition-all duration-700 shadow-sm"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-2xl border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                                <span className="text-[10px] font-black">{startTime}</span>
                                                <ChevronRight className="h-2.5 w-2.5 opacity-50" />
                                                <span className="text-[10px] font-black">{endTime}</span>
                                            </div>
                                        </div>

                                        {/* Clean Notes */}
                                        {cleanNotesStr && (
                                            <div className="mt-5 pt-4 border-t border-slate-50">
                                                <p className="text-[11px] font-bold text-slate-500 italic leading-relaxed truncate group-hover:whitespace-normal group-hover:truncate-none transition-all">
                                                    "{cleanNotesStr}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
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
                    <div className={`w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300 border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`} onClick={e => e.stopPropagation()}>
                        <div className={`px-5 pt-3 pb-5 text-white shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-blue-600'}`}>
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
                                        <div className={`grid grid-cols-2 gap-y-4 gap-x-4 mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian</p>
                                                <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{startTimeModal} → {endTimeModal}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời lượng sạc</p>
                                                <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{durationModal}</p>
                                            </div>

                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vị trí địa chỉ</p>
                                                <p className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{editingLog.station_name}{editingLog.location ? ` - ${editingLog.location}` : ''}</p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Năng lượng</p>
                                                <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{editingLog.kwh ? `${editingLog.kwh.toFixed(2)} kWh` : '--'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tỉ lệ sạc</p>
                                                <p className={`text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>~{percentModal}% pin</p>
                                            </div>

                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chi phí phiên sạc</p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`text-sm font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        {Math.round(actualCostModal) <= 0 ? 'FREE' : formatCurrency(actualCostModal)}
                                                    </span>
                                                    {(actualCostModal < originalCostModal || parsedKhuyenMai) && (
                                                        <span className="text-xs font-semibold text-slate-400 line-through">
                                                            {formatCurrency(originalCostModal)}
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
                                                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{cleanNotesModal}</p>
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
                                        }} className={`space-y-4 border-t pt-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                                            <h4 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Chỉnh sửa ghi chú</h4>
                                            <div>
                                                <textarea name="notes" rows={4} defaultValue={editingLog.notes || ''} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-400 focus:bg-white'}`} placeholder="Dữ liệu import thường lưu trữ tại đây..."></textarea>
                                            </div>
                                            <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3.5 font-bold transition-all shadow-md">
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
                    <div className={`w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300 border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`} onClick={e => e.stopPropagation()}>
                        {/* Mobile Handle */}
                        <div className={`flex w-full justify-center pt-3 pb-1 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            <div className={`h-1.5 w-12 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                        </div>
                        <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <h3 className={`font-bold text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Tìm kiếm & Lọc</h3>
                            <button onClick={() => setIsFilterModalOpen(false)} className={`rounded-full p-2 transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-6 overflow-y-auto">
                            <div>
                                <label className={`mb-2 block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Từ khóa tìm kiếm</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Tên trạm, địa chỉ, ghi chú..."
                                        className={`w-full rounded-xl border pl-10 pr-3 py-3 text-base outline-none transition-all focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-blue-500/10' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-100'}`}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`mb-2 block text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Tìm kiếm thông minh</label>
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
                                                ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-sm' : 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm')
                                                : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
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
                                    className={`w-full mt-2 rounded-2xl font-bold py-3.5 active:scale-[0.98] transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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

