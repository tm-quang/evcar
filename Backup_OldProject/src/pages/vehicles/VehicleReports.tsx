import { useMemo } from 'react'
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
    TrendingUp, TrendingDown, Fuel, Wrench,
    Receipt, Navigation, Car, Bike, Zap,
    BatteryCharging, Minus, Award
} from 'lucide-react'
import {
    useVehicles, useVehicleTrips, useVehicleFuel,
    useVehicleMaintenance, useVehicleExpenses, vehicleKeys
} from '../../lib/vehicles/useVehicleQueries'
import { useQuery } from '@tanstack/react-query'
import { getMonthlyStats } from '../../lib/vehicles/vehicleService'
import type { TripRecord } from '../../lib/vehicles/vehicleService'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { useVehicleStore } from '../../store/useVehicleStore'

// ─── Meta helpers ─────────────────────────────────────────────────────────────
const META_RE = /^\[TRIPMETA:([^\]]+)\]\n?/
function parseMeta(notes?: string): Record<string, string> {
    if (!notes) return {}
    const m = notes.match(META_RE)
    if (!m) return {}
    return Object.fromEntries(m[1].split(',').map(e => {
        const i = e.indexOf('='); return [e.slice(0, i), e.slice(i + 1)]
    }))
}
function isInProgress(trip: TripRecord) { return parseMeta(trip.notes).status === 'in_progress' }

const fmt = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
const fmtK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(Math.round(v))

const TRIP_TYPE_LABELS: Record<string, string> = {
    work: 'Đi làm', business: 'Công tác', service: 'Dịch vụ',
    leisure: 'Đi chơi', hometown: 'Về quê', other: 'Khác',
}
const TRIP_TYPE_COLORS: Record<string, string> = {
    work: '#3b82f6', business: '#8b5cf6', service: '#14b8a6',
    leisure: '#22c55e', hometown: '#f97316', other: '#94a3b8',
}
const EXPENSE_TYPE_LABELS: Record<string, string> = {
    toll: 'Phí cầu đường', parking: 'Đỗ xe', insurance: 'Bảo hiểm',
    inspection: 'Đăng kiểm', wash: 'Rửa xe', fine: 'Phạt', other: 'Khác',
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function CurrencyTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl bg-white shadow-xl border border-slate-100 px-3 py-2.5 min-w-[140px]">
            <p className="text-xs font-bold text-slate-600 mb-1.5">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        {p.name}
                    </span>
                    <span className="font-bold" style={{ color: p.color }}>{fmtK(p.value)}đ</span>
                </div>
            ))}
        </div>
    )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, trend }: {
    icon: React.ElementType; label: string; value: string; sub?: string
    color: string; trend?: 'up' | 'down' | 'flat'
}) {
    return (
        <div className="flex flex-col gap-2 rounded-2xl bg-white border border-slate-100 shadow-md p-4">
            <div className="flex items-center justify-between">
                <div className={`rounded-xl p-2.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${trend === 'up' ? 'bg-red-50 text-red-600' : trend === 'down' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
                        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {trend === 'up' ? 'Tăng' : trend === 'down' ? 'Giảm' : 'Bình thường'}
                    </div>
                )}
            </div>
            <div>
                <p className="text-xl font-black text-slate-800 leading-tight">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-3 flex items-end justify-between">
            <div>
                <h3 className="text-base font-bold text-slate-800">{title}</h3>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VehicleReports() {
    const { data: vehicles = [] } = useVehicles()
    const { selectedVehicleId } = useVehicleStore()

    const effectiveId = selectedVehicleId || vehicles.find(v => v.is_default)?.id || vehicles[0]?.id

    const { data: trips = [] } = useVehicleTrips(effectiveId)
    const { data: fuelLogs = [] } = useVehicleFuel(effectiveId)
    const { data: maintenance = [] } = useVehicleMaintenance(effectiveId)
    const { data: expenses = [] } = useVehicleExpenses(effectiveId)
    const { data: monthly = [], isLoading: loadingMonthly } = useQuery({
        queryKey: [...vehicleKeys.stats(effectiveId || ''), 'monthly'],
        queryFn: () => getMonthlyStats(effectiveId!, 6),
        enabled: !!effectiveId,
    })

    const selectedVehicle = vehicles.find(v => v.id === effectiveId)
    const isElectric = selectedVehicle?.fuel_type === 'electric'
    const isMoto = selectedVehicle?.vehicle_type === 'motorcycle'

    // ── Computed stats ─────────────────────────────────────────────────────────
    const completedTrips = useMemo(() => trips.filter(t => !isInProgress(t)), [trips])

    const totalDist = useMemo(() => completedTrips.reduce((s, t) => s + (t.distance_km || 0), 0), [completedTrips])
    const totalFuel = useMemo(() => fuelLogs.reduce((s, l) => s + (l.total_amount || 0), 0), [fuelLogs])
    const totalMaint = useMemo(() => maintenance.reduce((s, m) => s + (m.total_cost || 0), 0), [maintenance])
    const totalExp = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
    const totalCost = totalFuel + totalMaint + totalExp
    const costPerKm = totalDist > 0 ? totalCost / totalDist : 0
    const totalLiters = useMemo(() => fuelLogs.reduce((s, l) => s + (l.liters || 0), 0), [fuelLogs])
    const avgConsumption = totalDist > 0 && totalLiters > 0 ? (totalLiters / totalDist) * 100 : 0

    // ── Trip type breakdown ────────────────────────────────────────────────────
    const tripTypeData = useMemo(() => {
        const map: Record<string, number> = {}
        completedTrips.forEach(t => { map[t.trip_type] = (map[t.trip_type] || 0) + 1 })
        return Object.entries(map)
            .map(([key, count]) => ({
                name: TRIP_TYPE_LABELS[key] || key,
                value: count,
                color: TRIP_TYPE_COLORS[key] || '#94a3b8',
                pct: completedTrips.length > 0 ? Math.round((count / completedTrips.length) * 100) : 0,
            }))
            .sort((a, b) => b.value - a.value)
    }, [completedTrips])

    // ── Expense type breakdown ─────────────────────────────────────────────────
    const expenseTypeData = useMemo(() => {
        const map: Record<string, number> = {}
        expenses.forEach(e => { map[e.expense_type] = (map[e.expense_type] || 0) + e.amount })
        return Object.entries(map)
            .map(([key, amt]) => ({ name: EXPENSE_TYPE_LABELS[key] || key, value: amt }))
            .sort((a, b) => b.value - a.value)
    }, [expenses])

    // ── Compare last 2 months ──────────────────────────────────────────────────
    const [curMonth, prevMonth] = monthly.slice(-2).reverse()
    const monthTrend = curMonth && prevMonth
        ? curMonth.total > prevMonth.total ? 'up' : curMonth.total < prevMonth.total ? 'down' : 'flat'
        : undefined

    // ── Top trips ─────────────────────────────────────────────────────────────
    const topTrips = useMemo(() =>
        [...completedTrips].sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0)).slice(0, 5)
        , [completedTrips])

    // ── Fuel records ──────────────────────────────────────────────────────────
    const recordFuelCost = useMemo(() => {
        if (!fuelLogs.length) return null
        return [...fuelLogs].sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0))[0]
    }, [fuelLogs])

    const recordFuelVolume = useMemo(() => {
        if (!fuelLogs.length) return null
        return [...fuelLogs].sort((a, b) => {
            const vA = isElectric ? (a.kwh || 0) : (a.liters || 0)
            const vB = isElectric ? (b.kwh || 0) : (b.liters || 0)
            return vB - vA
        })[0]
    }, [fuelLogs, isElectric])

    if (!selectedVehicle && !effectiveId) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
                <HeaderBar variant="page" title="Báo Cáo Phương Tiện" />
                <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">Chưa có xe nào</div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Báo Cáo Phương Tiện" />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4 space-y-5">



                {/* ── Hero Card ─────────────────────────────────────────── */}
                <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${isElectric ? 'bg-gradient-to-br from-green-500 to-green-700' : isMoto ? 'bg-gradient-to-br from-orange-500 to-red-700' : 'bg-gradient-to-br from-blue-600 to-indigo-800'}`}>
                    <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute right-0 bottom-0 h-20 opacity-10">
                        {isMoto ? <Bike className="h-full w-full" /> : <Car className="h-full w-full" />}
                    </div>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-xs font-medium opacity-75">Tổng chi phí vận hành</p>
                            <p className="text-3xl font-black tracking-tight mt-0.5">{fmt(totalCost)}</p>
                        </div>
                        <div className="rounded-xl bg-white/20 p-2">
                            {isElectric ? <BatteryCharging className="h-5 w-5" /> : <Fuel className="h-5 w-5" />}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 border-t border-white/20 pt-3">
                        <div>
                            <p className="text-lg font-black">{completedTrips.length}</p>
                            <p className="text-[10px] opacity-70">Chuyến đi</p>
                        </div>
                        <div>
                            <p className="text-lg font-black">{totalDist.toLocaleString()} km</p>
                            <p className="text-[10px] opacity-70">Quãng đường</p>
                        </div>
                        <div>
                            <p className="text-lg font-black">{costPerKm > 0 ? `${Math.round(costPerKm).toLocaleString()}đ` : '—'}</p>
                            <p className="text-[10px] opacity-70">Chi phí/km</p>
                        </div>
                    </div>
                </div>

                {/* ── 2×2 Stats Grid ───────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={isElectric ? Zap : Fuel} label={isElectric ? 'Tổng sạc điện' : 'Tổng nhiên liệu'}
                        value={fmt(totalFuel)} color={isElectric ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}
                        trend={monthTrend} />
                    <StatCard icon={Wrench} label="Tổng bảo dưỡng"
                        value={fmt(totalMaint)} color="bg-purple-100 text-purple-600" />
                    <StatCard icon={Receipt} label="Chi phí khác"
                        value={fmt(totalExp)} color="bg-red-100 text-red-600" />
                    <StatCard icon={Navigation} label={isElectric ? 'Tiêu thụ TB' : 'Tiêu hao TB'}
                        value={avgConsumption > 0 ? `${avgConsumption.toFixed(1)} ${isElectric ? 'kWh' : 'L'}/100km` : '—'}
                        color="bg-sky-100 text-sky-600"
                        sub={totalLiters > 0 ? `${totalLiters.toFixed(1)} ${isElectric ? 'kWh' : 'lít'} tổng cộng` : undefined} />
                </div>

                {/* ── Chi phí 6 tháng — Bar Chart ──────────────────────── */}
                <div>
                    <SectionHeader title="Chi phí 6 tháng gần nhất" sub="Phân tích theo danh mục" />
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-4">
                        {loadingMonthly ? (
                            <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                                    <Tooltip content={<CurrencyTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="fuel" name={isElectric ? 'Sạc điện' : 'Nhiên liệu'} fill={isElectric ? '#22c55e' : '#f97316'} radius={[4, 4, 0, 0]} barSize={10} activeBar={false} style={{ outline: 'none' }} />
                                    <Bar dataKey="maintenance" name="Bảo dưỡng" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={10} activeBar={false} style={{ outline: 'none' }} />
                                    <Bar dataKey="expenses" name="Chi phí khác" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={10} activeBar={false} style={{ outline: 'none' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ── Km di chuyển 6 tháng — Line Chart ────────────────── */}
                <div>
                    <SectionHeader title="Quãng đường theo tháng" sub={`Tổng: ${totalDist.toLocaleString()} km`} />
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-4">
                        {loadingMonthly ? (
                            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <LineChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                                    <Tooltip formatter={(v) => [`${Number(v ?? 0).toLocaleString()} km`, 'Quãng đường']} labelStyle={{ fontWeight: 700 }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Line dataKey="distance" name="km" type="monotone"
                                        stroke={isElectric ? '#22c55e' : isMoto ? '#f97316' : '#3b82f6'}
                                        strokeWidth={2.5} dot={{ r: 4, fill: 'white', strokeWidth: 2.5 }}
                                        activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ── Phân loại chuyến đi — Pie Chart ──────────────────── */}
                {tripTypeData.length > 0 && (
                    <div>
                        <SectionHeader title="Phân loại lộ trình" sub={`${completedTrips.length} chuyến đi ghi nhận`} />
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-4">
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width={120} height={120}>
                                    <PieChart style={{ outline: 'none' }}>
                                        <Pie data={tripTypeData} innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2} style={{ outline: 'none' }}>
                                            {tripTypeData.map((entry, i) => <Cell key={i} fill={entry.color} style={{ outline: 'none' }} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-2">
                                    {tripTypeData.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                                                <span className="text-slate-700 font-medium">{item.name}</span>
                                            </span>
                                            <span className="font-bold text-slate-600">{item.value} <span className="text-slate-400 font-normal">({item.pct}%)</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Top 5 chuyến đi dài nhất ────────────────────────── */}
                {topTrips.length > 0 && (
                    <div>
                        <SectionHeader title="Top 5 chuyến đi dài nhất" />
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md overflow-hidden">
                            {topTrips.map((trip, i) => (
                                <div key={trip.id} className={`flex items-center gap-3 px-4 py-3 ${i < topTrips.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {i === 0 ? <Award className="h-4 w-4" /> : i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 truncate">
                                            {trip.start_location || '?'} → {trip.end_location || '?'}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(trip.trip_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-black ${isMoto ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {(trip.distance_km || (trip.end_km - trip.start_km)).toLocaleString()} km
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Kỷ lục Nhiên liệu / Sạc điện ────────────────────────── */}
                {(recordFuelCost || recordFuelVolume) && (
                    <div>
                        <SectionHeader title={isElectric ? "Kỷ lục sạc điện" : "Kỷ lục đổ nhiên liệu"} />
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col">
                            {recordFuelCost && (
                                <div className={`flex items-center justify-between p-4 ${recordFuelVolume ? 'border-b border-slate-50' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                                            <Receipt className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Chi phí cao nhất</p>
                                            <p className="text-sm font-bold text-slate-800">{new Date(recordFuelCost.refuel_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-red-600">{fmt(recordFuelCost.total_amount || 0)}</p>
                                    </div>
                                </div>
                            )}

                            {recordFuelVolume && (
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                                            {isElectric ? <Zap className="h-5 w-5" /> : <Fuel className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">{isElectric ? 'Sạc nhiều điện nhất' : 'Đổ nhiều nhiên liệu nhất'}</p>
                                            <p className="text-sm font-bold text-slate-800">{new Date(recordFuelVolume.refuel_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-blue-600">
                                            {isElectric ? `${recordFuelVolume.kwh?.toFixed(1) || 0} kWh` : `${recordFuelVolume.liters?.toFixed(1) || 0} lít`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Chi phí khác theo danh mục ───────────────────────── */}
                {expenseTypeData.length > 0 && (
                    <div>
                        <SectionHeader title="Chi tiết phí khác" />
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md overflow-hidden">
                            {expenseTypeData.map((item, i) => {
                                const pct = totalExp > 0 ? (item.value / totalExp) * 100 : 0
                                return (
                                    <div key={i} className={`px-4 py-3 ${i < expenseTypeData.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                                            <span className="text-xs font-bold text-red-600">{fmt(item.value)}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ── So sánh tháng ─────────────────────────────────────── */}
                {curMonth && prevMonth && (
                    <div>
                        <SectionHeader title="So sánh tháng" sub={`${prevMonth.month} → ${curMonth.month}`} />
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Chi phí', cur: curMonth.total, prev: prevMonth.total, fmt: (v: number) => fmtK(v) + 'đ' },
                                { label: 'Quãng đường', cur: curMonth.distance, prev: prevMonth.distance, fmt: (v: number) => v.toLocaleString() + ' km' },
                                { label: 'Số chuyến', cur: curMonth.trips, prev: prevMonth.trips, fmt: (v: number) => String(v) },
                            ].map(({ label, cur, prev, fmt: f }) => {
                                const diff = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0
                                const up = cur > prev
                                return (
                                    <div key={label} className="rounded-2xl bg-white border border-slate-100 shadow-md p-4">
                                        <p className="text-xs text-slate-500 mb-1">{label}</p>
                                        <p className="text-base font-black text-slate-800">{f(cur)}</p>
                                        {prev > 0 && (
                                            <p className={`text-[10px] font-semibold mt-1 flex items-center gap-0.5 ${up ? 'text-red-500' : 'text-green-500'}`}>
                                                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {up ? '+' : ''}{diff}% so với {prevMonth.month}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            <VehicleFooterNav addLabel="Ghi chép" isElectricVehicle={isElectric} />
        </div>
    )
}

