import { useState, useMemo } from 'react'
import {
    Wrench, Plus, Calendar, Trash2, AlertTriangle,
    CheckCircle2, Gauge, ChevronDown, ChevronUp,
    DollarSign, Store, ArrowRight, Clock, X, Save,
    ChevronLeft, ChevronRight, Activity, TrendingUp, Settings
} from 'lucide-react'
import { createMaintenance, deleteMaintenance, updateVehicle, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleMaintenance, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { useVehicleStore } from '../../store/useVehicleStore'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { DateRangePickerModal } from '../../components/ui/DateRangePickerModal'

const fmt = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

const MAINT_TYPES = {
    scheduled: { label: 'Định kỳ', icon: Clock, accent: 'blue' },
    repair: { label: 'Sửa chữa', icon: Wrench, accent: 'red' },
}

const BADGE: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
}

// Quick-pick service items
const SERVICE_PRESETS = [
    'Thay nhớt', 'Thay lọc gió', 'Thay lọc dầu', 'Rửa xe',
    'Thay má phanh', 'Thay bugi', 'Kiểm tra tổng quát',
    'Bơm lốp', 'Thay lốp', 'Vệ sinh kim phun',
]

type FilterPeriod = 'day' | 'week' | 'month' | 'quarter' | 'all' | 'custom'
const PERIOD_TABS: { id: FilterPeriod; label: string }[] = [
    { id: 'day', label: 'Ngày' },
    { id: 'week', label: 'Tuần' },
    { id: 'month', label: 'Tháng' },
    { id: 'quarter', label: 'Quý' },
    { id: 'all', label: 'Tất cả' },
]

function getPeriodRange(period: FilterPeriod, offset: number, customRange?: { start: string, end: string }): { start: Date; end: Date; label: string } {
    const now = new Date()
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
        const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1
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
    if (period === 'custom' && customRange?.start && customRange?.end) {
        const s = new Date(customRange.start); s.setHours(0, 0, 0, 0)
        const e = new Date(customRange.end); e.setHours(23, 59, 59, 999)
        const label = s.getTime() === e.getTime() ? s.toLocaleDateString('vi-VN') : `${s.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${e.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        return { start: s, end: e, label }
    }
    if (period === 'custom') return { start: new Date(), end: new Date(), label: 'Chọn khoảng thời gian' }
    return { start: new Date(0), end: new Date(9999, 0), label: 'Tất cả' }
}

export default function VehicleMaintenance() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()
    const { data: vehicles = [] } = useVehicles()

    const { selectedVehicleId } = useVehicleStore()
    const [showAddModal, setShowAddModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month')
    const [periodOffset, setPeriodOffset] = useState(0)
    const [isRangePickerOpen, setIsRangePickerOpen] = useState(false)
    const [customRange, setCustomRange] = useState({ start: '', end: '' })

    const effectiveId = selectedVehicleId || vehicles.find(v => v.is_default)?.id || vehicles[0]?.id || ''
    const { data: logs = [], isLoading: loading } = useVehicleMaintenance(effectiveId || undefined)
    const selectedVehicle = vehicles.find(v => v.id === effectiveId)
    const isMoto = selectedVehicle?.vehicle_type === 'motorcycle'

    // Stats tổng
    const totalCost = useMemo(() => logs.reduce((s, l) => s + (l.total_cost || 0), 0), [logs])
    const totalCount = logs.length
    const avgCostPerSession = totalCount > 0 ? totalCost / totalCount : 0
    const thisMonthLogs = useMemo(() => {
        const now = new Date()
        return logs.filter(l => {
            const d = new Date(l.maintenance_date)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })
    }, [logs])
    const thisMonthCost = useMemo(() => thisMonthLogs.reduce((s, l) => s + (l.total_cost || 0), 0), [thisMonthLogs])

    // Period filter
    const periodRange = getPeriodRange(filterPeriod, periodOffset, customRange)
    const filteredLogs = useMemo(() => {
        if (filterPeriod === 'all') return logs
        return logs.filter(l => {
            const d = new Date(l.maintenance_date)
            return d >= periodRange.start && d <= periodRange.end
        })
    }, [logs, filterPeriod, periodRange])

    const periodTotalCost = filteredLogs.reduce((s, l) => s + (l.total_cost || 0), 0)

    // Group by date
    const groupedLogs = filteredLogs.reduce<Record<string, typeof filteredLogs>>((acc, log) => {
        const key = log.maintenance_date
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {})
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteMaintenance(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenance(effectiveId) })
            success('Đã xóa nhật ký bảo dưỡng!')
            setDeleteConfirmId(null)
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể xóa')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Bảo Dưỡng Xe"
                customContent={
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="flex items-center justify-center rounded-full bg-white p-2 border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            <Settings className="h-5 w-5 text-slate-600" />
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center rounded-full bg-gray-500 p-2 shadow-md hover:bg-gray-600 active:scale-95 transition-all"
                        >
                            <Plus className="h-5 w-5 text-white" />
                        </button>
                    </div>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4">

                {/* ── Hero Stats Card ───────────────────────────────────── */}
                {selectedVehicle && (
                    <div className="mb-4 space-y-3">
                        {/* Main card - solid gray */}
                        <div className="rounded-2xl bg-gray-500 p-4 text-white shadow-lg shadow-gray-200">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="rounded-xl bg-white/20 p-1.5">
                                    <Wrench className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold opacity-90">Tổng quan bảo dưỡng</span>
                                <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{isMoto ? 'Xe máy' : 'Ô tô'} · {selectedVehicle.license_plate}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-2xl font-black">{logs.length}</p>
                                    <p className="text-xs opacity-75">Lần bảo dưỡng</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black">{fmt(totalCost)}</p>
                                    <p className="text-xs opacity-75">Tổng chi phí</p>
                                </div>
                            </div>
                        </div>

                        {/* Mini stats row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                                <div className="mb-1 rounded-lg bg-gray-100 p-1.5">
                                    <Wrench className="h-4 w-4 text-gray-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">
                                    {avgCostPerSession > 0 ? `${Math.round(avgCostPerSession / 1000)}k` : '--'}
                                </p>
                                <p className="text-center text-[10px] leading-tight text-slate-500">TB/lần</p>
                            </div>
                            <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                                <div className="mb-1 rounded-lg bg-blue-100 p-1.5">
                                    <Activity className="h-4 w-4 text-blue-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">{thisMonthLogs.length}</p>
                                <p className="text-center text-[10px] leading-tight text-slate-500">Tháng này</p>
                            </div>
                            <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
                                <div className="mb-1 rounded-lg bg-green-100 p-1.5">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-800">
                                    {thisMonthCost > 0 ? `${Math.round(thisMonthCost / 1000)}k` : '--'}
                                </p>
                                <p className="text-center text-[10px] leading-tight text-slate-500">Chi tháng</p>
                            </div>
                        </div>

                        {/* Month cost badge */}
                        {thisMonthCost > 0 && (
                            <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Chi phí bảo dưỡng tháng này</span>
                                </div>
                                <span className="text-sm font-bold text-gray-700">{fmt(thisMonthCost)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Next Maintenance Info ─────────────────────────────── */}
                {selectedVehicle?.next_maintenance_km && (
                    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="rounded-xl bg-gray-100 p-2">
                            <Gauge className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800">Bảo dưỡng tiếp theo</p>
                            <p className="text-xs text-gray-600">Tại {selectedVehicle.next_maintenance_km.toLocaleString()} km
                                {selectedVehicle.current_odometer && (
                                    <span className="ml-1 font-semibold">
                                        · còn {Math.max(0, selectedVehicle.next_maintenance_km - selectedVehicle.current_odometer).toLocaleString()} km
                                    </span>
                                )}
                            </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-500 shrink-0" />
                    </div>
                )}

                {/* ── Add Button ───────────────────────────────────────── */}
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full mb-4 flex items-center justify-center gap-2.5 rounded-2xl bg-gray-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-gray-200 transition-all hover:scale-[1.02] hover:bg-gray-600 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Thêm nhật ký bảo dưỡng
                </button>

                {/* ── Filter Bar ───────────────────────────────────────── */}
                <div className="mb-3 space-y-2">
                    <div className="flex rounded-xl bg-gray-200 p-1 gap-0.5 shadow-inner">
                        {PERIOD_TABS.map(tab => (
                            <button key={tab.id} type="button"
                                onClick={() => { setFilterPeriod(tab.id); setPeriodOffset(0) }}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${filterPeriod === tab.id
                                    ? 'bg-gray-500 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {filterPeriod !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button type="button"
                                onClick={() => setPeriodOffset(o => o - 1)}
                                className="rounded-xl border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div
                                onClick={() => setIsRangePickerOpen(true)}
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <p className="text-md font-bold text-gray-700">{periodRange.label}</p>
                            </div>
                            <button type="button"
                                onClick={() => setPeriodOffset(o => Math.min(0, o + 1))}
                                disabled={periodOffset >= 0 && filterPeriod !== 'custom'}
                                className="rounded-xl border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {filteredLogs.length > 0 && (
                        <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                            <span className="text-xs text-slate-500">
                                <span className="font-bold text-slate-700">{filteredLogs.length}</span> lần bảo dưỡng
                            </span>
                            <span className="text-sm font-black text-gray-700">{fmt(periodTotalCost)}</span>
                        </div>
                    )}
                </div>

                {/* ── Logs List ─────────────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                                <div className="mb-3 h-4 w-2/3 rounded-lg bg-slate-100" />
                                <div className="h-16 w-full rounded-xl bg-slate-50" />
                            </div>
                        ))}
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 py-14 shadow-sm">
                        <div className="mb-4 rounded-3xl bg-gray-200 p-6 shadow-md">
                            <Wrench className="h-12 w-12 text-gray-600" />
                        </div>
                        <p className="font-semibold text-slate-600">
                            {filterPeriod === 'all' ? 'Chưa có nhật ký bảo dưỡng' : `Không có dữ liệu trong ${periodRange.label.toLowerCase()}`}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                            {filterPeriod !== 'all' ? 'Thử chọn khung thời gian khác' : 'Thêm bảo dưỡng đầu tiên ngay'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedDates.map(dateKey => {
                            const dayLogs = groupedLogs[dateKey]
                            const d = new Date(dateKey)
                            const todayKey = new Date().toISOString().split('T')[0]
                            const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0]
                            const dayLabel = dateKey === todayKey ? 'Hôm nay'
                                : dateKey === yesterdayKey ? 'Hôm qua'
                                    : d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })
                            const dayTotal = dayLogs.reduce((s, l) => s + (l.total_cost || 0), 0)
                            return (
                                <div key={dateKey}>
                                    {/* Date separator */}
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dayLabel}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-slate-400">{fmt(dayTotal)}</span>
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                                        {dayLogs.map(log => {
                                            const type = MAINT_TYPES[log.maintenance_type as keyof typeof MAINT_TYPES] || MAINT_TYPES.scheduled
                                            const TypeIcon = type.icon
                                            const isExpanded = expandedId === log.id
                                            const parts = log.parts_cost || 0
                                            const labor = log.labor_cost || 0
                                            return (
                                                <div key={log.id} className="overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg border border-slate-100">
                                                    {/* Top accent bar */}
                                                    <div className={`h-1 w-full ${type.accent === 'blue' ? 'bg-blue-400' : 'bg-red-400'}`} />

                                                    <div className="p-4">
                                                        {/* Header row */}
                                                        <button
                                                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                                            className="flex w-full items-start justify-between text-left"
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[type.accent as keyof typeof BADGE]}`}>
                                                                        {type.label}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400">{log.odometer.toLocaleString()} km</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                        <TypeIcon className="h-3 w-3" />
                                                                        {type.label}
                                                                    </span>
                                                                    {log.service_provider && (
                                                                        <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-[120px]">
                                                                            <Store className="h-3 w-3 shrink-0" />{log.service_provider}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                <span className="text-base font-black text-gray-600">{fmt(log.total_cost || 0)}</span>
                                                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                                            </div>
                                                        </button>

                                                        {/* Service items quick view */}
                                                        {log.service_items && log.service_items.length > 0 && !isExpanded && (
                                                            <div className="mt-2.5 flex flex-wrap gap-1">
                                                                {log.service_items.slice(0, 3).map((item, i) => (
                                                                    <span key={i} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{item}</span>
                                                                ))}
                                                                {log.service_items.length > 3 && (
                                                                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">+{log.service_items.length - 3}</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Expanded content */}
                                                        {isExpanded && (
                                                            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                                                                {/* Service items */}
                                                                {log.service_items && log.service_items.length > 0 && (
                                                                    <div>
                                                                        <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hạng mục thực hiện</p>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {log.service_items.map((item, i) => (
                                                                                <span key={i} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                                                    {item}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Cost breakdown */}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                                        <p className="text-[10px] text-slate-400">Phụ tùng</p>
                                                                        <p className="text-sm font-bold text-slate-700">{fmt(parts)}</p>
                                                                    </div>
                                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                                        <p className="text-[10px] text-slate-400">Nhân công</p>
                                                                        <p className="text-sm font-bold text-slate-700">{fmt(labor)}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Notes */}
                                                                {log.notes && (
                                                                    <p className="text-xs text-slate-400 italic">"{log.notes}"</p>
                                                                )}

                                                                {/* Total + Delete */}
                                                                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                                                                    <span className="text-xs font-medium text-gray-700">Tổng cộng</span>
                                                                    <span className="text-base font-black text-gray-700">{fmt(log.total_cost || 0)}</span>
                                                                </div>

                                                                <button
                                                                    onClick={() => setDeleteConfirmId(log.id)}
                                                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all"
                                                                >
                                                                    <Trash2 className="h-4 w-4" /> Xóa nhật ký
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            <VehicleFooterNav onAddClick={() => setShowAddModal(true)} addLabel="Bảo dưỡng" isElectricVehicle={selectedVehicle?.fuel_type === 'electric'} />

            {showSettingsModal && selectedVehicle && (
                <MaintenanceSettingsModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowSettingsModal(false)}
                    onSuccess={() => {
                        setShowSettingsModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
                    }}
                />
            )}

            {/* Add Modal */}
            {showAddModal && selectedVehicle && (
                <AddMaintenanceModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenance(effectiveId) })
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xóa nhật ký bảo dưỡng"
                message="Bạn có chắc muốn xóa nhật ký này không? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
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
        </div>
    )
}

function AddMaintenanceModal({ vehicle, onClose, onSuccess }: {
    vehicle: VehicleRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [selectedItems, setSelectedItems] = useState<string[]>([])
    const [customItem, setCustomItem] = useState('')
    const [form, setForm] = useState({
        maintenance_date: new Date().toISOString().split('T')[0],
        odometer: vehicle.current_odometer,
        maintenance_type: 'scheduled' as 'scheduled' | 'repair',
        service_provider: '',
        parts_cost: '',
        labor_cost: '',
        next_reminder_km: '',
        next_reminder_date: '',
        notes: '',
    })

    const toggleItem = (item: string) =>
        setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])

    const addCustomItem = () => {
        if (customItem.trim() && !selectedItems.includes(customItem.trim())) {
            setSelectedItems(prev => [...prev, customItem.trim()])
            setCustomItem('')
        }
    }

    const calculateReminders = () => {
        const intervalKm = vehicle.maintenance_interval_km || (vehicle.vehicle_type === 'motorcycle' ? 2000 : 5000)
        const km = form.odometer ? form.odometer + intervalKm : ''

        let dDate = ''
        if (vehicle.maintenance_interval_months && form.maintenance_date) {
            const d = new Date(form.maintenance_date)
            d.setMonth(d.getMonth() + vehicle.maintenance_interval_months)
            dDate = d.toISOString().split('T')[0]
        } else {
            const d = new Date(form.maintenance_date || new Date())
            d.setMonth(d.getMonth() + (vehicle.vehicle_type === 'motorcycle' ? 3 : 6))
            dDate = d.toISOString().split('T')[0]
        }

        setForm(prev => ({ ...prev, next_reminder_km: String(km), next_reminder_date: dDate }))
    }

    const parts = parseFloat(form.parts_cost) || 0
    const labor = parseFloat(form.labor_cost) || 0
    const total = parts + labor

    const handleSubmit = async () => {
        if (total === 0) { showError('Vui lòng nhập chi phí'); return }
        setLoading(true)
        try {
            await createMaintenance({
                vehicle_id: vehicle.id,
                maintenance_date: form.maintenance_date,
                odometer: form.odometer,
                maintenance_type: form.maintenance_type,
                service_items: selectedItems,
                service_provider: form.service_provider || undefined,
                parts_cost: parts,
                labor_cost: labor,
                total_cost: total,
                next_reminder_km: form.next_reminder_km ? parseInt(form.next_reminder_km) : undefined,
                next_reminder_date: form.next_reminder_date || undefined,
                notes: form.notes || undefined,
            } as any)
            success('Đã lưu nhật ký bảo dưỡng!')
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] pointer-events-none">
            <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl pointer-events-auto mt-12 sm:mt-0 safe-area-bottom overflow-hidden">
                <div className="sticky top-0 z-10 bg-gray-500 px-5 pt-3 pb-4 text-white">
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><Wrench className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">Thêm nhật ký bảo dưỡng</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs opacity-70 mt-1 ml-10">{vehicle.license_plate} · {vehicle.current_odometer.toLocaleString()} km hiện tại</p>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Ngày</label>
                            <input type="date" value={form.maintenance_date}
                                onChange={e => setForm({ ...form, maintenance_date: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-gray-400 focus:bg-white focus:outline-none" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Số km (ODO)</label>
                            <input type="number" value={form.odometer}
                                onChange={e => setForm({ ...form, odometer: parseInt(e.target.value) })}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium focus:border-gray-400 focus:bg-white focus:outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Loại bảo dưỡng</label>
                        <div className="flex gap-2">
                            {Object.entries(MAINT_TYPES).map(([key, { label, accent }]) => (
                                <button key={key} onClick={() => setForm({ ...form, maintenance_type: key as any })}
                                    className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${form.maintenance_type === key
                                        ? accent === 'blue' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-red-400 bg-red-50 text-red-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Hạng mục thực hiện {selectedItems.length > 0 && <span className="text-gray-600">({selectedItems.length})</span>}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {SERVICE_PRESETS.map(item => (
                                <button key={item} onClick={() => toggleItem(item)}
                                    className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${selectedItems.includes(item)
                                        ? 'border-gray-400 bg-gray-50 text-gray-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                                    {selectedItems.includes(item) && <CheckCircle2 className="h-3 w-3" />}
                                    {item}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={customItem} onChange={e => setCustomItem(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                                placeholder="Thêm hạng mục khác..."
                                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-gray-400 focus:bg-white focus:outline-none" />
                            <button onClick={addCustomItem} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200">
                                + Thêm
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Chi phí</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="number" value={form.parts_cost}
                                    onChange={e => setForm({ ...form, parts_cost: e.target.value })}
                                    placeholder="Phụ tùng"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm font-medium focus:border-gray-400 focus:bg-white focus:outline-none" />
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="number" value={form.labor_cost}
                                    onChange={e => setForm({ ...form, labor_cost: e.target.value })}
                                    placeholder="Nhân công"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm font-medium focus:border-gray-400 focus:bg-white focus:outline-none" />
                            </div>
                        </div>
                        {total > 0 && (
                            <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                                <span className="text-xs font-medium text-gray-700">Tổng cộng</span>
                                <span className="text-base font-black text-gray-700">{fmt(total)}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Nơi thực hiện</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" value={form.service_provider}
                                onChange={e => setForm({ ...form, service_provider: e.target.value })}
                                placeholder="Tên garage / tiệm..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-gray-600" />
                                <p className="text-sm font-bold text-gray-700">Nhắc bảo dưỡng tiếp theo</p>
                            </div>
                            <button type="button" onClick={calculateReminders} className="text-xs text-gray-700 font-bold underline bg-gray-100 px-2 py-1 rounded-md">
                                Gợi ý mốc
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Tại số km</label>
                                <input type="number" value={form.next_reminder_km}
                                    onChange={e => setForm({ ...form, next_reminder_km: e.target.value })}
                                    placeholder={form.odometer ? String(form.odometer + (vehicle.maintenance_interval_km || 5000)) : ''}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Hoặc ngày</label>
                                <input type="date" value={form.next_reminder_date}
                                    onChange={e => setForm({ ...form, next_reminder_date: e.target.value })}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wide">Ghi chú</label>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                            rows={2} placeholder="Ghi chú thêm..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none resize-none" />
                    </div>

                    <div className="flex gap-3 pb-2">
                        <button onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                            Hủy
                        </button>
                        <button onClick={handleSubmit} disabled={loading}
                            className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-gray-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-gray-200 hover:bg-gray-600 disabled:opacity-50 active:scale-95 transition-all">
                            <Save className="h-4 w-4" /> Lưu bảo dưỡng
                        </button>
                    </div>
                </div>
            </div>
            <LoadingOverlay isOpen={loading} />
        </div>
    )
}

function MaintenanceSettingsModal({ vehicle, onClose, onSuccess }: {
    vehicle: VehicleRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [intervalKm, setIntervalKm] = useState(vehicle.maintenance_interval_km ? String(vehicle.maintenance_interval_km) : '')
    const [intervalMonths, setIntervalMonths] = useState(vehicle.maintenance_interval_months ? String(vehicle.maintenance_interval_months) : '')

    const handleSave = async () => {
        setLoading(true)
        try {
            await updateVehicle(vehicle.id, {
                maintenance_interval_km: intervalKm ? parseInt(intervalKm) : null as any,
                maintenance_interval_months: intervalMonths ? parseInt(intervalMonths) : null as any,
            })
            success('Đã lưu cấu hình chu kỳ bảo dưỡng!')
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu cài đặt')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] pointer-events-none">
            <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl pointer-events-auto mt-12 sm:mt-0 safe-area-bottom overflow-hidden">
                <div className="sticky top-0 z-10 bg-slate-800 px-5 pt-3 pb-4 text-white">
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-white/20 p-1.5"><Settings className="h-4 w-4" /></div>
                            <h3 className="text-base font-bold">Cài đặt chu kỳ bảo dưỡng</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs opacity-70 mt-1 ml-10">Thiết lập mốc gợi ý cho {vehicle.license_plate}</p>
                </div>

                <div className="px-5 py-6 space-y-6">
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wide">Chu kỳ theo số km (ODO)</label>
                        <div className="relative">
                            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="number" value={intervalKm} onChange={e => setIntervalKm(e.target.value)}
                                placeholder="Ví dụ: 5000"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm font-bold focus:border-slate-400 focus:bg-white focus:outline-none" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">km</span>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wide">Chu kỳ theo thời gian (tháng)</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="number" value={intervalMonths} onChange={e => setIntervalMonths(e.target.value)}
                                placeholder="Ví dụ: 6"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm font-bold focus:border-slate-400 focus:bg-white focus:outline-none" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">tháng</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                            Hủy
                        </button>
                        <button onClick={handleSave} disabled={loading}
                            className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-slate-800 py-4 text-sm font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-900 icon-white disabled:opacity-50 active:scale-95 transition-all">
                            <Save className="h-4 w-4" /> Lưu cài đặt
                        </button>
                    </div>
                </div>
            </div>
            <LoadingOverlay isOpen={loading} />
        </div>
    )
}
