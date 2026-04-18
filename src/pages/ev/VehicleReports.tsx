import { useState, useMemo } from 'react'
import {
    BarChart3,
    TrendingUp,
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
    Gauge
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
    Pie
} from 'recharts'
import { useVehicles, useVehicleStats, useVehicleMonthlyStats } from '../../lib/ev/useVehicleQueries'
import { useVehicleStore } from '../../store/useVehicleStore'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/ev/VehicleFooterNav'


const formatNumber = (value: number, decimals = 3) =>
    new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(value)

const compactFormat = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
    return value.toString()
}

export default function VehicleReports() {
    const { selectedVehicleId } = useVehicleStore()
    const { data: vehicles = [] } = useVehicles()
    
    // Fallback to default or first vehicle if none selected
    const effectiveId = selectedVehicleId || vehicles.find(v => v.is_default)?.id || vehicles[0]?.id || ''
    const selectedVehicle = vehicles.find(v => v.id === effectiveId)

    const [timeRange, setTimeRange] = useState<'6m' | '3m' | 'all'>('6m')
    const [statsPeriod, setStatsPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month')
    const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false)

    // Calculate date range for stats period
    const statsDateRange = useMemo(() => {
        const now = new Date()
        const start = new Date(now)
        const end = now.toISOString().split('T')[0]

        switch (statsPeriod) {
            case 'week':
                // Use Monday as start of week
                const day = now.getDay()
                const diff = now.getDate() - day + (day === 0 ? -6 : 1)
                start.setDate(diff)
                break
            case 'month':
                start.setDate(1)
                break
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3)
                start.setMonth(quarter * 3)
                start.setDate(1)
                break
            case 'year':
                start.setMonth(0)
                start.setDate(1)
                break
            case 'all':
                return { start: undefined, end: undefined }
        }
        
        start.setHours(0,0,0,0)
        return { 
            start: start.toISOString().split('T')[0], 
            end 
        }
    }, [statsPeriod])

    // Calculate PREVIOUS period date range for comparison
    const prevStatsDateRange = useMemo(() => {
        const now = new Date()
        const start = new Date(now)
        const end = new Date(now)

        switch (statsPeriod) {
            case 'week':
                // Move back 7 days
                const day = now.getDay()
                const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
                start.setDate(diff)
                end.setDate(diff + 6)
                break
            case 'month':
                // Last month
                start.setMonth(now.getMonth() - 1)
                start.setDate(1)
                end.setMonth(now.getMonth())
                end.setDate(0)
                break
            case 'quarter':
                // Last quarter
                const currentQuarter = Math.floor(now.getMonth() / 3)
                start.setMonth((currentQuarter - 1) * 3)
                start.setDate(1)
                end.setMonth(currentQuarter * 3)
                end.setDate(0)
                break
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
        
        start.setHours(0,0,0,0)
        end.setHours(23,59,59,999)
        return { 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0]
        }
    }, [statsPeriod])

    const { data: stats, isLoading: isLoadingStats } = useVehicleStats(
        effectiveId || undefined, 
        statsDateRange.start, 
        statsDateRange.end
    )

    const { data: prevStats } = useVehicleStats(
        effectiveId || undefined, 
        prevStatsDateRange.start, 
        prevStatsDateRange.end
    )

    const { data: monthlyStats = [], isLoading: isLoadingMonthly } = useVehicleMonthlyStats(
        effectiveId || undefined, 
        timeRange === 'all' ? 12 : timeRange === '3m' ? 3 : 6
    )

    const isElectric = selectedVehicle?.fuel_type === 'electric'

    // Calculate total and percentages for Pie Chart
    const pieData = useMemo(() => {
        if (!stats) return []
        return [
            { name: 'Sạc pin', value: stats.totalFuelCost, color: '#10b981', icon: <Zap className="h-4 w-4" /> },
            { name: 'Bảo dưỡng', value: stats.totalMaintenanceCost, color: '#f59e0b', icon: <Wrench className="h-4 w-4" /> },
            { name: 'Chi phí khác', value: stats.totalOtherExpenses, color: '#f43f5e', icon: <LayoutList className="h-4 w-4" /> },
        ].filter(item => item.value > 0)
    }, [stats])

    const totalCost = (stats?.totalFuelCost || 0) + (stats?.totalMaintenanceCost || 0) + (stats?.totalOtherExpenses || 0)
    const prevTotalCost = (prevStats?.totalFuelCost || 0) + (prevStats?.totalMaintenanceCost || 0) + (prevStats?.totalOtherExpenses || 0)

    const costDiffPct = useMemo(() => {
        if (!prevTotalCost || !totalCost) return 0
        return ((totalCost - prevTotalCost) / prevTotalCost) * 100
    }, [totalCost, prevTotalCost])

    if (!effectiveId && !isLoadingStats) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#F7F9FC] p-4 text-center">
                <div className="mb-6 rounded-full bg-slate-100 p-6">
                    <BarChart3 className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800">Chưa có dữ liệu báo cáo</h3>
                <p className="mt-2 text-sm text-slate-500">Vui lòng thêm phương tiện hoặc chọn một chiếc xe để xem báo cáo.</p>
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Báo cáo chi tiết" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-md mx-auto px-4 pb-28 pt-4">
                
                {/* ── Summary Hero Card ────────────────────────────────── */}
                <section className="mb-6">
                    <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-7 text-white shadow-2xl shadow-slate-900/20">
                        {/* Background Deco */}
                        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/20 blur-[80px]" />
                        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-600/10 blur-[80px]" />
                        
                        <div className="relative z-10">
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex items-center justify-between relative">
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng chi phí vận hành</p>
                                    
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                                            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 border border-white/20 backdrop-blur-md text-[10px] font-black uppercase text-white transition-all active:scale-95"
                                        >
                                            <Calendar className="h-3 w-3 text-blue-400" />
                                            {statsPeriod === 'week' ? 'Tuần' : statsPeriod === 'month' ? 'Tháng' : statsPeriod === 'quarter' ? 'Quý' : statsPeriod === 'year' ? 'Năm' : 'Tất cả'}
                                            <ChevronRight className={`h-3 w-3 text-white/40 transition-transform duration-300 ${isPeriodMenuOpen ? 'rotate-90' : ''}`} />
                                        </button>

                                        {isPeriodMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsPeriodMenuOpen(false)} />
                                                <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-2xl bg-slate-800 border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                                    {(['week', 'month', 'quarter', 'year', 'all'] as const).map(p => (
                                                        <button
                                                            key={p}
                                                            onClick={() => { setStatsPeriod(p); setIsPeriodMenuOpen(false); }}
                                                            className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-all flex items-center justify-between ${statsPeriod === p ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                                                        >
                                                            {p === 'week' ? 'Tuần này' : p === 'month' ? 'Tháng này' : p === 'quarter' ? 'Quý này' : p === 'year' ? 'Năm nay' : 'Tất cả'}
                                                            {statsPeriod === p && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <h2 className="text-4xl font-black tracking-tight">
                                    {isLoadingStats ? '---' : formatNumber(totalCost)}
                                    <span className="text-lg ml-1 font-bold opacity-50 uppercase">đ</span>
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-3xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400">
                                            <Gauge className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quãng đường</span>
                                    </div>
                                    <p className="text-xl font-black">{formatNumber(stats?.totalDistance || 0)} <span className="text-xs font-medium opacity-50">km</span></p>
                                </div>
                                <div className="rounded-3xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="rounded-lg bg-blue-500/20 p-1.5 text-blue-400">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phí / Km</span>
                                    </div>
                                    <p className="text-xl font-black">{formatNumber(stats?.costPerKm || 0)} <span className="text-xs font-medium opacity-50">đ</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Monthly Trend Chart ──────────────────────────────── */}
                <section className="mb-6 space-y-4">
                    <div className="flex items-center justify-between px-1">
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

                    <div className="rounded-[32px] bg-white p-5 shadow-sm border border-slate-100">
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
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="month" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                            tickFormatter={(val) => compactFormat(val)}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '16px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                                fontWeight: 800,
                                                fontSize: '12px'
                                            }}
                                            formatter={(value: any) => [formatNumber(value), 'Tổng']}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="total" 
                                            stroke="#3b82f6" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorTotal)" 
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center flex-col text-slate-300 gap-2">
                                    <Info className="h-8 w-8" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Không có dữ liệu lịch sử</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Category Breakdown ────────────────────────────────── */}
                <section className="mb-6">
                    <div className="mb-4 px-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Phân loại chi phí</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-[32px] bg-white p-6 shadow-sm border border-slate-100 flex items-center gap-8">
                            <div className="h-[120px] w-[120px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={55}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <div className="flex-1 space-y-3">
                                {pieData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-xs font-bold text-slate-600 truncate">{item.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">
                                            {totalCost > 0 ? Math.round((item.value / totalCost) * 100) : 0}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* List Breakdown Card */}
                        <div className="rounded-[32px] bg-white p-2 shadow-sm border border-slate-100">
                            {[
                                { label: 'Sạc pin & Nhiên liệu', value: stats?.totalFuelCost || 0, icon: <Zap />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { label: 'Bảo dưỡng & Sửa chữa', value: stats?.totalMaintenanceCost || 0, icon: <Wrench />, color: 'text-amber-500', bg: 'bg-amber-50' },
                                { label: 'Phí cố định & Khác', value: stats?.totalOtherExpenses || 0, icon: <LayoutList />, color: 'text-rose-500', bg: 'bg-rose-50' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-[24px] ${i !== 2 ? 'border-b border-slate-50' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{item.label}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {totalCost > 0 ? ((item.value / totalCost) * 100).toFixed(1) : 0}% của tổng chi phí
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{formatNumber(item.value)} đ</p>
                                        <button className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 ml-auto mt-0.5">
                                            Chi tiết <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Efficiency Stats ───────────────────────────────────── */}
                <section className="mb-6">
                    <div className="mb-4 px-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hiệu suất vận hành</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-[32px] bg-white p-5 border border-slate-100 shadow-sm">
                            <div className="mb-4 h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Route className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số lộ trình</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900">{formatNumber(stats?.totalTrips || 0)}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Chuyến</span>
                            </div>
                        </div>

                        <div className="rounded-[32px] bg-white p-5 border border-slate-100 shadow-sm">
                            <div className="mb-4 h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Zap className="h-5 w-5" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiêu thụ TB</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900">
                                    {formatNumber(stats?.averageFuelConsumption || 0, 1)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{isElectric ? 'kWh/100km' : 'L/100km'}</span>
                            </div>
                        </div>
                        
                        <div className="col-span-2 rounded-[32px] bg-white p-6 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">So sánh & Dự báo</p>
                                        <p className="text-xs text-slate-400">So với {
                                            statsPeriod === 'week' ? 'tuần trước' : 
                                            statsPeriod === 'month' ? 'tháng trước' : 
                                            statsPeriod === 'quarter' ? 'quý trước' : 
                                            'năm ngoái'
                                        }</p>
                                    </div>
                                </div>
                                <button className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                                    <Settings className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dự báo chi phí năm</p>
                                    <p className="text-2xl font-black text-blue-600">
                                        {formatNumber(
                                            statsPeriod === 'week' ? totalCost * 52 :
                                            statsPeriod === 'month' ? totalCost * 12 :
                                            statsPeriod === 'quarter' ? totalCost * 4 :
                                            totalCost
                                        )}
                                        <span className="text-sm ml-1 font-bold opacity-70 uppercase text-slate-400">đ</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`flex items-center justify-end gap-1 text-sm font-black ${costDiffPct > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {costDiffPct > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        {Math.abs(costDiffPct).toFixed(1)}%
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {costDiffPct > 0 ? 'Tăng so với kỳ trước' : 'Giảm so với kỳ trước'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-20" />
            </main>

            <VehicleFooterNav isElectricVehicle={isElectric} />
        </div>
    )
}
