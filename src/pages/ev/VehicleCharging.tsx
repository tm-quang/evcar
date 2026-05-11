import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    Plus, Calendar, MapPin, Settings, Zap, Droplet,
    BatteryCharging, Activity, TrendingUp, Clock, ChevronDown, ChevronUp,
    Check, Gift, DollarSign, Image, Loader2,
    X, CreditCard, ScanLine, Fuel, Save, CheckSquare, Square,
    ChevronLeft, ChevronRight, Edit, Search
} from 'lucide-react'
import { createFuelLog, deleteFuelLog, updateFuelLog, type VehicleRecord, type FuelLogRecord } from '../../lib/ev/vehicleService'
import { DateRangePickerModal } from '../../components/ui/DateRangePickerModal'
import { useVehicles, useVehicleCharging, vehicleKeys } from '../../lib/ev/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ImageUpload } from '../../components/ev/ImageUpload'
import { ChargingPriceSettings } from '../../components/ev/ChargingPriceSettings'
import { getChargingPrice, getElectricDiscountSettings, type ChargingType } from '../../lib/ev/chargingPriceService'
import { uploadToCloudinary } from '../../lib/cloudinaryService'
import { SimpleLocationInput, type SimpleLocationData } from '../../components/ev/SimpleLocationInput'

import { analyzeChargeReceipt, type ChargeReceiptData } from '../../lib/ev/chargeReceiptAnalyzer'
import { useVehicleStore } from '../../store/useVehicleStore'
import { DateTimePickerModal } from '../../components/ui/DateTimePickerModal'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { useAppearance } from '../../contexts/AppearanceContext'

const FUEL_TYPES = {
    petrol_a95: { label: 'Xăng A95', color: 'gray', category: 'fuel' as const },
    petrol_e5: { label: 'Xăng E5', color: 'gray', category: 'fuel' as const },
    diesel: { label: 'Dầu Diesel', color: 'gray', category: 'fuel' as const },
    electric: { label: 'Điện', color: 'green', category: 'electric' as const },
}


// Quick amount presets (kWh) - reserved for future use
// const KWH_PRESETS = [10, 20, 30, 40, 50, 70]

type TabType = 'fuel' | 'electric'

// ── MAP: vehicle.fuel_type → tab + default fuel log type ──────────────────


const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0,
    }).format(Math.round(value))

const formatNumber = (value: number, decimals = 3) =>
    new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(value)

function getVehicleChargingConfig() {
    return { isElectric: true, defaultFuelLogType: 'electric' }
}

// =============================================
// ELECTRIC STATS CARD
// =============================================
function ElectricStatsCard({ logs }: { logs: FuelLogRecord[] }) {
    const navigate = useNavigate()
    const totalKwh = logs.reduce((sum, log) => sum + (log.kwh || log.liters || 0), 0)
    const totalCost = logs.reduce((sum, log) => sum + Math.round(Number(log.total_cost || log.total_amount || 0)), 0)
    const sessions = logs.length

    // Cost per session average
    const avgCostPerSession = sessions > 0 ? totalCost / sessions : 0

    // Monthly (current month) stats
    const thisMonth = new Date()
    const monthLogs = logs.filter(log => {
        const d = new Date(log.refuel_date)
        return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })
    const monthKwh = monthLogs.reduce((sum, log) => sum + (log.kwh || log.liters || 0), 0)
    const monthCost = monthLogs.reduce((sum, log) => sum + Math.round(Number(log.total_cost || log.total_amount || 0)), 0)



    const { isDarkMode } = useAppearance()

    const cardClass = isDarkMode 
        ? 'bg-[#1E293B] border-slate-700 shadow-none' 
        : 'bg-white border-slate-300 shadow-md'
    const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900'

    return (
        <div className="mb-4 space-y-3">
            {/* Main summary - solid green hero */}
            <div
                onClick={() => navigate('/ev/history')}
                className={`rounded-3xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-all hover:bg-green-600 ${isDarkMode ? 'shadow-none' : 'shadow-green-200'}`}
            >
                <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-xl bg-white/20 p-1.5">
                        <BatteryCharging className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold opacity-90 uppercase tracking-widest">Tổng quan sạc điện</span>
                    <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase">{sessions} lần sạc</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-3xl font-black tracking-tight">{formatNumber(totalKwh)}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">kWh đã sạc</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black tracking-tight">
                            {totalCost <= 0 ? 'FREE' : formatCurrency(totalCost)}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Tổng chi phí</p>
                    </div>
                </div>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-3">
                <div className={`flex flex-col items-center rounded-3xl p-4 border ${cardClass}`}>
                    <div className={`mb-2 rounded-2xl p-2 border ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <BatteryCharging className="h-5 w-5" />
                    </div>
                    <p className={`text-lg font-black leading-none ${textPrimary}`}>
                        {sessions}
                    </p>
                    <p className="text-center text-[9px] font-black uppercase tracking-tighter text-slate-400 mt-1">Lần sạc</p>
                </div>
                <div className={`flex flex-col items-center rounded-3xl p-4 border ${cardClass}`}>
                    <div className={`mb-2 rounded-2xl p-2 border ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        <Activity className="h-5 w-5" />
                    </div>
                    <p className={`text-lg font-black leading-none ${textPrimary}`}>
                        {avgCostPerSession > 0 ? formatCurrency(avgCostPerSession) : '--'}
                    </p>
                    <p className="text-center text-[9px] font-black uppercase tracking-tighter text-slate-400 mt-1">TB/phiên</p>
                </div>
                <div className={`flex flex-col items-center rounded-3xl p-4 border ${cardClass}`}>
                    <div className={`mb-2 rounded-2xl p-2 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <p className={`text-lg font-black leading-none ${textPrimary}`}>
                        {monthKwh > 0 ? formatNumber(monthKwh) : '--'}
                    </p>
                    <p className="text-center text-[9px] font-black uppercase tracking-tighter text-slate-400 mt-1">Tháng (kWh)</p>
                </div>
            </div>

            {/* Month summary badge */}
            {monthCost > 0 && (
                <div className={`flex items-center justify-between rounded-2xl px-5 py-3 text-white shadow-md ${isDarkMode ? 'bg-green-600 shadow-none' : 'bg-green-500 shadow-green-100'}`}>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-white" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">Chi phí tháng này</span>
                    </div>
                    <span className="text-sm font-black text-white">{formatCurrency(monthCost)} VND</span>
                </div>
            )}
        </div>
    )
}



// =============================================
// CHARGE LOG CARD (electric)
// =============================================
function ChargeLogCard({
    log,
    onEdit,
    onView
}: {
    log: FuelLogRecord
    onDelete: (id: string) => void
    onEdit: (log: FuelLogRecord) => void
    onView: (log: FuelLogRecord) => void
}) {
    const kwh = log.kwh || log.liters || 0
    const cost = log.total_cost || log.total_amount || 0

    const durationMins = (() => {
        let mins = log.charge_duration_minutes || 0
        let parsedEndTime = ''

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
                    if (totalMins > 0) mins = totalMins
                }
            }
        }

        // Prioritize calculation from START and END if both exist
        const startTime = log.refuel_time?.slice(0, 5)
        if (startTime && parsedEndTime) {
            const [sh, sm] = startTime.split(':').map(Number)
            const [eh, em] = parsedEndTime.split(':').map(Number)
            let calcMins = (eh * 60 + em) - (sh * 60 + sm)
            if (calcMins < 0) calcMins += 24 * 60
            if (calcMins > 0) mins = calcMins
        }

        return mins
    })()

    const formatDuration = (mins: number) => {
        if (!mins || mins <= 0) return '--'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) return `${h}h ${m}m`
        return `${m} phút`
    }



    const { isDarkMode } = useAppearance()
    const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900'

    return (
        <div className={`group overflow-hidden rounded-3xl transition-all border ${isDarkMode ? 'bg-[#1E293B] border-slate-700 shadow-none' : 'bg-white shadow-md hover:shadow-xl hover:border-blue-100 border-slate-200'}`}>
            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                <Zap className="h-3 w-3 text-emerald-600" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Phiên sạc điện</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {new Date(log.refuel_date).toLocaleDateString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                            {log.refuel_time && (
                                <span className={`flex items-center gap-1 ml-1 border-l pl-2 ${isDarkMode ? 'text-slate-300 border-slate-700' : 'text-slate-900 border-slate-200'}`}>
                                    <Clock className="h-3 w-3 text-blue-500" />
                                    {log.refuel_time.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onView(log)}
                            className={`h-8 w-8 flex items-center justify-center rounded-full transition-all ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button
                            onClick={() => onEdit(log)}
                            className="h-8 w-8 flex items-center justify-center rounded-full text-blue-500 transition-all hover:bg-blue-50"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Main metrics */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50 shadow-inner'}`}>
                        <p className={`text-lg font-black ${textPrimary}`}>{formatNumber(kwh)}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">kWh</p>
                    </div>
                    <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50 shadow-inner'}`}>
                        <p className={`text-lg font-black truncate ${textPrimary}`}>
                            {formatDuration(durationMins)}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sạc</p>
                    </div>
                    <div className={`rounded-2xl p-3 text-center ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50 shadow-inner'}`}>
                        <p className={`text-lg font-black ${textPrimary} ${Math.round(cost) <= 0 ? 'text-emerald-500' : ''}`}>
                            {Math.round(cost) <= 0 ? 'FREE' : formatCurrency(cost)}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">VND</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Tỉ lệ sạc</span>
                        <span className="text-emerald-600">{Math.round(Math.min(100, Math.max(0, (kwh / 37.23) * 100)))}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50 transition-all">
                        <div
                            className={`h-full rounded-full transition-all duration-700 shadow-sm ${isDarkMode ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (kwh / 37.23) * 100))}%` }}
                        ></div>
                    </div>
                </div>

                {/* Station name quick view */}
                {log.station_name && (
                    <div className={`mt-4 flex items-center justify-between gap-2 border-t pt-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                        <div className={`flex items-center gap-2 text-xs font-bold min-w-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            <div className={`h-6 w-6 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                <MapPin className="h-3 w-3 text-emerald-600" />
                            </div>
                            <span className="truncate uppercase tracking-tighter">{log.station_name}</span>
                        </div>
                        {log.notes && (() => {
                            const endMatch = log.notes.match(/Kết thúc:\s*(\d{2}:\d{2})/);
                            const startTime = log.refuel_time ? log.refuel_time.slice(0, 5) : null;
                            if (startTime && endMatch) {
                                return (
                                    <div className={`flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-slate-900 border-blue-100'}`}>
                                        <span>{startTime}</span>
                                        <ChevronRight className="h-2.5 w-2.5 text-blue-300" />
                                        <span>{endMatch[1]}</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                )}
            </div>
        </div>
    )
}



// =============================================
// MAIN PAGE
// =============================================
export default function VehicleCharging() {
    const { isDarkMode } = useAppearance()
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()

    const [activeTab] = useState<TabType>('electric')
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingLog, setEditingLog] = useState<FuelLogRecord | null>(null)
    const [viewingLog, setViewingLog] = useState<FuelLogRecord | null>(null)
    const [showBulkDiscount, setShowBulkDiscount] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const { selectedVehicleId } = useVehicleStore()

    // ── Time-period filter ──────────────────────────────────
    type FilterPeriod = 'day' | 'week' | 'month' | 'quarter' | 'all' | 'custom'
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month')
    const [periodOffset, setPeriodOffset] = useState(0) // 0 = current, -1 = prev, ...
    const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false)
    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false)
    const [customRange, setCustomRange] = useState({ start: '', end: '' })

    const { data: vehicles = [] } = useVehicles()
    const electricVehicles = vehicles.filter(v => v.fuel_type === 'electric')
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || electricVehicles[0] || vehicles[0]
    const { data: allLogs = [], isLoading: loading } = useVehicleCharging(selectedVehicle?.id)

    const logs = allLogs.filter(log => {
        const fuelType = FUEL_TYPES[log.fuel_type]
        return fuelType?.category === activeTab
    })

    const location = useLocation()
    useEffect(() => {
        if (location.state?.openAddModal) {
            setShowAddModal(true)
            // Clear location state after opening
            window.history.replaceState({}, document.title)
        }
    }, [location.state])



    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteFuelLog(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId || '') })
            success('Đã xóa nhật ký thành công!')
            setDeleteConfirmId(null)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể xóa nhật ký'
            showError(message)
        } finally {
            setDeleting(false)
        }
    }

    const vehicleFuelConfig = getVehicleChargingConfig()
    const isElectricVehicle = vehicleFuelConfig.isElectric

    // ── Period range helpers ─────────────────────────────────
    const now = new Date()
    function getPeriodRange(period: FilterPeriod, offset: number): { start: Date; end: Date; label: string } {
        const d = new Date(now)
        if (period === 'day') {
            d.setDate(d.getDate() + offset)
            const s = new Date(d); s.setHours(0, 0, 0, 0)
            const e = new Date(d); e.setHours(23, 59, 59, 999)
            const label = offset === 0 ? 'Hôm nay'
                : offset === -1 ? 'Hôm qua'
                    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
            return { start: s, end: e, label }
        }
        if (period === 'week') {
            const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0
            d.setDate(d.getDate() - dayOfWeek + offset * 7)
            const s = new Date(d); s.setHours(0, 0, 0, 0)
            const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
            const label = offset === 0 ? 'Tuần này'
                : offset === -1 ? 'Tuần trước'
                    : `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
            return { start: s, end: e, label }
        }
        if (period === 'month') {
            const s = new Date(now.getFullYear(), now.getMonth() + offset, 1)
            const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999)
            const label = offset === 0 ? 'Tháng này'
                : s.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
            return { start: s, end: e, label }
        }
        if (period === 'quarter') {
            const q = Math.floor(now.getMonth() / 3) + offset
            const actualYear = now.getFullYear() + Math.floor(q / 4)
            const actualQ = ((q % 4) + 4) % 4
            const s = new Date(actualYear, actualQ * 3, 1)
            const e = new Date(actualYear, actualQ * 3 + 3, 0, 23, 59, 59, 999)
            const qLabel = `Q${actualQ + 1}/${actualYear}`
            return { start: s, end: e, label: offset === 0 ? `Quý này (${qLabel})` : qLabel }
        }
        if (period === 'custom' && customRange.start && customRange.end) {
            const s = new Date(customRange.start); s.setHours(0, 0, 0, 0)
            const e = new Date(customRange.end); e.setHours(23, 59, 59, 999)
            const label = s.getTime() === e.getTime() ? s.toLocaleDateString('vi-VN') : `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
            return { start: s, end: e, label }
        }
        if (period === 'custom') return { start: new Date(), end: new Date(), label: 'Chọn khoảng thời gian' }
        // 'all'
        return { start: new Date(0), end: new Date(9999, 0), label: 'Tất cả' }
    }

    const handlePeriodDateSelect = (dateStr: string) => {
        const selectedDate = new Date(dateStr)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        selectedDate.setHours(0, 0, 0, 0)

        if (filterPeriod === 'day') {
            const diffTime = selectedDate.getTime() - today.getTime()
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
            setPeriodOffset(diffDays)
        } else if (filterPeriod === 'week') {
            // Monday of this week
            const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
            const thisMon = new Date(today); thisMon.setDate(today.getDate() - dayOfWeek)
            // Monday of selected week
            const selDayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1
            const selMon = new Date(selectedDate); selMon.setDate(selectedDate.getDate() - selDayOfWeek)

            const diffTime = selMon.getTime() - thisMon.getTime()
            const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7))
            setPeriodOffset(diffWeeks)
        } else if (filterPeriod === 'month') {
            const diffMonths = (selectedDate.getFullYear() - today.getFullYear()) * 12 + (selectedDate.getMonth() - today.getMonth())
            setPeriodOffset(diffMonths)
        } else if (filterPeriod === 'quarter') {
            const thisQ = Math.floor(today.getMonth() / 3)
            const selQ = Math.floor(selectedDate.getMonth() / 3)
            const diffQuarters = (selectedDate.getFullYear() - today.getFullYear()) * 4 + (selQ - thisQ)
            setPeriodOffset(diffQuarters)
        }
    }

    const periodRange = getPeriodRange(filterPeriod, periodOffset)

    // Filter logs by time range
    let filteredLogs = logs.filter(log => {
        if (filterPeriod === 'all') return true
        const d = new Date(log.refuel_date)
        return d >= periodRange.start && d <= periodRange.end
    })

    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()

        // Smart queries
        if (term.includes('chi phí cao nhất') || term.includes('tiền nhiều nhất') || term.includes('đắt nhất')) {
            const maxCost = Math.max(0, ...filteredLogs.map(l => l.total_cost || l.total_amount || 0))
            filteredLogs = filteredLogs.filter(l => (l.total_cost || l.total_amount || 0) === maxCost && maxCost > 0)
        } else if (term.includes('nhiều năng lượng') || term.includes('nhiều điện') || term.includes('kwh cao nhất')) {
            const maxKwh = Math.max(0, ...filteredLogs.map(l => l.kwh || 0))
            filteredLogs = filteredLogs.filter(l => (l.kwh || 0) === maxKwh && maxKwh > 0)
        } else if (term.includes('nhiều nhiên liệu') || term.includes('nhiều xăng') || term.includes('nhiều lít')) {
            const maxLiters = Math.max(0, ...filteredLogs.map(l => l.liters || 0))
            filteredLogs = filteredLogs.filter(l => (l.liters || 0) === maxLiters && maxLiters > 0)
        } else if (term.includes('thời gian sạc lâu nhất') || term.includes('thời gian sạc nhiều') || term.includes('sạc lâu')) {
            const getDuration = (l: FuelLogRecord) => {
                let mins = l.charge_duration_minutes || 0
                if (l.notes) {
                    const match = l.notes.match(/Thời gian sạc:\s*(\d+)/)
                    if (match) mins = parseInt(match[1], 10)
                }
                return mins
            }
            const maxDur = Math.max(0, ...filteredLogs.map(getDuration))
            filteredLogs = filteredLogs.filter(l => getDuration(l) === maxDur && maxDur > 0)
        } else {
            // Normal text search
            filteredLogs = filteredLogs.filter(log => {
                const searchFields = [
                    log.station_name,
                    log.location,
                    log.notes,
                    log.total_cost?.toString(),
                    log.total_amount?.toString(),
                    log.kwh?.toString(),
                    log.liters?.toString(),
                ].filter(Boolean).map(s => String(s).toLowerCase())
                return searchFields.some(field => field.includes(term))
            })
        }
    }
    // Sort newest first before grouping
    filteredLogs = [...filteredLogs].sort((a, b) => {
        const dateA = new Date(a.refuel_date).getTime()
        const dateB = new Date(b.refuel_date).getTime()
        if (dateB !== dateA) return dateB - dateA
        if (a.refuel_time && b.refuel_time) return b.refuel_time.localeCompare(a.refuel_time)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // Group logs by date (newest first)
    const groupedLogs = filteredLogs.reduce<Record<string, typeof filteredLogs>>((acc, log) => {
        const key = log.refuel_date
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {})
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

    // Period stats
    const periodTotalCost = filteredLogs.reduce((s, l) => s + Math.round(Number(l.total_cost || l.total_amount || 0)), 0)
    const periodTotalKwh = filteredLogs.reduce((s, l) => s + (l.kwh || l.liters || 0), 0)

    const PERIOD_TABS: { id: FilterPeriod; label: string }[] = [
        { id: 'day', label: 'Ngày' },
        { id: 'week', label: 'Tuần' },
        { id: 'month', label: 'Tháng' },
        { id: 'quarter', label: 'Quý' },
        { id: 'all', label: 'Tất cả' },
    ]

    return (
        <div className={`flex h-[100dvh] flex-col overflow-hidden ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }}>
            <HeaderBar
                variant="page"
                title={isSearchOpen ? '' : 'Lịch sử sạc pin'}
                showIcon={
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white shadow-lg border border-slate-100'}`}
                        aria-label="Tìm kiếm"
                    >
                        <Search className={`h-4 w-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                    </button>
                }
                customContent={
                    <div className="flex items-center gap-2 flex-1">
                        {isSearchOpen && (
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                    className={`w-full rounded-xl border-2 py-1.5 pl-9 pr-3 text-sm transition focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20' : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:ring-blue-200'}`}
                                />
                            </div>
                        )}
                        <button
                            onClick={() => setShowSettings(true)}
                            className={`flex items-center justify-center rounded-full p-2 shadow-md backdrop-blur-sm transition-all shrink-0 ${isDarkMode ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300' : 'bg-white/80 hover:bg-white text-slate-600'}`}
                            title="Cài đặt giá"
                        >
                            <Settings className="h-5 w-5" />
                        </button>
                    </div>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-md mx-auto px-4 pb-28 pt-4">
                {/* Electric header when electric vehicle */}
                {isElectricVehicle && (
                    <div className={`mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-white transition-all ${isDarkMode ? 'bg-green-600 shadow-lg shadow-black/20' : 'bg-green-500 shadow-md shadow-green-100'}`}>
                        <div className="rounded-xl bg-white/20 p-2">
                            <BatteryCharging className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{selectedVehicle?.license_plate}</p>
                            <p className="text-xs opacity-75">{selectedVehicle?.brand} {selectedVehicle?.model} · Xe điện</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{selectedVehicle?.current_odometer?.toLocaleString() || '0'} km</p>
                            <p className="text-xs opacity-75">Odometer</p>
                        </div>
                    </div>
                )}

                {selectedVehicle && !loading && (
                    <ElectricStatsCard logs={logs} />
                )}

                {/* Add Button & Bulk Discount */}
                <div className="flex gap-2 w-full mb-4">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className={`flex-1 flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 font-bold text-white transition-all hover:scale-[1.02] active:scale-95 ${
                            activeTab === 'electric'
                                ? `bg-green-600 ${isDarkMode ? 'shadow-black/20' : 'shadow-lg shadow-green-200'}`
                                : `bg-slate-600 ${isDarkMode ? 'shadow-black/20' : 'shadow-lg shadow-slate-200'}`
                        }`}
                    >
                        <Plus className="h-5 w-5" />
                        Thêm lần sạc mới
                    </button>

                    {activeTab === 'electric' && logs.length > 0 && (
                        <button
                            onClick={() => setShowBulkDiscount(true)}
                            className={`flex items-center justify-center rounded-2xl px-4 py-3.5 font-bold text-white transition-all hover:scale-[1.02] active:scale-95 bg-rose-500 ${isDarkMode ? 'shadow-none' : 'shadow-md shadow-rose-200'}`}
                            title="Áp khuyến mãi hàng loạt"
                        >
                            <Gift className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* ── FILTER BAR ── */}
                <div className="mb-3 space-y-2">
                    {/* Period type tabs */}
                    <div className={`flex rounded-xl p-1 gap-0.5 shadow-inner transition-all ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        {PERIOD_TABS.map(tab => (
                            <button key={tab.id} type="button"
                                onClick={() => {
                                    setFilterPeriod(tab.id)
                                    setPeriodOffset(0)
                                    if (tab.id === 'custom') setIsRangePickerOpen(true)
                                }}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${filterPeriod === tab.id
                                    ? (isDarkMode ? 'bg-slate-700 text-white shadow-md' : 'bg-green-600 text-white shadow-md')
                                    : `${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`
                                    }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Period navigator (hidden for 'all') */}
                    {filterPeriod !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button type="button"
                                onClick={() => setPeriodOffset(o => o - 1)}
                                className={`rounded-xl border p-1.5 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div
                                onClick={() => setIsRangePickerOpen(true)}
                                className={`flex-1 rounded-xl border px-3 py-2 text-center cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
                            >
                                <p className={`text-md font-bold ${activeTab === 'electric' ? 'text-green-500' : 'text-slate-500'}`}
                                >  {periodRange.label}</p>
                            </div>
                            <button type="button"
                                onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                                disabled={periodOffset >= 0}
                                className={`rounded-xl border p-1.5 transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Period summary */}
                    {filteredLogs.length > 0 && (
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                            activeTab === 'electric' 
                                ? (isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100') 
                                : (isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-100')
                            }`}>
                            <span className="text-xs text-slate-500">
                                <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{filteredLogs.length}</span> lần ·
                                <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{periodTotalKwh.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                                kWh
                            </span>
                            <span className="text-sm font-black text-green-500">{formatCurrency(periodTotalCost)} đ</span>
                        </div>
                    )}
                </div>

                {/* Log List */}
                {
                    loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`animate-pulse overflow-hidden rounded-2xl p-4 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white shadow-md border-slate-100'}`}>
                                    <div className={`mb-3 h-4 w-2/3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                                    <div className={`h-16 w-full rounded-xl ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`} />
                                </div>
                            ))}
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 text-center rounded-3xl border py-14 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className={`mb-4 rounded-3xl p-6 shadow-md ${isDarkMode ? 'bg-green-500/10' : 'bg-green-100'}`}>
                                <BatteryCharging className={`h-12 w-12 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                            </div>
                            <p className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {filterPeriod === 'all'
                                    ? 'Chưa có nhật ký sạc điện'
                                    : `Không có dữ liệu trong ${periodRange.label}`
                                }
                            </p>
                            <p className="mt-1 text-sm text-slate-400 px-6">
                                {filterPeriod !== 'all' ? 'Thử chọn thời gian khác' : 'Bắt đầu ghi chép việc sạc xe để theo dõi chi phí'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedDates.map(dateKey => {
                                const dayLogs = groupedLogs[dateKey]
                                const d = new Date(dateKey)
                                const isToday = dateKey === new Date().toISOString().split('T')[0]
                                const isYesterday = dateKey === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                                const dayLabel = isToday ? 'Hôm nay'
                                    : isYesterday ? 'Hôm qua'
                                        : d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })
                                const dayTotal = dayLogs.reduce((s, l) => s + Math.round(Number(l.total_cost || l.total_amount || 0)), 0)
                                return (
                                    <div key={dateKey}>
                                        {/* Date separator */}
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${activeTab === 'electric' ? 'bg-green-400' : 'bg-slate-400'
                                                    }`} />
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dayLabel}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400">
                                                {formatCurrency(dayTotal)} đ
                                            </span>
                                        </div>
                                        <div className={`space-y-2 pl-4 border-l-2 transition-all ${isDarkMode ? 'border-green-500/20' : 'border-green-100'}`}>
                                            {dayLogs.map(log =>
                                                <ChargeLogCard key={log.id} log={log} onDelete={(id) => setDeleteConfirmId(id)} onEdit={setEditingLog} onView={setViewingLog} />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                }

                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main >


            {/* Add/Edit Modal */}
            {
                (showAddModal || editingLog) && selectedVehicle && (
                    <AddChargeModal
                        vehicle={selectedVehicle}
                        category={activeTab}
                        editingLog={editingLog}
                        onClose={() => { setShowAddModal(false); setEditingLog(null) }}
                        onSuccess={() => {
                            setShowAddModal(false)
                            setEditingLog(null)
                            queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId || '') })
                        }}
                    />
                )
            }

            {/* Bulk Discount Modal */}
            {
                showBulkDiscount && activeTab === 'electric' && (
                    <BulkDiscountModal
                        logs={filteredLogs}
                        onClose={() => setShowBulkDiscount(false)}
                        onSuccess={() => {
                            setShowBulkDiscount(false)
                            queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId || '') })
                        }}
                    />
                )
            }

            {/* Price Settings */}
            <ChargingPriceSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={() => { }}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xác nhận xóa"
                message="Bạn có chắc chắn muốn xóa nhật ký này?"
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />

            {/* Period Picker Modal */}
            <DateTimePickerModal
                isOpen={isPeriodPickerOpen}
                onClose={() => setIsPeriodPickerOpen(false)}
                onConfirm={handlePeriodDateSelect}
                initialDate={new Date().toISOString().split('T')[0]}
                showTime={false}
            />

            {/* Range Picker Modal */}
            <DateRangePickerModal
                isOpen={isRangePickerOpen}
                onClose={() => setIsRangePickerOpen(false)}
                onConfirm={(s, e) => {
                    setCustomRange({ start: s, end: e })
                    setFilterPeriod('custom')
                }}
            />

            {/* View Details Modal */}
            {viewingLog && (
                <ChargeDetailModal
                    log={viewingLog}
                    onClose={() => setViewingLog(null)}
                    onSuccess={() => {
                        setViewingLog(null)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.fuel(selectedVehicleId || '') })
                    }}
                />
            )}
        </div >
    )
}

// =============================================
// ADD CHARGE MODAL
// =============================================
function AddChargeModal({
    vehicle,
    category,
    onClose,
    onSuccess,
    editingLog
}: {
    vehicle: VehicleRecord
    category: TabType
    onClose: () => void
    onSuccess: () => void
    editingLog?: FuelLogRecord | null
}) {
    const { success, error: showError } = useNotification()
    const isElectric = category === 'electric'
    const [loading, setLoading] = useState(false)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [stationLocationData, setStationLocationData] = useState<SimpleLocationData | null>(null)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('vnd')

    // AI Scan states
    const [scanning, setScanning] = useState(false)
    const [scanResult, setScanResult] = useState<ChargeReceiptData | null>(null)
    const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
    const scanInputRef = useRef<HTMLInputElement>(null)
    const [showDatePicker, setShowDatePicker] = useState(false)

    const vehicleFuelConfig = getVehicleChargingConfig()
    const defaultFuelType = category === 'electric'
        ? 'electric'
        : vehicleFuelConfig.defaultFuelLogType
    const now = new Date()

    let defaultStartTime = now.toTimeString().slice(0, 5)
    let defaultEndTime = ''
    let defaultDiscount = ''
    let defaultNotes = ''

    if (editingLog) {
        let parsedEndTime = ''
        let parsedDiscountStr = ''
        let cleanNotes = editingLog.notes || ''

        if (cleanNotes) {
            const lines = cleanNotes.split('\n')
            for (const line of lines) {
                if (line.includes('Kết thúc:')) {
                    const match = line.match(/Kết thúc:\s*([0-9:]+)/)
                    if (match) parsedEndTime = match[1].trim()
                }
                if (line.includes('Khuyến mãi:')) {
                    const match = line.match(/Khuyến mãi:\s*-([\d.]+)đ/)
                    if (match) parsedDiscountStr = match[1].replace(/\./g, '')
                }
            }
            const cleanLines = lines.filter(l => !l.includes('Kết thúc:') && !l.includes('Thời gian sạc:') && !l.includes('Khuyến mãi:') && !l.includes('GPS:') && !l.includes('https://www.google.com/maps'))
            cleanNotes = cleanLines.join('\n').trim()
        }

        defaultStartTime = editingLog.refuel_time?.slice(0, 5) || ''
        defaultEndTime = parsedEndTime
        defaultDiscount = parsedDiscountStr
        defaultNotes = cleanNotes
    }

    const [formData, setFormData] = useState({
        vehicle_id: vehicle.id,
        refuel_date: editingLog ? new Date(editingLog.refuel_date).toISOString().split('T')[0] : now.toISOString().split('T')[0],
        start_time: defaultStartTime,
        end_time: defaultEndTime,
        odometer_at_refuel: editingLog ? editingLog.odometer_at_refuel : (vehicle.current_odometer || 0),
        fuel_type: editingLog ? editingLog.fuel_type : defaultFuelType,
        fuel_category: editingLog ? editingLog.fuel_category : category,
        quantity: editingLog ? (editingLog.kwh || editingLog.liters || '').toString() : '',
        unit_price: editingLog ? (editingLog.unit_price || '').toString() : '',
        discount: defaultDiscount,
        station_name: editingLog ? (editingLog.station_name || '') : '',
        receipt_image_url: editingLog ? (editingLog.receipt_image_url || null) : null,
        notes: defaultNotes,
    })

    // Load default price & discount on mount
    const hasLoadedPrice = useRef(false)
    useEffect(() => {
        const loadInitialData = async () => {
            // Only load defaults if creating new log
            if (editingLog) {
                hasLoadedPrice.current = true
                return
            }
            try {
                const price = await getChargingPrice(formData.fuel_type as ChargingType)
                const d = await getElectricDiscountSettings()

                setFormData(prev => ({
                    ...prev,
                    unit_price: price != null ? price.toString() : '',
                    discount: isElectric && d.value ? d.value : ''
                }))
                if (isElectric && d.value) {
                    setDiscountMode(d.mode)
                }
                hasLoadedPrice.current = true
            } catch (e) { console.error('Price load error', e) }
        }
        if (!hasLoadedPrice.current) loadInitialData()
    }, [formData.fuel_type, isElectric])

    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unit_price) || 0
    const chargeAmount = Math.round(quantity * unitPrice)                        // Phí sạc thực tế (làm tròn VND)

    // Discount: interpret formData.discount as % or VND depending on mode
    const discountRaw = parseFloat(formData.discount) || 0
    const discount = discountMode === 'pct'
        ? Math.round(chargeAmount * discountRaw / 100)
        : discountRaw
    const discountPct = chargeAmount > 0
        ? (discountMode === 'pct' ? discountRaw : (discount / chargeAmount) * 100)
        : 0
    const totalPayment = Math.max(0, Math.round(chargeAmount - discount))      // Tổng thanh toán (làm tròn VND)

    // Duration = end_time - start_time
    const duration = useMemo(() => {
        if (!formData.start_time || !formData.end_time) return null
        const [sh, sm] = formData.start_time.split(':').map(Number)
        const [eh, em] = formData.end_time.split(':').map(Number)
        let mins = (eh * 60 + em) - (sh * 60 + sm)
        if (mins < 0) mins += 24 * 60  // overnight
        if (mins <= 0) return null
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) return `${h} giờ ${m} phút`
        return `${m} phút`
    }, [formData.start_time, formData.end_time])



    // Friendly number display helper
    const fmtInput = (raw: string) => {
        if (!raw || raw === '') return ''
        const n = parseFloat(raw)
        return isNaN(n) ? raw : n.toLocaleString('vi-VN')
    }

    // ── AI SCAN HANDLER ─────────────────────────────────────────────────
    const handleScanImage = useCallback(async (file: File) => {
        setScanning(true)
        setScanResult(null)
        setScanPreviewUrl(URL.createObjectURL(file))
        setSelectedImageFile(file)
        try {
            const data = await analyzeChargeReceipt(file)
            setScanResult(data)
            setFormData(prev => {
                const u = { ...prev }
                if (data.date) u.refuel_date = data.date
                if (data.time) u.start_time = data.time
                if (data.endTime) u.end_time = data.endTime
                if (data.kwh && data.kwh > 0) u.quantity = data.kwh.toString()
                // Unit price: prefer explicit, else back-calculate from chargeAmount
                if (data.unitPrice && data.unitPrice > 0) {
                    u.unit_price = data.unitPrice.toString()
                } else if (data.chargeAmount && data.kwh && data.kwh > 0) {
                    u.unit_price = (data.chargeAmount / data.kwh).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 3 })
                }
                // Discount = chargeAmount - totalPayment
                if (data.chargeAmount != null && data.totalPayment != null) {
                    const disc = data.chargeAmount - data.totalPayment
                    if (disc > 0) u.discount = disc.toString()
                }
                if (data.stationName) u.station_name = data.stationName
                return u
            })
            success('Đã đọc hóa đơn thành công!')
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể đọc ảnh')
            setScanPreviewUrl(null)
        } finally {
            setScanning(false)
        }
    }, [success, showError])

    // ── SUBMIT ───────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.quantity || !formData.unit_price) {
            showError('Vui lòng nhập số điện đã sạc và đơn giá')
            return
        }
        setLoading(true)
        try {
            let finalImageUrl = formData.receipt_image_url
            if (selectedImageFile) {
                const r = await uploadToCloudinary(selectedImageFile, { folder: 'fuel_receipts' })
                finalImageUrl = r.secure_url
            }

            // Build notes: include end_time, duration, discount if present
            const extras: string[] = []
            if (isElectric && formData.end_time) {
                extras.push(`Kết thúc: ${formData.end_time}`)
                if (duration) extras.push(`Thời gian sạc: ${duration}`)
            }
            if (isElectric && discount > 0)
                extras.push(`Khuyến mãi: -${discount.toLocaleString('vi-VN')} đ`)
            if (stationLocationData) {
                extras.push(`GPS: ${stationLocationData.lat.toFixed(6)}, ${stationLocationData.lng.toFixed(6)}`)
                extras.push(`https://www.google.com/maps?q=${stationLocationData.lat},${stationLocationData.lng}`)
            }
            const finalNotes = [formData.notes, ...extras].filter(Boolean).join('\n')

            const rawChargeAmount = chargeAmount   // phí sạc gốc trước khuyến mãi
            const rawTotalPayment = totalPayment   // số thực trả sau khuyến mãi

            const payload = {
                vehicle_id: formData.vehicle_id,
                refuel_date: formData.refuel_date,
                refuel_time: formData.start_time || null,
                odometer_at_refuel: formData.odometer_at_refuel,
                fuel_type: formData.fuel_type,
                fuel_category: formData.fuel_category,
                station_name: formData.station_name || null,
                notes: finalNotes || null,
                receipt_image_url: finalImageUrl || null,
                ...(isElectric ? { kwh: quantity, liters: null } : { liters: quantity, kwh: null }),
                price_per_liter: unitPrice || null,
                unit_price: unitPrice || null,
                // total_amount = phí gốc (để backward compat, không bao giờ = 0 nếu có sạc)
                total_amount: rawChargeAmount,
                // total_cost = số thực trả (có thể = 0 nếu KM 100%)
                total_cost: rawTotalPayment,
            }

            console.log('[FuelLog] payload:', payload)
            try {
                if (editingLog) {
                    await updateFuelLog(editingLog.id, payload as any)
                    success('Cập nhật thành công!')
                } else {
                    await createFuelLog(payload as any)
                    success(isElectric ? 'Thêm lịch sử sạc thành công!' : 'Thêm nhật ký thành công!')
                    // ── Auto-save station to localStorage ──
                    if (formData.station_name && formData.station_name.trim()) {
                        try {
                            const trimmedName = formData.station_name.trim();
                            const savedStr = localStorage.getItem('bofin_saved_stations')
                            const savedStations: any[] = savedStr ? JSON.parse(savedStr) : []
                            const exists = savedStations.some((s: any) => s.address === trimmedName || s.name === trimmedName)
                            if (!exists) {
                                const newStation = {
                                    id: Date.now().toString(),
                                    name: trimmedName,
                                    address: trimmedName,
                                    lat: stationLocationData?.lat,
                                    lng: stationLocationData?.lng
                                }
                                localStorage.setItem('bofin_saved_stations', JSON.stringify([...savedStations, newStation]))
                            }
                        } catch (e) {
                            console.error('Error auto-saving station:', e)
                        }
                    }
                    // ─────────────────────────────────────────
                }
            } catch (insertErr: any) {
                console.error('[FuelLog] Supabase error:', insertErr?.message, insertErr?.details, insertErr?.hint, insertErr)
                throw insertErr
            }
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu nhật ký')
        } finally {
            setLoading(false)
        }
    }

    const availableFuelTypes = Object.entries(FUEL_TYPES).filter(([, c]) => c?.category === category) as [ChargingType, any][]

    // ── RENDER ───────────────────────────────────────────────────────────
    const { isDarkMode } = useAppearance()

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className={`w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300 ${isDarkMode ? 'bg-[#1E293B]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>

                <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className={`sticky top-0 z-10 px-5 pt-3 pb-4 text-white ${isElectric ? 'bg-green-500' : 'bg-slate-600'}`}>
                        {/* Mobile Handle */}
                        <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                            <div className="h-1.5 w-12 rounded-full bg-white/40" />
                        </div>
                        <div className="flex items-center justify-between mb-1 mt-1">
                            <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-white/20 p-1.5">
                                    {isElectric ? <BatteryCharging className="h-5 w-5" /> : <Droplet className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h3 className="font-bold">
                                        {editingLog
                                            ? (isElectric ? 'Sửa lịch sử sạc' : 'Sửa nhật ký đổ xăng')
                                            : (isElectric ? 'Thêm lịch sử sạc' : 'Thêm nhật ký đổ xăng')}
                                    </h3>
                                    <p className="text-xs opacity-75">{vehicle.license_plate} · {vehicle.brand} {vehicle.model}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

                        {/* ── AI SCAN BANNER (electric only) ── */}
                        {isElectric && (
                            <div className={`rounded-2xl border-2 border-dashed overflow-hidden ${isDarkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                                {scanning ? (
                                    <div className="flex flex-col items-center gap-2 py-5">
                                        <div className="relative h-10 w-10">
                                            <div className="absolute inset-0 rounded-full border-4 border-green-200/20" />
                                            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-green-500" />
                                        </div>
                                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Đang phân tích ảnh...</p>
                                    </div>
                                ) : scanResult ? (
                                    <div className="p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="rounded-full bg-green-500 p-1"><Check className="h-3 w-3 text-white" /></div>
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Đã trích xuất dữ liệu từ ảnh</span>
                                            <button type="button" onClick={() => scanInputRef.current?.click()} className={`ml-auto text-xs underline ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Scan lại</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {scanResult.kwh != null && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold shadow-md border ${isDarkMode ? 'bg-slate-800 border-green-500/30 text-green-400' : 'bg-white border-green-200 text-green-700'}`}><Zap className="h-3 w-3" /> {scanResult.kwh} kWh</span>}
                                            {(scanResult.chargeAmount ?? scanResult.totalPayment) != null && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold shadow-md border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-700'}`}><CreditCard className="h-3 w-3" /> {((scanResult.chargeAmount ?? scanResult.totalPayment) ?? 0).toLocaleString('vi-VN')} đ</span>}
                                            {scanResult.date && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs shadow-md border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}><Calendar className="h-3 w-3" /> {new Date(scanResult.date).toLocaleDateString('vi-VN')}</span>}
                                            {scanResult.stationName && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs shadow-md border max-w-[180px] truncate ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}><MapPin className="h-3 w-3 shrink-0" /> {scanResult.stationName}</span>}
                                        </div>
                                        {scanResult.summary && <p className={`mt-1.5 text-[10px] ${isDarkMode ? 'text-green-500/70' : 'text-green-600'}`}>{scanResult.summary}</p>}
                                        {scanPreviewUrl && <img src={scanPreviewUrl} alt="Hóa đơn" className={`mt-2 h-16 w-auto rounded-lg object-cover border ${isDarkMode ? 'border-green-500/30' : 'border-green-200'}`} />}
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => scanInputRef.current?.click()} className={`flex w-full items-center gap-3 px-4 py-3.5 transition-colors ${isDarkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-100'}`}>
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${isDarkMode ? 'bg-green-600' : 'bg-green-500 shadow-green-200'}`}>
                                            <ScanLine className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>Scan ảnh hóa đơn sạc</p>
                                            <p className={`text-xs ${isDarkMode ? 'text-green-500/70' : 'text-green-500'}`}>Tự động điền ngày, kWh, chi phí, địa chỉ</p>
                                        </div>
                                        <Zap className="ml-auto h-4 w-4 text-green-400" />
                                    </button>
                                )}
                                <input ref={scanInputRef} type="file" accept="image/*" className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanImage(f); e.target.value = '' }}
                                />
                            </div>
                        )}

                        {/* ── 1. NGÀY SẠC ── */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <Calendar className="h-3 w-3" /> {isElectric ? 'Ngày sạc' : ''}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(true)}
                                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all hover:border-slate-300 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-green-500/20' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-green-400 focus:ring-green-100'}`}
                            >
                                <span>{formData.refuel_date ? (() => { const [y, m, d] = formData.refuel_date.split('-'); return `${d}/${m}/${y}` })() : ''}</span>
                                <Calendar className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>

                        {/* ── 2. ĐỊA CHỈ TRẠM SẠC ── */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <MapPin className="h-3 w-3 text-red-500" /> {isElectric ? 'Địa chỉ trạm sạc' : 'Trạm xăng'}
                            </label>
                            <SimpleLocationInput label="" value={formData.station_name} locationData={stationLocationData}
                                onChange={(addr, loc) => { setFormData({ ...formData, station_name: addr }); setStationLocationData(loc || null) }}
                                placeholder={isElectric ? 'Hoặc nhập địa chỉ / lấy vị trí GPS' : 'Petrolimex, Shell...'}
                            />
                        </div>

                        {/* ── 3. THỜI GIAN SẠC ── */}
                        <div className={`rounded-2xl border p-3 space-y-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <Clock className="h-3 w-3" /> Thời gian {isElectric ? 'sạc' : ''}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Bắt đầu</label>
                                    <input type="time" value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-green-500/20' : 'bg-white border-slate-200 focus:border-green-400 focus:ring-green-100'}`}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">Kết thúc</label>
                                    <input type="time" value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-green-500/20' : 'bg-white border-slate-200 focus:border-green-400 focus:ring-green-100'}`}
                                    />
                                </div>
                            </div>
                            {duration && (
                                <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isDarkMode ? 'bg-green-500/10' : 'bg-green-100'}`}>
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}><Clock className="h-3 w-3" /> Tổng thời gian sạc</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{duration}</span>
                                </div>
                            )}
                        </div>

                        {/* ── 4. SỐ ĐIỆN + ĐƠN GIÁ ── */}
                        <div className={`rounded-2xl border p-3 space-y-3 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <Zap className="h-3 w-3 text-green-500" /> {isElectric ? 'Điện năng & chi phí' : 'Nhiên liệu & chi phí'}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {/* kWh / Liters */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        {isElectric ? 'Số điện đã sạc' : 'Số lít'}
                                    </label>
                                    <div className="relative">
                                        <input type="text" required
                                            value={(() => {
                                                if (formData.quantity === '') return ''
                                                if (formData.quantity === '.') return ','
                                                if (formData.quantity.endsWith('.')) {
                                                    const p = formData.quantity.split('.')
                                                    return (p[0] !== '' ? parseInt(p[0]).toLocaleString('vi-VN') : '0') + ','
                                                }
                                                const v = parseFloat(formData.quantity)
                                                if (isNaN(v)) return formData.quantity
                                                const p = formData.quantity.split('.')
                                                p[0] = parseInt(p[0]).toLocaleString('vi-VN')
                                                return p.join(',')
                                            })()}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/,/g, '.')
                                                if (!/^[\d.]*$/.test(v)) return
                                                if ((v.match(/\./g) || []).length > 1) return
                                                setFormData({ ...formData, quantity: v })
                                            }}
                                            placeholder=""
                                            className={`w-full rounded-xl border px-3 py-1.5 pr-12 text-right text-lg font-black focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-green-500 focus:ring-green-500/20' : 'bg-white border-slate-200 text-slate-800 focus:border-green-400 focus:ring-green-100'}`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">{isElectric ? 'kWh' : 'lít'}</span>
                                    </div>
                                </div>
                                {/* Unit price */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                        Đơn giá{isElectric ? ' /kWh' : ' /lít'}
                                    </label>
                                    <div className="relative">
                                        <input type="text" required
                                            value={fmtInput(formData.unit_price)}
                                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value.replace(/[^\d]/g, '') })}
                                            placeholder=""
                                            className={`w-full rounded-xl border px-3 py-1.5 pr-8 text-right text-lg font-black focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20' : 'bg-white border-slate-200 text-slate-800 focus:border-amber-400 focus:ring-amber-100'}`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">đ</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Phí sạc thực tế (auto-calculated) */}
                            {chargeAmount > 0 && (
                                <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Zap className="h-3 w-3 text-green-500" /> Phí sạc thực tế</span>
                                    <span className={`text-md font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatCurrency(chargeAmount)} đ</span>
                                </div>
                            )}
                        </div>

                        {/* ── 6. KHUYẾN MÃI (electric only, optional) ── */}
                        {isElectric && (
                            <div className={`rounded-2xl border p-3 space-y-3 ${isDarkMode ? 'bg-rose-500/10 border-rose-500/20' : 'bg-red-50 border-pink-100'}`}>
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        <Gift className="h-3.5 w-3.5 text-red-500" /> Khuyến mãi
                                        <span className="normal-case font-normal text-slate-400">(tùy chọn)</span>
                                    </p>
                                    {/* % / VND toggle */}
                                    <div className={`flex rounded-lg overflow-hidden border ${isDarkMode ? 'border-rose-500/30' : 'border-pink-200'}`}>
                                        <button type="button"
                                            onClick={() => { setDiscountMode('pct'); setFormData(prev => ({ ...prev, discount: '' })) }}
                                            className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'pct' ? 'bg-red-500 text-white' : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-red-50'}`
                                                }`}>%</button>
                                        <button type="button"
                                            onClick={() => { setDiscountMode('vnd'); setFormData(prev => ({ ...prev, discount: '' })) }}
                                            className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'vnd' ? 'bg-red-500 text-white' : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-red-50'}`
                                                }`}>đ</button>
                                    </div>
                                </div>

                                {/* Quick % presets */}
                                {discountMode === 'pct' && (
                                    <div className="flex gap-1.5">
                                        {[25, 50, 100].map(pct => (
                                            <button key={pct} type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, discount: pct.toString() }))}
                                                className={`flex-1 rounded-xl border py-2 text-sm font-bold transition-all ${formData.discount === pct.toString()
                                                    ? 'border-red-500 bg-red-500 text-white shadow-md'
                                                    : `${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600' : 'border-red-200 bg-white text-red-600 hover:border-red-400'}`
                                                    }`}>
                                                -{pct}%
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Input */}
                                <div className="relative">
                                    <input type="text"
                                        value={discountMode === 'vnd' ? fmtInput(formData.discount) : formData.discount}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^\d]/g, '')
                                            if (discountMode === 'pct') {
                                                // clamp to 100
                                                const n = parseInt(raw) || 0
                                                setFormData(prev => ({ ...prev, discount: n > 100 ? '100' : raw }))
                                            } else {
                                                setFormData(prev => ({ ...prev, discount: raw }))
                                            }
                                        }}
                                        placeholder={discountMode === 'pct' ? 'Nhập % giảm...' : 'Nhập số tiền được giảm...'}
                                        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-rose-500/30 text-slate-100 focus:border-red-500 focus:ring-red-500/20' : 'bg-white border-red-200 text-slate-800 focus:border-red-400 focus:ring-red-100'}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">
                                        {discountMode === 'pct' ? '%' : 'đ'}
                                    </span>
                                </div>

                                {/* Preview */}
                                {discount > 0 && chargeAmount > 0 && (
                                    <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${isDarkMode ? 'bg-rose-500/20' : 'bg-red-100'}`}>
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-rose-400' : 'text-red-700'}`}>Tiết kiệm được</span>
                                        <div className="text-right">
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-rose-400' : 'text-red-700'}`}>-{formatCurrency(discount)} đ</span>
                                            {discountMode === 'vnd' && chargeAmount > 0 && (
                                                <span className="ml-1.5 text-xs text-red-500">({discountPct.toFixed(0)}%)</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 7. TỔNG THANH TOÁN ── */}
                        {chargeAmount > 0 && (
                            <div className="rounded-2xl bg-green-500 px-4 py-3 text-white">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-90"><DollarSign className="h-4 w-4" /> Tổng thanh toán</span>
                                    <p className="text-xl font-black">{totalPayment <= 0 ? 'FREE' : formatCurrency(totalPayment) + ' đ'}</p>
                                </div>
                                {discount > 0 && (
                                    <div className="mt-1.5 flex items-center justify-between rounded-xl bg-white/20 px-3 py-1.5 text-xs">
                                        <span>Phí gốc: {formatCurrency(chargeAmount)} đ</span>
                                        <span className="inline-flex items-center gap-1"><Gift className="h-3 w-3" /> -{formatCurrency(discount)} đ</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fuel type selector (fuel only, when multiple types) */}
                        {!isElectric && availableFuelTypes.length > 1 && (
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Loại nhiên liệu</label>
                                <div className="flex gap-2">
                                    {availableFuelTypes.map(([key, { label }]) => {
                                        const sel = formData.fuel_type === key
                                        return (
                                            <label key={key} className={`flex-1 cursor-pointer rounded-xl border-2 px-3 py-2 text-center text-xs font-semibold transition-all ${
                                                sel 
                                                    ? (isDarkMode ? 'border-slate-500 bg-slate-800 text-slate-200' : 'border-slate-500 bg-slate-50 text-slate-700') 
                                                    : (isDarkMode ? 'border-slate-700 hover:border-slate-600 text-slate-500' : 'border-slate-200 hover:border-slate-300 text-slate-500')
                                                }`}>
                                                <input type="radio" name="fuel_type" value={key} checked={sel}
                                                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as any })}
                                                    className="hidden" />
                                                {key === 'electric' ? <Zap className="h-3 w-3 inline mr-0.5" /> : <Fuel className="h-3 w-3 inline mr-0.5" />}{label}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── ẢNH & GHI CHÚ (collapsible) ── */}
                        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex w-full items-center justify-between text-sm text-slate-500 hover:text-slate-700 transition-colors">
                            <span className="inline-flex items-center gap-2 font-medium"><Image className="h-4 w-4" /> Ảnh hóa đơn &amp; ghi chú</span>
                            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {showAdvanced && (
                            <div className={`space-y-4 border-t pt-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <ImageUpload
                                    value={scanPreviewUrl || formData.receipt_image_url}
                                    onChange={(url) => {
                                        if (!url) { setSelectedImageFile(null); setScanPreviewUrl(null); setFormData({ ...formData, receipt_image_url: null }) }
                                        else { setFormData({ ...formData, receipt_image_url: url }) }
                                    }}
                                    onFileSelect={(file) => setSelectedImageFile(file)}
                                    label="Ảnh hóa đơn"
                                />
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Ghi chú</label>
                                    <textarea rows={2}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder={isElectric ? 'Ví dụ: pin sạc từ 20% → 80%...' : 'Ghi chú thêm...'}
                                        className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400 focus:ring-blue-100'}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── SUBMIT ── */}
                        <button type="submit" disabled={loading}
                            className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100 ${
                                isElectric 
                                    ? `bg-green-600 ${isDarkMode ? 'shadow-none' : 'shadow-lg shadow-green-200'}` 
                                    : `bg-slate-600 ${isDarkMode ? 'shadow-none' : 'shadow-lg shadow-slate-200'}`
                                }`}>
                            {editingLog
                                ? <span className="flex items-center justify-center gap-2"><Save className="h-4 w-4" /> Lưu cập nhật</span>
                                : isElectric
                                    ? <span className="flex items-center justify-center gap-2"><Zap className="h-4 w-4" /> Lưu lịch sử sạc</span>
                                    : <span className="flex items-center justify-center gap-2"><Droplet className="h-4 w-4" /> Lưu nhật ký</span>
                            }
                        </button>
                    </form>
                </div>
            </div>

            <DateTimePickerModal
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onConfirm={(date) => {
                    setFormData({ ...formData, refuel_date: date })
                }}
                initialDate={formData.refuel_date}
                showTime={false}
            />

            <LoadingOverlay isOpen={loading} />
        </div>
    )
}

// =============================================
// BULK DISCOUNT MODAL
// =============================================
function BulkDiscountModal({
    logs,
    onClose,
    onSuccess
}: {
    logs: FuelLogRecord[]
    onClose: () => void
    onSuccess: () => void
}) {
    const { isDarkMode } = useAppearance()
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(logs.map(l => l.id)))
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('pct')
    const [discountValue, setDiscountValue] = useState('')

    const toggleAll = () => {
        if (selectedIds.size === logs.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(logs.map(l => l.id)))
    }

    const toggleLog = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedIds.size === 0) {
            showError('Vui lòng chọn ít nhất 1 nhật ký')
            return
        }
        const val = parseFloat(discountValue) || 0
        if (val <= 0) {
            showError('Vui lòng nhập giá trị khuyến mãi')
            return
        }

        setLoading(true)
        try {
            await Promise.all(
                Array.from(selectedIds).map(async (id) => {
                    const log = logs.find(l => l.id === id)
                    if (!log) return

                    const chargeAmount = Number(log.total_amount || 0)
                    const disc = discountMode === 'pct' ? Math.round(chargeAmount * val / 100) : val
                    const newCost = Math.max(0, Math.round(chargeAmount - disc))

                    let newNotes = log.notes || ''
                    // clean old bulk discount notes if any (simple approach)
                    newNotes = newNotes.replace(/\n?Khuyến mãi: -[\d.]+đ \)/g, '')
                    if (disc > 0) {
                        newNotes += `\nKhuyến mãi: -${disc.toLocaleString('vi-VN')} đ`
                    }

                    await updateFuelLog(id, {
                        total_cost: newCost,
                        notes: newNotes.trim() || undefined
                    })
                })
            )
            success('Áp dụng khuyến mãi thành công!')
            onSuccess()
        } catch (err) {
            console.error(err)
            showError('Lỗi xảy ra khi áp dụng khuyến mãi')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-full mt-12 sm:mt-0 safe-area-bottom overflow-hidden duration-300 ${isDarkMode ? 'bg-[#1E293B]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <div className={`px-5 pt-3 pb-4 text-white transition-all ${isDarkMode ? 'bg-rose-600' : 'bg-red-500'} sm:rounded-t-3xl`}>
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mb-1 mt-1">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <Gift className="h-5 w-5 fill-white/20" />
                            Áp khuyến mãi hàng loạt
                        </h3>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs opacity-80 mt-1 ml-7">Chọn lịch sử sạc và nhập khuyến mãi</p>
                </div>

                <div className={`flex-1 overflow-auto flex flex-col ${isDarkMode ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                        <div className="p-4 space-y-4">
                            {/* Inputs */}
                            <div className={`rounded-2xl border p-3 space-y-3 transition-all ${isDarkMode ? 'bg-slate-800 border-rose-500/20' : 'bg-white border-red-100 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Mức giảm giá</p>
                                    <div className={`flex rounded-lg overflow-hidden border ${isDarkMode ? 'border-rose-500/30' : 'border-red-200'}`}>
                                        <button type="button" onClick={() => { setDiscountMode('pct'); setDiscountValue('') }}
                                            className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'pct' ? (isDarkMode ? 'bg-rose-500 text-white' : 'bg-red-500 text-white') : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-red-50'}`}`}>%</button>
                                        <button type="button" onClick={() => { setDiscountMode('vnd'); setDiscountValue('') }}
                                            className={`px-2.5 py-1 text-xs font-bold transition-colors ${discountMode === 'vnd' ? (isDarkMode ? 'bg-rose-500 text-white' : 'bg-red-500 text-white') : `${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-red-50'}`}`}>đ</button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input type="text"
                                        value={discountMode === 'vnd' && discountValue ? parseInt(discountValue).toLocaleString('vi-VN') : discountValue}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^\d]/g, '')
                                            if (discountMode === 'pct') setDiscountValue(parseInt(raw) > 100 ? '100' : raw)
                                            else setDiscountValue(raw)
                                        }}
                                        placeholder={discountMode === 'pct' ? 'Nhập %' : 'Nhập số tiền'}
                                        required
                                        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-slate-800 border-rose-500/30 text-slate-100 focus:border-red-500 focus:ring-red-500/20' : 'bg-red-50 border-red-200 text-slate-800 focus:border-red-400 focus:ring-red-100'}`}
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${isDarkMode ? 'text-rose-400' : 'text-red-500'}`}>
                                        {discountMode === 'pct' ? '%' : 'đ'}
                                    </span>
                                </div>
                            </div>

                            {/* List to select */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase">Lịch sử sạc ({selectedIds.size}/{logs.length})</h4>
                                    <button type="button" onClick={toggleAll} className="text-xs text-blue-600 font-bold hover:underline">
                                        {selectedIds.size === logs.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                                    {logs.map(log => {
                                        const sel = selectedIds.has(log.id)
                                        const dateStr = new Date(log.refuel_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                        return (
                                            <div key={log.id} onClick={() => toggleLog(log.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                                    sel 
                                                        ? (isDarkMode ? 'border-red-500 bg-red-500/10 shadow-md' : 'border-red-400 bg-red-50 shadow-md') 
                                                        : (isDarkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-600' : 'border-slate-200 bg-white hover:border-slate-300')
                                                    }`}>
                                                {sel ? <CheckSquare className="h-5 w-5 text-red-500 shrink-0" /> : <Square className="h-5 w-5 text-slate-300 shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{log.station_name || 'Không rõ địa điểm'}</p>
                                                    <p className="text-[11px] font-medium text-slate-500">{dateStr} · {formatNumber(log.kwh || 0)} kWh</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-sm font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatCurrency(log.total_cost || log.total_amount || 0)} đ</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 border-t sticky bottom-0 transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                            <button type="submit" disabled={loading}
                                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 ${isDarkMode ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-black/20' : 'bg-red-500 hover:bg-red-600 shadow-md shadow-red-100'}`}>
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                                Áp dụng khuyến mãi
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

// =============================================
// CHARGE DETAIL MODAL 
// =============================================
function ChargeDetailModal({
    log,
    onClose,
    onSuccess
}: {
    log: FuelLogRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { isDarkMode } = useAppearance()
    const { success, error: showError } = useNotification()
    const [notes, setNotes] = useState(log.notes || '')
    const [saving, setSaving] = useState(false)

    const kwh = log.kwh || 0
    const startObj = log.refuel_time ? log.refuel_time.slice(0, 5) : null
    let endObj = null
    if (log.notes) {
        const match = log.notes.match(/Kết thúc:\s*(\d{2}:\d{2})/)
        if (match) endObj = match[1]
    }
    const durationMins = useMemo(() => {
        if (startObj && endObj) {
            const [sh, sm] = startObj.split(':').map(Number)
            const [eh, em] = endObj.split(':').map(Number)
            let mins = (eh * 60 + em) - (sh * 60 + sm)
            if (mins < 0) mins += 24 * 60
            if (mins > 0) return mins
        }
        let mins = log.charge_duration_minutes || 0
        if (log.notes) {
            const hMatch = log.notes.match(/(\d+)\s*(g|h|giờ|hour)/i)
            const mMatch = log.notes.match(/(\d+)\s*(p|ph|m|phút|minute)/i)
            let totalMins = 0
            if (hMatch) totalMins += parseInt(hMatch[1], 10) * 60
            if (mMatch) totalMins += parseInt(mMatch[1], 10)
            if (!hMatch && !mMatch) {
                const simpleMatch = log.notes.match(/Thời gian sạc:\s*(\d+)/)
                if (simpleMatch) totalMins = parseInt(simpleMatch[1], 10)
            }
            if (totalMins > 0) mins = totalMins
        }
        return mins
    }, [startObj, endObj, log.charge_duration_minutes, log.notes])

    const formatDurationDetailed = (mins: number) => {
        if (!mins || mins <= 0) return '--'
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0) return `${h} giờ ${m} phút`
        return `${m} phút`
    }

    // battery capacity = 37.23, percentage approx:
    const batteryPct = Math.round(Math.min(100, Math.max(0, (kwh / 37.23) * 100)))

    const chargeAmount = log.total_amount || 0
    const totalPayment = log.total_cost || 0
    const discount = Math.max(0, chargeAmount - totalPayment)

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = { ...log, notes }
            await updateFuelLog(log.id, payload as any)
            success('Đã lưu cập nhật')
            onSuccess()
            onClose()
        } catch (err) {
            showError('Không thể lưu cập nhật')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className={`w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300 ${isDarkMode ? 'bg-[#1E293B]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <div className={`px-5 pt-3 pb-5 text-white shrink-0 transition-all ${isDarkMode ? 'bg-blue-600 shadow-lg shadow-black/20' : 'bg-blue-600 shadow-md shadow-blue-100'}`}>
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Zap className="h-5 w-5 fill-white/20" />
                            Chi tiết phiên sạc
                        </h3>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-sm opacity-90 mt-1 ml-7 truncate">
                        {log.station_name || 'Không rõ trạm'} · {new Date(log.refuel_date).toLocaleDateString('vi-VN')} {startObj || ''}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
                    {/* Details Card */}
                    <div className={`grid grid-cols-2 gap-y-4 gap-x-4 mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian</p>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {startObj || '--:--'} {endObj ? `→ ${endObj}` : ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thời lượng sạc</p>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatDurationDetailed(durationMins)}</p>
                        </div>

                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vị trí địa chỉ</p>
                            <p className={`text-sm font-bold leading-snug ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{log.station_name || '--'}</p>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Năng lượng</p>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatNumber(log.kwh || 0)} kWh</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tỉ lệ sạc</p>
                            <p className="text-sm font-bold text-green-600">~{batteryPct}% pin</p>
                        </div>

                        <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chi phí phiên sạc</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-sm font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {(totalPayment === 0 && chargeAmount > 0) || totalPayment === 0 ? 'Miễn phí' : `${formatCurrency(totalPayment)} đ`}
                                </span>
                                {(totalPayment < chargeAmount) && (
                                    <span className="text-xs font-semibold text-slate-400 line-through">
                                        {formatCurrency(chargeAmount)} đ
                                    </span>
                                )}
                                {discount > 0 && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'text-green-400 bg-green-500/10' : 'text-green-500 bg-green-50'}`}>
                                        KM: -{formatCurrency(discount)} đ
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* We don't display cleanNotes here as it's part of the global editing form initially, but can be added if needed */}
                    </div>

                    <div className={`space-y-4 border-t pt-5 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        <h4 className={`font-bold text-sm mb-3 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Chỉnh sửa ghi chú</h4>
                        <div>
                            <textarea
                                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400 focus:bg-white'}`}
                                rows={4}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3.5 font-bold transition-all disabled:bg-slate-300 disabled:shadow-none ${isDarkMode ? 'shadow-none' : 'shadow-md shadow-blue-200'}`}
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Lưu cập nhật
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

