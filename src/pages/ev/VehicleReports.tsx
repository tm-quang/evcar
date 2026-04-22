import { useState, useMemo } from 'react'
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Zap,
    Wrench,
    Calendar,
    Settings,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Info,
    LayoutList,
    Route,
    Gauge,
    BatteryCharging,
    Timer,
    MapPin,
    DollarSign,
    Activity,
} from 'lucide-react'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
    PieChart,
    Pie,
    BarChart,
    Bar,
    Legend,
} from 'recharts'
import { useVehicles, useVehicleStats, useVehicleMonthlyStats } from '../../lib/ev/useVehicleQueries'
import { useVehicleStore } from '../../store/useVehicleStore'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/ev/VehicleFooterNav'


const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(value)

const compactFormat = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
}

// ── Diff badge component ────────────────────────────────────────────────────
function DiffBadge({ diff, inverse = false, small = false }: { diff: number; inverse?: boolean; small?: boolean }) {
    if (diff === 0) return <span className={`${small ? 'text-[9px]' : 'text-[10px]'} font-black text-slate-400`}>–</span>
    const isPositive = diff > 0
    // For costs, inverse=true means up is bad (red), down is good (green)
    const isGood = inverse ? !isPositive : isPositive
    return (
        <span className={`inline-flex items-center gap-0.5 ${small ? 'text-[9px] px-1 py-0' : 'text-[10px] px-1.5 py-0.5'} font-black rounded-full ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {isPositive ? <ArrowUpRight className={`${small ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /> : <ArrowDownRight className={`${small ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} />}
            {Math.abs(diff).toFixed(1)}%
        </span>
    )
}

// ── Side-by-side comparison row ─────────────────────────────────────────────
function CompareRow({
    label,
    curr,
    prev,
    currLabel,
    prevLabel,
    suffix = '',
    decimals = 0,
    inverse = false,
    highlight = false,
}: {
    label: string
    curr: number
    prev: number
    currLabel: string
    prevLabel: string
    suffix?: string
    decimals?: number
    inverse?: boolean
    highlight?: boolean
}) {
    const diff = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0
    return (
        <div className={`grid grid-cols-[1fr_1px_1fr] gap-0 ${highlight ? 'bg-blue-50/50 rounded-2xl' : ''}`}>
            <div className="p-3 text-right">
                <p className="text-[11px] font-black text-slate-800 leading-tight">
                    {formatNumber(curr, decimals)}{suffix}
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{currLabel}</p>
            </div>
            <div className="bg-slate-100 my-2" />
            <div className="p-3 text-left">
                <p className="text-[11px] font-black text-slate-500 leading-tight">
                    {formatNumber(prev, decimals)}{suffix}
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{prevLabel}</p>
            </div>
            {/* Label row spans under */}
            <div className="col-span-3 px-3 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">{label}</span>
                <DiffBadge diff={diff} inverse={inverse} small />
            </div>
        </div>
    )
}


export default function VehicleReports() {
    const { selectedVehicleId } = useVehicleStore()
    const { data: vehicles = [] } = useVehicles()

    const effectiveId = selectedVehicleId || vehicles.find(v => v.is_default)?.id || vehicles[0]?.id || ''
    const selectedVehicle = vehicles.find(v => v.id === effectiveId)

    const [timeRange, setTimeRange] = useState<'6m' | '3m' | 'all'>('6m')
    const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month')
    const [comparisonMode, setComparisonMode] = useState<'previous' | 'same_period'>('previous')
    const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'trend'>('overview')

    // ── Date range for current period ────────────────────────────────────────
    const statsDateRange = useMemo(() => {
        const now = new Date()
        const start = new Date(now)
        const end = now.toISOString().split('T')[0]

        switch (statsPeriod) {
            case 'day':
                start.setHours(0, 0, 0, 0)
                break
            case 'week': {
                const d = now.getDay()
                start.setDate(now.getDate() - d + (d === 0 ? -6 : 1))
                break
            }
            case 'month':
                start.setDate(1)
                break
            case 'quarter': {
                const q = Math.floor(now.getMonth() / 3)
                start.setMonth(q * 3)
                start.setDate(1)
                break
            }
            case 'year':
                start.setMonth(0)
                start.setDate(1)
                break
            case 'all':
                return { start: undefined, end: undefined }
        }
        start.setHours(0, 0, 0, 0)
        return { start: start.toISOString().split('T')[0], end }
    }, [statsPeriod])

    // ── Date range for comparison period ────────────────────────────────────
    const prevStatsDateRange = useMemo(() => {
        const now = new Date()
        const start = new Date(now)
        const end = new Date(now)

        if (comparisonMode === 'previous') {
            switch (statsPeriod) {
                case 'day':
                    start.setDate(now.getDate() - 1)
                    end.setDate(now.getDate() - 1)
                    break
                case 'week': {
                    const d = now.getDay()
                    const diff = now.getDate() - d + (d === 0 ? -6 : 1) - 7
                    start.setDate(diff)
                    end.setDate(diff + 6)
                    break
                }
                case 'month':
                    start.setMonth(now.getMonth() - 1)
                    start.setDate(1)
                    end.setMonth(now.getMonth())
                    end.setDate(0)
                    break
                case 'quarter': {
                    const cq = Math.floor(now.getMonth() / 3)
                    start.setMonth((cq - 1) * 3)
                    start.setDate(1)
                    end.setMonth(cq * 3)
                    end.setDate(0)
                    break
                }
                case 'year':
                    start.setFullYear(now.getFullYear() - 1)
                    start.setMonth(0)
                    start.setDate(1)
                    end.setFullYear(now.getFullYear() - 1)
                    end.setMonth(11)
                    end.setDate(31)
                    break
                case 'all':
                    return { start: undefined, end: undefined }
            }
        } else {
            switch (statsPeriod) {
                case 'day':
                    start.setFullYear(now.getFullYear() - 1)
                    end.setFullYear(now.getFullYear() - 1)
                    break
                case 'week': {
                    start.setFullYear(now.getFullYear() - 1)
                    const dW = now.getDay()
                    const diffW = now.getDate() - dW + (dW === 0 ? -6 : 1)
                    start.setDate(diffW)
                    end.setFullYear(now.getFullYear() - 1)
                    end.setDate(diffW + 6)
                    break
                }
                case 'month':
                    start.setFullYear(now.getFullYear() - 1)
                    start.setDate(1)
                    end.setFullYear(now.getFullYear() - 1)
                    end.setMonth(now.getMonth() + 1)
                    end.setDate(0)
                    break
                case 'quarter': {
                    const q = Math.floor(now.getMonth() / 3)
                    start.setFullYear(now.getFullYear() - 1)
                    start.setMonth(q * 3)
                    start.setDate(1)
                    end.setFullYear(now.getFullYear() - 1)
                    end.setMonth((q + 1) * 3)
                    end.setDate(0)
                    break
                }
                case 'year':
                    start.setFullYear(now.getFullYear() - 2)
                    start.setMonth(0)
                    start.setDate(1)
                    end.setFullYear(now.getFullYear() - 2)
                    end.setMonth(11)
                    end.setDate(31)
                    break
                case 'all':
                    return { start: undefined, end: undefined }
            }
        }

        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        }
    }, [statsPeriod, comparisonMode])

    const { data: stats, isLoading: isLoadingStats } = useVehicleStats(
        effectiveId || undefined,
        statsDateRange.start,
        statsDateRange.end
    )

    const { data: prevStats, isLoading: isLoadingPrev } = useVehicleStats(
        effectiveId || undefined,
        prevStatsDateRange.start,
        prevStatsDateRange.end
    )

    const { data: monthlyStats = [], isLoading: isLoadingMonthly } = useVehicleMonthlyStats(
        effectiveId || undefined,
        timeRange === 'all' ? 12 : timeRange === '3m' ? 3 : 6
    )

    const isElectric = selectedVehicle?.fuel_type === 'electric'

    const totalCost = (stats?.totalFuelCost || 0) + (stats?.totalMaintenanceCost || 0) + (stats?.totalOtherExpenses || 0)
    const prevTotalCost = (prevStats?.totalFuelCost || 0) + (prevStats?.totalMaintenanceCost || 0) + (prevStats?.totalOtherExpenses || 0)

    const calcDiff = (curr: number, prev: number) => {
        if (!prev) return curr > 0 ? 100 : 0
        return ((curr - prev) / prev) * 100
    }

    const diff = useMemo(() => ({
        cost: calcDiff(totalCost, prevTotalCost),
        distance: calcDiff(stats?.totalDistance || 0, prevStats?.totalDistance || 0),
        costPerKm: calcDiff(stats?.costPerKm || 0, prevStats?.costPerKm || 0),
        consumption: calcDiff(stats?.averageFuelConsumption || 0, prevStats?.averageFuelConsumption || 0),
        fuel: calcDiff(stats?.totalFuelCost || 0, prevStats?.totalFuelCost || 0),
        maintenance: calcDiff(stats?.totalMaintenanceCost || 0, prevStats?.totalMaintenanceCost || 0),
        other: calcDiff(stats?.totalOtherExpenses || 0, prevStats?.totalOtherExpenses || 0),
        trips: calcDiff(stats?.totalTrips || 0, prevStats?.totalTrips || 0),
        kwh: calcDiff(stats?.totalKwh || 0, prevStats?.totalKwh || 0),
        sessions: calcDiff(stats?.totalChargeSessions || 0, prevStats?.totalChargeSessions || 0),
        avgKwh: calcDiff(stats?.avgKwhPerSession || 0, prevStats?.avgKwhPerSession || 0),
        avgSession: calcDiff(stats?.avgCostPerSession || 0, prevStats?.avgCostPerSession || 0),
        avgTrip: calcDiff(stats?.avgTripDistance || 0, prevStats?.avgTripDistance || 0),
        longestTrip: calcDiff(stats?.longestTrip || 0, prevStats?.longestTrip || 0),
    }), [stats, prevStats, totalCost, prevTotalCost])

    const pieData = useMemo(() => {
        if (!stats) return []
        return [
            { name: 'Sạc pin', value: stats.totalFuelCost, color: '#10b981' },
            { name: 'Bảo dưỡng', value: stats.totalMaintenanceCost, color: '#f59e0b' },
            { name: 'Chi phí khác', value: stats.totalOtherExpenses, color: '#f43f5e' },
        ].filter(item => item.value > 0)
    }, [stats])

    // Bar chart data for comparison
    const comparisonBarData = useMemo(() => [
        {
            name: 'Sạc điện',
            curr: stats?.totalFuelCost || 0,
            prev: prevStats?.totalFuelCost || 0,
        },
        {
            name: 'Bảo dưỡng',
            curr: stats?.totalMaintenanceCost || 0,
            prev: prevStats?.totalMaintenanceCost || 0,
        },
        {
            name: 'Khác',
            curr: stats?.totalOtherExpenses || 0,
            prev: prevStats?.totalOtherExpenses || 0,
        },
    ], [stats, prevStats])

    const periodLabel = {
        day: statsPeriod === 'day' ? 'Hôm nay' : '',
        week: 'Tuần này',
        month: 'Tháng này',
        quarter: 'Quý này',
        year: 'Năm nay',
        all: 'Tất cả',
    }[statsPeriod]

    const compPeriodLabel = comparisonMode === 'previous'
        ? { day: 'Hôm qua', week: 'Tuần trước', month: 'Tháng trước', quarter: 'Quý trước', year: 'Năm ngoái', all: 'Kỳ trước' }[statsPeriod]
        : { day: 'Cùng ngày NNT', week: 'Cùng tuần NNT', month: 'Cùng tháng NNT', quarter: 'Cùng quý NNT', year: '2 năm trước', all: 'Cùng kỳ NNT' }[statsPeriod]

    if (!effectiveId && !isLoadingStats) {
        return (
            <div className="flex h-screen flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: 'var(--app-home-bg)' }}>
                <div className="mb-6 rounded-full bg-slate-100 p-6">
                    <BarChart3 className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800">Chưa có dữ liệu báo cáo</h3>
                <p className="mt-2 text-sm text-slate-500">Vui lòng thêm phương tiện hoặc chọn một chiếc xe để xem báo cáo.</p>
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: 'var(--app-home-bg)' }}>
            <HeaderBar variant="page" title="Báo cáo chi tiết" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-md mx-auto px-4 pb-28 pt-4">

                {/* ── Summary Hero Card ──────────────────────────────────────────── */}
                <section className="mb-5">
                    <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-7 text-white shadow-2xl shadow-slate-900/20">
                        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/20 blur-[80px]" />
                        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-600/10 blur-[80px]" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-5">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng chi phí vận hành</p>

                                {/* Period selector */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 border border-white/20 backdrop-blur-md text-[10px] font-black uppercase text-white transition-all active:scale-95"
                                    >
                                        <Calendar className="h-3 w-3 text-blue-400" />
                                        {statsPeriod === 'day' ? 'Ngày' : statsPeriod === 'week' ? 'Tuần' : statsPeriod === 'month' ? 'Tháng' : statsPeriod === 'quarter' ? 'Quý' : statsPeriod === 'year' ? 'Năm' : 'Tất cả'}
                                        <ChevronRight className={`h-3 w-3 text-white/40 transition-transform duration-300 ${isPeriodMenuOpen ? 'rotate-90' : ''}`} />
                                    </button>

                                    {isPeriodMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsPeriodMenuOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl bg-slate-800 border border-white/10 shadow-2xl z-50">
                                                {(['day', 'week', 'month', 'quarter', 'year', 'all'] as const).map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => { setStatsPeriod(p); setIsPeriodMenuOpen(false) }}
                                                        className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-all flex items-center justify-between ${statsPeriod === p ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                                                    >
                                                        {p === 'day' ? 'Hôm nay' : p === 'week' ? 'Tuần này' : p === 'month' ? 'Tháng này' : p === 'quarter' ? 'Quý này' : p === 'year' ? 'Năm nay' : 'Tất cả'}
                                                        {statsPeriod === p && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-4xl font-black tracking-tight mb-1">
                                {isLoadingStats ? '---' : formatNumber(totalCost)}
                                <span className="text-lg ml-1 font-bold opacity-50 uppercase">VNĐ</span>
                            </h2>

                            {/* Quick diff summary */}
                            <div className={`inline-flex items-center gap-1 text-sm font-black mb-5 ${diff.cost > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {diff.cost > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                {Math.abs(diff.cost).toFixed(1)}%
                                <span className="text-[10px] font-bold text-slate-400 ml-1 normal-case">
                                    {diff.cost > 0 ? 'tăng' : 'giảm'} so với {compPeriodLabel}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Distance */}
                                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="rounded-md bg-emerald-500/20 p-1 text-emerald-400">
                                                <Gauge className="h-3 w-3" />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Quãng đường</span>
                                        </div>
                                        <DiffBadge diff={diff.distance} small />
                                    </div>
                                    <p className="text-base font-black">{formatNumber(stats?.totalDistance || 0, 1)} <span className="text-[10px] font-medium opacity-50">km</span></p>
                                </div>
                                {/* Cost/km */}
                                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="rounded-md bg-blue-500/20 p-1 text-blue-400">
                                                <TrendingUp className="h-3 w-3" />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Chi phí/Km</span>
                                        </div>
                                        <DiffBadge diff={diff.costPerKm} inverse small />
                                    </div>
                                    <p className="text-base font-black">{formatNumber(stats?.costPerKm || 0, 0)} <span className="text-[10px] font-medium opacity-50">đ</span></p>
                                </div>
                                {/* kWh (EV) */}
                                {isElectric && (
                                    <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="rounded-md bg-yellow-500/20 p-1 text-yellow-400">
                                                    <BatteryCharging className="h-3 w-3" />
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Tổng kWh</span>
                                            </div>
                                            <DiffBadge diff={diff.kwh} inverse small />
                                        </div>
                                        <p className="text-base font-black">{formatNumber(stats?.totalKwh || 0, 1)} <span className="text-[10px] font-medium opacity-50">kWh</span></p>
                                    </div>
                                )}
                                {/* Trips */}
                                <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="rounded-md bg-violet-500/20 p-1 text-violet-400">
                                                <Route className="h-3 w-3" />
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Chuyến đi</span>
                                        </div>
                                        <DiffBadge diff={diff.trips} small />
                                    </div>
                                    <p className="text-base font-black">{formatNumber(stats?.totalTrips || 0)} <span className="text-[10px] font-medium opacity-50">chuyến</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Tab Navigator ──────────────────────────────────────────────── */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5">
                    {([
                        { key: 'overview', label: 'Tổng quan' },
                        { key: 'comparison', label: 'So sánh' },
                        { key: 'trend', label: 'Xu hướng' },
                    ] as const).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>


                {/* ══════════════════════════════════════════════════════════════ */}
                {/* TAB: OVERVIEW                                                  */}
                {/* ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'overview' && (
                    <>
                        {/* Category Breakdown */}
                        <section className="mb-5">
                            <div className="mb-3 px-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Phân loại chi phí</h3>
                            </div>
                            <div className="rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 flex items-center gap-6 mb-3">
                                <div className="h-[110px] w-[110px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={8} dataKey="value" stroke="none">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 space-y-2.5">
                                    {pieData.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-xs font-bold text-slate-600">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-900">
                                                {totalCost > 0 ? Math.round((item.value / totalCost) * 100) : 0}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[32px] bg-white p-2 shadow-sm border border-slate-100">
                                {[
                                    { label: 'Sạc pin & Nhiên liệu', value: stats?.totalFuelCost || 0, icon: <Zap />, color: 'text-emerald-500', bg: 'bg-emerald-50', d: diff.fuel },
                                    { label: 'Bảo dưỡng & Sửa chữa', value: stats?.totalMaintenanceCost || 0, icon: <Wrench />, color: 'text-amber-500', bg: 'bg-amber-50', d: diff.maintenance },
                                    { label: 'Phí cố định & Khác', value: stats?.totalOtherExpenses || 0, icon: <LayoutList />, color: 'text-rose-500', bg: 'bg-rose-50', d: diff.other },
                                ].map((item, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-[24px] ${i !== 2 ? 'border-b border-slate-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-11 w-11 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                                                {item.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <p className="text-sm font-black text-slate-800">{item.label}</p>
                                                    <DiffBadge diff={item.d} inverse small />
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {totalCost > 0 ? ((item.value / totalCost) * 100).toFixed(1) : 0}% tổng chi phí
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 text-right">{formatNumber(item.value)} đ</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Efficiency */}
                        <section className="mb-5">
                            <div className="mb-3 px-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hiệu suất vận hành</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Số chuyến đi', value: stats?.totalTrips || 0, unit: 'chuyến', icon: <Route className="h-5 w-5" />, bg: 'bg-indigo-50', color: 'text-indigo-600', d: diff.trips, inv: false },
                                    { label: isElectric ? 'Tiêu thụ điện' : 'Tiêu thụ TB', value: stats?.averageFuelConsumption || 0, unit: isElectric ? 'kWh/100km' : 'L/100km', icon: <Zap className="h-5 w-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600', d: diff.consumption, inv: true },
                                    { label: 'Chuyến dài nhất', value: stats?.longestTrip || 0, unit: 'km', icon: <MapPin className="h-5 w-5" />, bg: 'bg-sky-50', color: 'text-sky-600', d: diff.longestTrip, inv: false },
                                    { label: 'TB/chuyến', value: stats?.avgTripDistance || 0, unit: 'km', icon: <Route className="h-5 w-5" />, bg: 'bg-violet-50', color: 'text-violet-600', d: diff.avgTrip, inv: false },
                                ].map((card, i) => (
                                    <div key={i} className="rounded-[28px] bg-white p-4 border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`h-9 w-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                                                {card.icon}
                                            </div>
                                            <DiffBadge diff={card.d} inverse={card.inv} small />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-slate-900">{formatNumber(card.value, 1)}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{card.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* EV Charging stats */}
                        {isElectric && (
                            <section className="mb-5">
                                <div className="mb-3 px-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Thông số sạc điện</h3>
                                </div>
                                <div className="rounded-[32px] bg-white p-5 shadow-sm border border-slate-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Số lần sạc', value: stats?.totalChargeSessions || 0, unit: 'lần', d: diff.sessions, inv: false, icon: <BatteryCharging className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                            { label: 'Tổng điện tiêu thụ', value: stats?.totalKwh || 0, unit: 'kWh', d: diff.kwh, inv: true, icon: <Zap className="h-4 w-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                            { label: 'kWh TB/lần', value: stats?.avgKwhPerSession || 0, unit: 'kWh', d: diff.avgKwh, inv: true, icon: <Activity className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
                                            { label: 'Chi phí TB/lần', value: stats?.avgCostPerSession || 0, unit: 'đ', d: diff.avgSession, inv: true, icon: <DollarSign className="h-4 w-4" />, color: 'text-rose-600', bg: 'bg-rose-50' },
                                        ].map((item, i) => (
                                            <div key={i} className={`p-3 rounded-2xl ${item.bg}/50 border border-slate-100`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={`h-7 w-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center`}>{item.icon}</div>
                                                    <DiffBadge diff={item.d} inverse={item.inv} small />
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-0.5">{item.label}</p>
                                                <p className="text-base font-black text-slate-900">{formatNumber(item.value, 1)} <span className="text-[9px] font-medium text-slate-400">{item.unit}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                    {(stats?.avgChargeMinutes || 0) > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                                    <Timer className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase">Thời gian sạc TB</p>
                                                    <p className="text-sm font-black text-slate-900">{Math.round(stats?.avgChargeMinutes || 0)} phút / lần</p>
                                                </div>
                                            </div>
                                            <DiffBadge diff={calcDiff(stats?.avgChargeMinutes || 0, prevStats?.avgChargeMinutes || 0)} inverse small />
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Annual forecast */}
                        <section className="mb-5">
                            <div className="rounded-[32px] bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-xl shadow-blue-500/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black">Dự báo chi phí cả năm</p>
                                        <p className="text-[10px] text-blue-200 font-bold">Dựa trên {periodLabel?.toLowerCase()}</p>
                                    </div>
                                </div>
                                <p className="text-3xl font-black mb-1">
                                    {formatNumber(
                                        statsPeriod === 'day' ? totalCost * 365 :
                                            statsPeriod === 'week' ? totalCost * 52 :
                                                statsPeriod === 'month' ? totalCost * 12 :
                                                    statsPeriod === 'quarter' ? totalCost * 4 :
                                                        totalCost
                                    )}
                                    <span className="text-base ml-1 font-bold opacity-70">đ</span>
                                </p>
                                <div className={`inline-flex items-center gap-1 text-sm font-black ${diff.cost > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                                    {diff.cost > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {Math.abs(diff.cost).toFixed(1)}% {diff.cost > 0 ? 'tăng' : 'giảm'} so với {compPeriodLabel}
                                </div>
                            </div>
                        </section>
                    </>
                )}


                {/* ══════════════════════════════════════════════════════════════ */}
                {/* TAB: COMPARISON                                                */}
                {/* ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'comparison' && (
                    <>
                        {/* Comparison mode selector */}
                        <div className="rounded-[28px] bg-white p-4 shadow-sm border border-slate-100 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Settings className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm font-black text-slate-800">Chế độ so sánh</p>
                                </div>
                                {(isLoadingStats || isLoadingPrev) && (
                                    <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setComparisonMode('previous')}
                                    className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase text-center transition-all ${comparisonMode === 'previous' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Kỳ liền trước
                                </button>
                                <button
                                    onClick={() => setComparisonMode('same_period')}
                                    className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase text-center transition-all ${comparisonMode === 'same_period' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Cùng kỳ NNT
                                </button>
                            </div>
                        </div>

                        {/* Bar chart comparison */}
                        <div className="rounded-[32px] bg-white p-5 shadow-sm border border-slate-100 mb-4">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Biểu đồ so sánh chi phí</p>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonBarData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={compactFormat} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 800 }}
                                            formatter={(v: any, name?: string) => [formatNumber(v) + ' đ', name === 'curr' ? periodLabel : compPeriodLabel] as [string, string]}
                                        />
                                        <Legend formatter={(v) => v === 'curr' ? periodLabel : compPeriodLabel} wrapperStyle={{ fontSize: '10px', fontWeight: 800 }} />
                                        <Bar dataKey="curr" name="curr" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="prev" name="prev" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Side-by-side detail table */}
                        <div className="rounded-[32px] bg-white shadow-sm border border-slate-100 mb-4 overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-[1fr_1px_1fr] bg-slate-50 border-b border-slate-100">
                                <div className="p-3 text-center">
                                    <p className="text-[10px] font-black uppercase text-blue-600">{periodLabel}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                        {statsDateRange.start ? `${statsDateRange.start} → ${statsDateRange.end}` : 'Tất cả'}
                                    </p>
                                </div>
                                <div className="bg-slate-200" />
                                <div className="p-3 text-center">
                                    <p className="text-[10px] font-black uppercase text-slate-500">{compPeriodLabel}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                        {prevStatsDateRange.start ? `${prevStatsDateRange.start} → ${prevStatsDateRange.end}` : 'Tất cả'}
                                    </p>
                                </div>
                            </div>

                            {/* Section: Chi phí */}
                            <div className="px-4 pt-4 pb-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">💰 Chi phí</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                <CompareRow label="Tổng chi phí" curr={totalCost} prev={prevTotalCost} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ" decimals={0} inverse highlight />
                                <CompareRow label="Sạc điện / Nhiên liệu" curr={stats?.totalFuelCost || 0} prev={prevStats?.totalFuelCost || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ" decimals={0} inverse />
                                <CompareRow label="Bảo dưỡng & Sửa chữa" curr={stats?.totalMaintenanceCost || 0} prev={prevStats?.totalMaintenanceCost || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ" decimals={0} inverse />
                                <CompareRow label="Phí cố định & Khác" curr={stats?.totalOtherExpenses || 0} prev={prevStats?.totalOtherExpenses || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ" decimals={0} inverse />
                                <CompareRow label="Chi phí trên km" curr={stats?.costPerKm || 0} prev={prevStats?.costPerKm || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ/km" decimals={0} inverse />
                            </div>

                            {/* Section: Vận hành */}
                            <div className="px-4 pt-4 pb-1 border-t border-slate-100 mt-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">🚗 Lộ trình & Quãng đường</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                <CompareRow label="Số chuyến đi" curr={stats?.totalTrips || 0} prev={prevStats?.totalTrips || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" chuyến" />
                                <CompareRow label="Tổng quãng đường" curr={stats?.totalDistance || 0} prev={prevStats?.totalDistance || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" km" decimals={1} />
                                <CompareRow label="TB/chuyến" curr={stats?.avgTripDistance || 0} prev={prevStats?.avgTripDistance || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" km" decimals={1} />
                                <CompareRow label="Chuyến dài nhất" curr={stats?.longestTrip || 0} prev={prevStats?.longestTrip || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" km" decimals={1} />
                            </div>

                            {/* Section: Sạc điện (chỉ hiện nếu EV) */}
                            {isElectric && (
                                <>
                                    <div className="px-4 pt-4 pb-1 border-t border-slate-100 mt-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">⚡ Sạc điện</p>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        <CompareRow label="Số lần sạc" curr={stats?.totalChargeSessions || 0} prev={prevStats?.totalChargeSessions || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" lần" />
                                        <CompareRow label="Tổng kWh tiêu thụ" curr={stats?.totalKwh || 0} prev={prevStats?.totalKwh || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" kWh" decimals={1} inverse />
                                        <CompareRow label="kWh TB mỗi lần sạc" curr={stats?.avgKwhPerSession || 0} prev={prevStats?.avgKwhPerSession || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" kWh" decimals={1} inverse />
                                        <CompareRow label="Chi phí TB mỗi lần" curr={stats?.avgCostPerSession || 0} prev={prevStats?.avgCostPerSession || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" đ" decimals={0} inverse />
                                        <CompareRow label="Tiêu thụ kWh/100km" curr={stats?.averageFuelConsumption || 0} prev={prevStats?.averageFuelConsumption || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" kWh" decimals={2} inverse />
                                    </div>
                                </>
                            )}

                            {/* Section: Bảo dưỡng */}
                            <div className="px-4 pt-4 pb-1 border-t border-slate-100 mt-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">🔧 Bảo dưỡng & Chi phí khác</p>
                            </div>
                            <div className="divide-y divide-slate-50 mb-3">
                                <CompareRow label="Số lần bảo dưỡng" curr={stats?.totalMaintenanceCount || 0} prev={prevStats?.totalMaintenanceCount || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" lần" inverse />
                                <CompareRow label="Số phiên chi phí khác" curr={stats?.totalExpenseCount || 0} prev={prevStats?.totalExpenseCount || 0} currLabel={periodLabel || ''} prevLabel={compPeriodLabel || ''} suffix=" lần" inverse />
                            </div>
                        </div>
                    </>
                )}


                {/* ══════════════════════════════════════════════════════════════ */}
                {/* TAB: TREND                                                     */}
                {/* ══════════════════════════════════════════════════════════════ */}
                {activeTab === 'trend' && (
                    <>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Biến động chi phí</h3>
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                {(['3m', '6m', 'all'] as const).map(range => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${timeRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {range === 'all' ? '1 Năm' : range}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[32px] bg-white p-5 shadow-sm border border-slate-100 mb-4">
                            <div className="h-[240px] w-full">
                                {isLoadingMonthly ? (
                                    <div className="flex h-full items-center justify-center animate-pulse">
                                        <div className="h-32 w-full bg-slate-50 rounded-2xl" />
                                    </div>
                                ) : monthlyStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={compactFormat} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '11px' }}
                                                formatter={(value: any, name?: string) => [formatNumber(value) + ' đ', name === 'total' ? 'Tổng' : name === 'fuel' ? 'Sạc điện' : (name ?? '')] as [string, string]}
                                            />
                                            <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" animationDuration={1500} />
                                            <Area type="monotone" dataKey="fuel" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" fillOpacity={1} fill="url(#colorFuel)" animationDuration={1500} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center flex-col text-slate-300 gap-2">
                                        <Info className="h-8 w-8" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Không có dữ liệu lịch sử</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-3 justify-center">
                                <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded bg-blue-500" /><span className="text-[9px] font-bold text-slate-400">Tổng chi phí</span></div>
                                <div className="flex items-center gap-1.5"><div className="h-0.5 w-6 border-t-2 border-dashed border-emerald-500" /><span className="text-[9px] font-bold text-slate-400">Sạc điện</span></div>
                            </div>
                        </div>

                        {/* Monthly breakdown bar */}
                        {monthlyStats.length > 0 && (
                            <div className="rounded-[32px] bg-white p-5 shadow-sm border border-slate-100 mb-4">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Chi tiết từng tháng</p>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyStats} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={compactFormat} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }}
                                                formatter={(v: any, name?: string) => [formatNumber(v) + ' đ', name === 'fuel' ? 'Sạc điện' : name === 'maintenance' ? 'Bảo dưỡng' : 'Khác'] as [string, string]}
                                            />
                                            <Legend formatter={(v) => v === 'fuel' ? 'Sạc điện' : v === 'maintenance' ? 'Bảo dưỡng' : 'Khác'} wrapperStyle={{ fontSize: '9px', fontWeight: 800 }} />
                                            <Bar dataKey="fuel" name="fuel" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="maintenance" name="maintenance" fill="#f59e0b" stackId="a" />
                                            <Bar dataKey="expenses" name="expenses" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="h-20" />
            </main>

            <VehicleFooterNav isElectricVehicle={isElectric} />
        </div>
    )
}
