import { useState, useMemo } from 'react'
import {
    Receipt, Calendar, Trash2, MapPin,
    ChevronDown, ChevronUp, DollarSign, FileText,
    X, Save, Filter,
    TrendingUp, Activity, Check
} from 'lucide-react'
import { createExpense, deleteExpense, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useVehicles, useVehicleExpenses, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { useVehicleStore } from '../../store/useVehicleStore'
import { NumberPadModal } from '../../components/ui/NumberPadModal'

const fmt = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

const EXPENSE_TYPES: Record<string, { label: string; accentBar: string; bg: string; text: string; iconBg: string }> = {
    toll: { label: 'Cầu đường', accentBar: 'bg-orange-400', bg: 'bg-orange-100', text: 'text-orange-700', iconBg: 'bg-orange-100' },
    parking: { label: 'Gửi xe', accentBar: 'bg-blue-400', bg: 'bg-blue-100', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    insurance: { label: 'Bảo hiểm', accentBar: 'bg-green-400', bg: 'bg-green-100', text: 'text-green-700', iconBg: 'bg-green-100' },
    inspection: { label: 'Đăng kiểm', accentBar: 'bg-purple-400', bg: 'bg-purple-100', text: 'text-purple-700', iconBg: 'bg-purple-100' },
    wash: { label: 'Rửa xe', accentBar: 'bg-cyan-400', bg: 'bg-cyan-100', text: 'text-cyan-700', iconBg: 'bg-cyan-100' },
    fine: { label: 'Phạt', accentBar: 'bg-red-400', bg: 'bg-red-100', text: 'text-red-700', iconBg: 'bg-red-100' },
    other: { label: 'Khác', accentBar: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600', iconBg: 'bg-slate-100' },
}

type FilterPeriod = 'day' | 'week' | 'month' | 'quarter' | 'all'
const PERIOD_TABS: { id: FilterPeriod; label: string }[] = [
    { id: 'day', label: 'Ngày' },
    { id: 'week', label: 'Tuần' },
    { id: 'month', label: 'Tháng' },
    { id: 'quarter', label: 'Quý' },
    { id: 'all', label: 'Tất cả' },
]

function getPeriodRange(period: FilterPeriod, offset: number): { start: Date; end: Date; label: string } {
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
    return { start: new Date(0), end: new Date(9999, 0), label: 'Tất cả' }
}

export default function VehicleExpenses() {
    const { success, error: showError } = useNotification()
    const queryClient = useQueryClient()
    const { data: vehicles = [] } = useVehicles()

    const { selectedVehicleId } = useVehicleStore()
    const [showAddModal, setShowAddModal] = useState(false)
    const [showFilterModal, setShowFilterModal] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month')
    const [periodOffset] = useState(0) // Still maintain this but inside the UI maybe simplified

    const effectiveId = selectedVehicleId || vehicles.find(v => v.is_default)?.id || vehicles[0]?.id || ''
    const { data: logs = [], isLoading: loading } = useVehicleExpenses(effectiveId || undefined)
    const selectedVehicle = vehicles.find(v => v.id === effectiveId)
    const isMoto = selectedVehicle?.vehicle_type === 'motorcycle'

    // Stats tổng
    const totalCost = useMemo(() => logs.reduce((s, l) => s + l.amount, 0), [logs])
    const totalCount = logs.length
    const thisMonthLogs = useMemo(() => {
        const now = new Date()
        return logs.filter(l => {
            const d = new Date(l.expense_date)
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })
    }, [logs])
    const thisMonthCost = useMemo(() => thisMonthLogs.reduce((s, l) => s + l.amount, 0), [thisMonthLogs])
    const avgCost = totalCount > 0 ? totalCost / totalCount : 0

    // Period filter
    const periodRange = getPeriodRange(filterPeriod, periodOffset)
    const periodFilteredLogs = useMemo(() => {
        if (filterPeriod === 'all') return filterType === 'all' ? logs : logs.filter(l => l.expense_type === filterType)
        return logs.filter(l => {
            const d = new Date(l.expense_date)
            const inPeriod = d >= periodRange.start && d <= periodRange.end
            return inPeriod && (filterType === 'all' || l.expense_type === filterType)
        })
    }, [logs, filterPeriod, periodRange, filterType])

    const periodTotalCost = periodFilteredLogs.reduce((s, l) => s + l.amount, 0)

    // Group by date
    const groupedLogs = periodFilteredLogs.reduce<Record<string, typeof periodFilteredLogs>>((acc, log) => {
        const key = log.expense_date
        if (!acc[key]) acc[key] = []
        acc[key].push(log)
        return acc
    }, {})
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

    const handleDelete = async () => {
        if (!deleteConfirmId) return
        setDeleting(true)
        try {
            await deleteExpense(deleteConfirmId)
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.expenses(effectiveId) })
            success('Đã xóa chi phí!')
            setDeleteConfirmId(null)
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể xóa')
        } finally {
            setDeleting(false)
        }
    }

    const appliedFilterCount = (filterPeriod !== 'month' ? 1 : 0) + (filterType !== 'all' ? 1 : 0)

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Chi Phí Khác"
                customContent={
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className={`relative flex items-center justify-center rounded-full p-2 shadow-sm transition-all active:scale-95 ${appliedFilterCount > 0 ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        <Filter className="h-5 w-5" />
                        {appliedFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-white">
                                {appliedFilterCount}
                            </span>
                        )}
                    </button>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4">

                {/* ── Hero Stats Card ───────────────────────────────────── */}
                {selectedVehicle && (
                    <div className="mb-4 space-y-3">
                        {/* Main card - solid blue */}
                        <div className="rounded-3xl bg-blue-500 p-5 text-white shadow-lg shadow-blue-200 overflow-hidden relative">
                            {/* Decorative background shapes */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

                            <div className="relative z-10">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                                        <Receipt className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold opacity-90 tracking-wide">Tổng chi phí phát sinh</span>
                                    <span className="ml-auto rounded-full bg-blue-600/50 border border-blue-400/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                                        {isMoto ? 'Xe máy' : 'Ô tô'}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-sm opacity-80 mb-0.5">Giá trị</p>
                                        <p className="text-3xl font-black tracking-tight">{fmt(totalCost)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm opacity-80 mb-0.5">Số lần</p>
                                        <p className="text-2xl font-black">{logs.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mini stats row */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3.5 shadow-md shadow-slate-200/60 border border-slate-100">
                                <div className="mb-2 rounded-full bg-blue-50 p-2">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                </div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Tháng này</p>
                                <p className="text-base font-black text-slate-800">{thisMonthLogs.length}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3.5 shadow-md shadow-slate-200/60 border border-slate-100">
                                <div className="mb-2 rounded-full bg-green-50 p-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                </div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Chi tháng</p>
                                <p className="text-base font-black text-slate-800">
                                    {thisMonthCost > 0 ? `${Math.round(thisMonthCost / 1000)}k` : '--'}
                                </p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3.5 shadow-md shadow-slate-200/60 border border-slate-100">
                                <div className="mb-2 rounded-full bg-sky-50 p-2">
                                    <Receipt className="h-4 w-4 text-sky-500" />
                                </div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">TB/khoản</p>
                                <p className="text-base font-black text-slate-800">
                                    {avgCost > 0 ? `${Math.round(avgCost / 1000)}k` : '--'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Filter Result Bar (Chỉ hiển thị khi đang lọc) ───────────────────────────────────────── */}
                <div className="mb-4">
                    {(filterPeriod !== 'all' || filterType !== 'all') ? (
                        <div className="flex items-center justify-between rounded-xl bg-blue-50/80 border border-blue-100 px-4 py-3 shadow-sm shadow-blue-100/50">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-blue-800 mb-0.5">
                                    {filterPeriod !== 'all' ? periodRange.label : 'Tất cả thời gian'}
                                    {filterType !== 'all' && ` • ${EXPENSE_TYPES[filterType]?.label || 'Khác'}`}
                                </span>
                                <span className="text-[11px] text-blue-600/80">
                                    Tìm thấy <span className="font-bold">{periodFilteredLogs.length}</span> giao dịch
                                </span>
                            </div>
                            <span className="text-base font-black text-blue-700">{fmt(periodTotalCost)}</span>
                        </div>
                    ) : periodFilteredLogs.length > 0 ? (
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Tất cả chi phí</h3>
                        </div>
                    ) : null}
                </div>

                {/* ── Logs ──────────────────────────────────────────────── */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                                <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/2 rounded bg-slate-100" />
                                    <div className="h-3 w-1/3 rounded bg-slate-50" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : periodFilteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 py-14 shadow-sm">
                        <div className="mb-4 rounded-full bg-slate-50 p-6">
                            <Receipt className="h-10 w-10 text-slate-300" />
                        </div>
                        <p className="font-semibold text-slate-600">
                            {filterPeriod === 'all' && filterType === 'all'
                                ? 'Chưa có chi phí nào'
                                : 'Không tìm thấy chi phí'}
                        </p>
                        <p className="mt-1 text-sm text-slate-400 text-center px-6">
                            {(filterPeriod !== 'all' || filterType !== 'all')
                                ? 'Thử thay đổi bộ lọc hoặc chọn khu vực thời gian khác'
                                : 'Các chi phí phát sinh như gửi xe, rửa xe sẽ hiển thị ở đây'}
                        </p>
                        {(filterPeriod !== 'all' || filterType !== 'all') && (
                            <button
                                onClick={() => { setFilterPeriod('all'); setFilterType('all'); }}
                                className="mt-4 text-sm font-bold text-blue-500 hover:text-blue-600 px-4 py-2 bg-blue-50 rounded-xl"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
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
                            const dayTotal = dayLogs.reduce((s, l) => s + l.amount, 0)

                            return (
                                <div key={dateKey}>
                                    {/* Date separator */}
                                    <div className="mb-2 flex items-center justify-between pl-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{dayLabel}</span>
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-400">{fmt(dayTotal)}</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {dayLogs.map(log => {
                                            const t = EXPENSE_TYPES[log.expense_type] || EXPENSE_TYPES.other
                                            const isExpanded = expandedId === log.id
                                            return (
                                                <div key={log.id}
                                                    className={`overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-200/50 border transition-all ${isExpanded ? 'border-slate-300 shadow-lg shadow-slate-300/50 scale-[1.01]' : 'border-slate-100 hover:border-slate-200'} `}>

                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                                        className="flex w-full items-center p-3 text-left relative"
                                                    >
                                                        {/* Left border indicator */}
                                                        <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${t.accentBar}`} />

                                                        {/* Icon */}
                                                        <div className={`flex items-center justify-center p-2.5 rounded-xl ml-2 ${t.bg}`}>
                                                            {t.label === 'Gửi xe' ? <MapPin className={`h-4 w-4 ${t.text}`} />
                                                                : t.label === 'Rửa xe' ? <Activity className={`h-4 w-4 ${t.text}`} />
                                                                    : <Receipt className={`h-4 w-4 ${t.text}`} />}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="ml-3 flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-sm font-bold text-slate-800">{t.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                {log.description ? (
                                                                    <span className="truncate max-w-[140px]">{log.description}</span>
                                                                ) : (
                                                                    <span>Tùy chọn khác</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Amount */}
                                                        <div className="flex flex-col items-end shrink-0 ml-2">
                                                            <span className={`text-sm font-black ${t.text}`}>{fmt(log.amount)}</span>
                                                            {isExpanded
                                                                ? <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide flex items-center gap-1">Đóng <ChevronUp className="h-3 w-3" /></span>
                                                                : <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide flex items-center gap-1">Chi tiết <ChevronDown className="h-3 w-3" /></span>}
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 pt-0">
                                                            <div className="rounded-xl bg-slate-50 p-3 space-y-2.5">
                                                                {log.description && (
                                                                    <div className="flex items-start gap-2">
                                                                        <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                                        <p className="text-xs font-medium text-slate-700">{log.description}</p>
                                                                    </div>
                                                                )}
                                                                {log.location && (
                                                                    <div className="flex items-start gap-2">
                                                                        <MapPin className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                                                                        <p className="text-xs font-medium text-slate-700">{log.location}</p>
                                                                    </div>
                                                                )}
                                                                {log.notes && (
                                                                    <p className="text-xs text-slate-400 italic border-t border-slate-200/60 pt-2 mt-2">Ghi chú: {log.notes}</p>
                                                                )}

                                                                <div className="flex justify-end pt-1 mt-1 border-t border-red-100/50">
                                                                    <button
                                                                        onClick={() => setDeleteConfirmId(log.id)}
                                                                        className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm border border-red-100"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" /> Xóa
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="h-[120px] w-full flex-shrink-0"></div>
            </main>

            <VehicleFooterNav onAddClick={() => setShowAddModal(true)} addLabel="Chi phí" isElectricVehicle={selectedVehicle?.fuel_type === 'electric'} />

            {/* Filter Modal */}
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                filterType={filterType}
                setFilterType={setFilterType}
                filterPeriod={filterPeriod}
                setFilterPeriod={setFilterPeriod}
            />

            {showAddModal && selectedVehicle && (
                <AddExpenseModal
                    vehicle={selectedVehicle}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        queryClient.invalidateQueries({ queryKey: vehicleKeys.expenses(effectiveId) })
                    }}
                />
            )}

            <ConfirmDialog
                isOpen={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={handleDelete}
                title="Xóa khoản chi phí"
                message="Bạn có chắc muốn xóa khoản chi này không?"
                confirmText="Xóa"
                cancelText="Hủy"
                isLoading={deleting}
            />
        </div>
    )
}

// ─── Filter Modal ───────────────────────────────────────────────────────────
function FilterModal({
    isOpen, onClose,
    filterType, setFilterType,
    filterPeriod, setFilterPeriod
}: {
    isOpen: boolean
    onClose: () => void
    filterType: string
    setFilterType: (v: string) => void
    filterPeriod: FilterPeriod
    setFilterPeriod: (v: FilterPeriod) => void
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in sm:items-center sm:justify-center" onClick={onClose}>
            <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-md max-h-[80vh] flex flex-col sm:rounded-3xl p-5 mb-0 sm:mb-8 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">Bộ lọc chi phí</h3>
                    <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto pr-1">
                    {/* Period filters */}
                    <div>
                        <label className="mb-2.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">Thời gian</label>
                        <div className="flex flex-wrap gap-2">
                            {PERIOD_TABS.map(tab => (
                                <button key={tab.id} type="button"
                                    onClick={() => setFilterPeriod(tab.id)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${filterPeriod === tab.id
                                        ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}>
                                    {filterPeriod === tab.id && <Check className="h-3.5 w-3.5" />}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Type filters */}
                    <div>
                        <label className="mb-2.5 block text-xs font-bold text-slate-500 uppercase tracking-widest">Phân loại</label>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setFilterType('all')}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${filterType === 'all'
                                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                {filterType === 'all' && <Check className="h-3.5 w-3.5" />}
                                Tất cả
                            </button>
                            {Object.entries(EXPENSE_TYPES).map(([key, t]) => (
                                <button key={key} onClick={() => setFilterType(key)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${filterType === key
                                        ? `${t.bg} ${t.text} border-transparent ring-2 ring-current ring-opacity-20`
                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
                                    {filterType === key && <Check className="h-3.5 w-3.5" />}
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex gap-3 shrink-0">
                    <button onClick={() => { setFilterType('all'); setFilterPeriod('month'); }}
                        className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        Đặt lại bộ lọc
                    </button>
                    <button onClick={onClose}
                        className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
                        Xem kết quả
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Add Expense Modal ──────────────────────────────────────────────────────
function AddExpenseModal({ vehicle, onClose, onSuccess }: {
    vehicle: VehicleRecord
    onClose: () => void
    onSuccess: () => void
}) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
    const [form, setForm] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        expense_type: 'other' as keyof typeof EXPENSE_TYPES,
        amount: '',
        description: '',
        location: '',
        notes: '',
    })

    const selectedType = EXPENSE_TYPES[form.expense_type]

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) {
            showError('Vui lòng nhập số tiền hợp lệ')
            setIsNumberPadOpen(true)
            return
        }
        setLoading(true)
        try {
            await createExpense({
                vehicle_id: vehicle.id,
                expense_date: form.expense_date,
                expense_type: form.expense_type as any,
                amount: parseFloat(form.amount.replace(/\./g, '')),
                description: form.description || undefined,
                location: form.location || undefined,
                notes: form.notes || undefined,
            } as any)
            success('Đã thêm chi phí thành công!')
            onSuccess()
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Không thể lưu')
        } finally {
            setLoading(false)
        }
    }

    // Format tiền hiển thị
    const displayAmount = form.amount ? fmt(parseFloat(form.amount.replace(/\./g, ''))) : '0 ₫'

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
                <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl mt-12 sm:mt-0 safe-area-bottom overflow-hidden animate-in slide-in-from-bottom-full duration-300 border border-slate-100/50" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 relative">
                        {/* Mobile Handle */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

                        <div className="flex items-center justify-between mt-2">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Thêm chi phí xe</h3>
                            <button onClick={onClose} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 text-slate-500 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            {selectedType.label} • {vehicle.license_plate}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                        {/* Amount - READONLY with NumberPad */}
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Số tiền</label>
                            <button
                                type="button"
                                onClick={() => setIsNumberPadOpen(true)}
                                className={`w-full relative flex items-center justify-between rounded-2xl border-2 px-4 py-4 text-left transition-all ${!form.amount ? 'border-orange-300 bg-orange-50/50' : 'border-blue-500 bg-blue-50'}`}
                            >
                                <span className={`text-2xl font-black tracking-tight ${!form.amount ? 'text-orange-500' : 'text-blue-600'}`}>
                                    {displayAmount}
                                </span>
                                <div className={`flex items-center justify-center rounded-xl p-2 ${!form.amount ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <DollarSign className="h-5 w-5" />
                                </div>
                            </button>
                        </div>

                        {/* Expense type grid (Scrollable horizontally) */}
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Loại chi phí</label>
                            <div className="flex gap-2.5 overflow-x-auto pt-1 pb-2 scrollbar-hide -mx-5 px-5">
                                {Object.entries(EXPENSE_TYPES).map(([key, t]) => (
                                    <button key={key} onClick={() => setForm({ ...form, expense_type: key as any })}
                                        className={`shrink-0 flex items-center gap-1 rounded-2xl border px-3.5 py-2.5 transition-all ${form.expense_type === key
                                            ? `${t.bg} ${t.text} border-transparent shadow-md ring-2 ring-current ring-opacity-20`
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                        <div className={`w-2 h-2 rounded-full ${t.accentBar}`}></div>
                                        <span className="text-xs font-bold whitespace-nowrap">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Ngày phát sinh</label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="date" value={form.expense_date}
                                    onChange={e => setForm({ ...form, expense_date: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm font-semibold focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Description */}
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Mô tả</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        placeholder="Tên phí..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm font-medium focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Địa điểm</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.location}
                                        onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="Nơi trả..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm font-medium focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="mb-2 block text-xs font-bold text-slate-400 uppercase tracking-widest">Ghi chú thêm</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                rows={2} placeholder="Không bắt buộc..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none" />
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="bg-white border-t border-slate-100 p-4">
                        <button onClick={handleSubmit} disabled={loading || !form.amount}
                            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white shadow-xl transition-all shadow-blue-200 ${loading || !form.amount ? 'bg-slate-300 opacity-60 shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}>
                            {loading ? 'Đang lưu...' : <><Save className="h-5 w-5" /> Xác nhận lưu chi phí</>}
                        </button>
                    </div>
                </div>
            </div>

            <LoadingOverlay isOpen={loading} />

            <NumberPadModal
                isOpen={isNumberPadOpen}
                onClose={() => setIsNumberPadOpen(false)}
                value={form.amount ? form.amount.replace(/\./g, '') : ''}
                onChange={(val) => setForm(f => ({ ...f, amount: val }))}
                onConfirm={() => setIsNumberPadOpen(false)}
            />
        </>
    )
}
