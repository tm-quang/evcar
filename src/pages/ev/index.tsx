import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Car,
    Bike,
    Route,
    Wrench,
    Receipt,
    BarChart3,
    AlertTriangle,
    Star,
    Edit,
    Gauge,
    Zap,
    BatteryCharging,
    TrendingUp,
    Check,
    X,
    Shield,
    ClipboardCheck,
    Calculator,
    ChevronRight,
} from 'lucide-react'
import { useVehicles, useVehicleStats, useVehicleAlerts, useSetDefaultVehicle, vehicleKeys, useVehicleNotifications } from '../../lib/ev/useVehicleQueries'
import { updateVehicle } from '../../lib/ev/vehicleService'
import type { VehicleAlert } from '../../lib/ev/vehicleService'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/ev/VehicleFooterNav'
import { useProfile } from '../../lib/profileQueries'
import { useVehicleStore } from '../../store/useVehicleStore'
import { useAuthState } from '../../hooks/useAuthState'

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value)

export default function VehicleManagement() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { success, error: showError } = useNotification()
    const { user } = useAuthState()
    const { selectedVehicleId: selectedId, setSelectedVehicleId: setSelectedId } = useVehicleStore()
    const [isReloading, setIsReloading] = useState(false)
    const [showOdoModal, setShowOdoModal] = useState(false)
    const [newOdo, setNewOdo] = useState('')
    const [savingOdo, setSavingOdo] = useState(false)

    const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles()

    // Calculate current month date range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: stats, isLoading: isLoadingStats } = useVehicleStats(selectedId || undefined, startOfMonth, endOfMonth)
    const { data: alerts = [] } = useVehicleAlerts(selectedId || undefined)
    const { data: profile, isLoading: isLoadingProfile } = useProfile()
    const { data: vehicleNotifications = [] } = useVehicleNotifications()
    const setDefaultMutation = useSetDefaultVehicle()

    const unreadNotifCount = vehicleNotifications.filter(n => n.status === 'unread').length

    useEffect(() => {
        if (vehicles.length > 0 && !selectedId) {
            const defaultVehicle = vehicles.find(v => v.is_default) || vehicles[0]
            setSelectedId(defaultVehicle.id)
        }
    }, [vehicles, selectedId])

    const selectedVehicle = vehicles.find(v => v.id === selectedId) || null
    const loading = isLoadingVehicles

    const toggleDefaultVehicle = async (e: React.MouseEvent, vehicleId: string, isCurrentDefault: boolean) => {
        e.stopPropagation()
        try {
            await setDefaultMutation.mutateAsync({ id: vehicleId, isDefault: !isCurrentDefault })
        } catch (error) {
            console.error('Error setting default vehicle:', error)
        }
    }

    const isElectric = selectedVehicle?.fuel_type === 'electric'
    const isMoto = selectedVehicle?.vehicle_type === 'motorcycle'

    // -- Maintenance progress data
    const maintProgress = (() => {
        if (!selectedVehicle?.next_maintenance_km) return null
        const odo = selectedVehicle.current_odometer
        const target = selectedVehicle.next_maintenance_km
        const kmLeft = target - odo
        let interval = selectedVehicle.maintenance_interval_km || (isMoto ? 3000 : 5000)
        if (kmLeft > interval) interval = target
        const lastMaint = Math.max(0, target - interval)
        const traveled = Math.max(0, odo - lastMaint)
        const pct = Math.min(100, Math.round((traveled / interval) * 100))
        return { pct, kmLeft, target, isOverdue: kmLeft < 0 }
    })()

    const maintDateProgress = (() => {
        if (!selectedVehicle?.next_maintenance_date) return null
        const d = new Date(selectedVehicle.next_maintenance_date)
        const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
        const intervalMonths = selectedVehicle.maintenance_interval_months || (isMoto ? 3 : 6)
        let intervalDays = intervalMonths * 30
        if (days > intervalDays) intervalDays = Math.max(intervalDays, days + 30)
        const traveledDays = Math.max(0, intervalDays - Math.max(0, days))
        const pct = Math.min(100, Math.round((traveledDays / intervalDays) * 100))
        return { target: d, pct, daysLeft: days, isOverdue: days < 0 }
    })()

    const handleSaveOdo = async () => {
        if (!selectedVehicle || !newOdo) return
        const val = Number(newOdo.replace(/[^0-9]/g, ''))
        if (isNaN(val) || val < selectedVehicle.current_odometer) {
            showError(`ODO mới phải lớn hơn ${selectedVehicle.current_odometer.toLocaleString()} km`)
            return
        }
        setSavingOdo(true)
        try {
            await updateVehicle(selectedVehicle.id, { current_odometer: val })
            await queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
            setShowOdoModal(false)
            setNewOdo('')
            success(`Đã cập nhật ODO: ${val.toLocaleString()} km`)
        } catch {
            showError('Không thể cập nhật ODO')
        } finally {
            setSavingOdo(false)
        }
    }

    const getAlertInfo = (alert: VehicleAlert) => {
        let title = ''
        let remainingText = ''
        const isCritical = alert.isOverdue || (alert.daysUntilDue !== undefined && alert.daysUntilDue < 3)
        switch (alert.type) {
            case 'inspection':
                title = 'Đăng kiểm'
                remainingText = alert.isOverdue ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày` : `Còn ${alert.daysUntilDue} ngày`
                break
            case 'insurance':
                title = 'Bảo hiểm'
                remainingText = alert.isOverdue ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày` : `Còn ${alert.daysUntilDue} ngày`
                break
            case 'maintenance_km':
                title = 'Bảo dưỡng (Km)'
                remainingText = alert.isOverdue ? `Quá ${alert.kmUntilDue ? Math.abs(alert.kmUntilDue) : 0} km` : `Còn ${alert.kmUntilDue} km`
                break
            case 'maintenance_date':
                title = 'Bảo dưỡng (Ngày)'
                remainingText = alert.isOverdue ? `Quá hạn ${Math.abs(alert.daysUntilDue || 0)} ngày` : `Còn ${alert.daysUntilDue} ngày`
                break
        }
        return { title, remainingText, isCritical }
    }



    if (loading) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
                <HeaderBar variant="page" title="Phương tiện" />
                <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-4 pt-4 space-y-4">
                    <div className="h-56 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />)}
                    </div>
                    <div className="h-40 rounded-3xl bg-slate-200 animate-pulse" />
                </main>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="greeting"
                userName={profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng'}
                avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
                unreadNotificationCount={unreadNotifCount}
                isLoadingProfile={isLoadingProfile}
                onReload={async () => {
                    setIsReloading(true)
                    try {
                        await queryClient.invalidateQueries()
                        success('Dữ liệu đã được làm mới')
                    } catch (e) {
                        showError('Không thể làm mới dữ liệu')
                    } finally {
                        setIsReloading(false)
                    }
                }}
                isReloading={isReloading}
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-3 space-y-4">

                {/* ══════════════════════════════════════════════
                    VEHICLE HERO CAROUSEL
                ══════════════════════════════════════════════ */}
                <section>
                    <div className="mb-3 flex items-center justify-between px-1">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Xe của bạn</h3>
                        <button
                            onClick={() => navigate('/ev/list')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 active:scale-95 transition-all"
                        >
                            Xem tất cả ({vehicles.length})
                        </button>
                    </div>
                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {vehicles.map((vehicle) => {
                            const isSelected = selectedVehicle?.id === vehicle.id
                            const VehicleIcon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car
                            const isMc = vehicle.vehicle_type === 'motorcycle'
                            const grad = 'from-emerald-500 via-green-700 to-teal-800'

                            return (
                                <div
                                    key={vehicle.id}
                                    onClick={() => setSelectedId(vehicle.id)}
                                    className="group relative flex min-w-[calc(100%-1rem)] flex-shrink-0 snap-center rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
                                >
                                    {/* Background */}
                                    <div className={`relative h-52 w-full overflow-hidden rounded-3xl p-4 ${!vehicle.image_url ? `bg-gradient-to-br ${grad}` : 'bg-white'}`}>
                                        {vehicle.image_url ? (
                                            <div className="absolute inset-0 z-0">
                                                <img src={vehicle.image_url} alt={vehicle.license_plate} className="h-full w-full object-cover opacity-90" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 z-0 overflow-hidden">
                                                {/* Geometric deco */}
                                                <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/8 blur-2xl" />
                                                <div className="absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-white/6 blur-xl" />
                                                <div className="absolute right-0 bottom-0 opacity-10">
                                                    <VehicleIcon className="h-36 w-36 text-white" />
                                                </div>
                                                <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 120" preserveAspectRatio="none">
                                                    <path d="M0,80 Q100,30 200,80 T400,80 L400,120 L0,120 Z" fill="white" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="relative z-10 flex h-full flex-col justify-between text-white">
                                            {/* Top row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="rounded-2xl bg-white/20 backdrop-blur-md p-2 shrink-0 border border-white/20">
                                                        <VehicleIcon className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-lg font-black tracking-widest uppercase truncate">{vehicle.license_plate}</p>
                                                        <p className="text-xs font-medium text-white/70 truncate">{vehicle.model}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/ev/edit/${vehicle.id}`) }}
                                                        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-all border border-white/20">
                                                        <Edit className="h-3.5 w-3.5 text-white" />
                                                    </button>
                                                    <button onClick={(e) => toggleDefaultVehicle(e, vehicle.id, !!vehicle.is_default)}
                                                        className={`h-8 w-8 flex items-center justify-center rounded-full transition-all border ${vehicle.is_default ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/40' : 'bg-white/15 backdrop-blur-sm border-white/20 hover:bg-white/25'}`}>
                                                        <Star className={`h-3.5 w-3.5 ${vehicle.is_default ? 'text-white fill-current' : 'text-white'}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ODO - Hidden per user request */}
                                            {/* <div>
                                                <div className="flex items-end gap-3 mb-1">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <Gauge className="h-4 w-4 text-white/60 mb-0.5" />
                                                        <span className="text-4xl font-black tracking-tighter">{vehicle.current_odometer.toLocaleString()}</span>
                                                        <span className="text-sm font-semibold text-white/60">km</span>
                                                    </div>
                                                    {isSelected && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setNewOdo(''); setShowOdoModal(true) }}
                                                            className="mb-1 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition-all active:scale-95"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-white/50 font-medium">Số km hiện tại</p>
                                            </div> */}

                                            {/* Bottom info strip */}
                                            <div className="flex items-center justify-between border-t border-white/15 pt-3 mt-1">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-white/50">Năm SX</p>
                                                    <p className="text-sm font-black">{vehicle.year || 'N/A'}</p>
                                                </div>
                                                <div className="h-8 w-px bg-white/15" />
                                                <div className="text-center">
                                                    <p className="text-[10px] text-white/50">Loại xe</p>
                                                    <p className="text-sm font-black">{isMc ? 'Xe máy' : 'Ô tô'}</p>
                                                </div>
                                                <div className="h-8 w-px bg-white/15" />
                                                <div className="text-center">
                                                    <p className="text-[10px] text-white/50">Loại xe</p>
                                                    <p className="text-sm font-black">Điện (EV)</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selected ring */}
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-3xl ring-2 ring-white/30 ring-inset pointer-events-none" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Dot indicators */}
                    {vehicles.length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-2">
                            {vehicles.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedId(v.id)}
                                    className={`rounded-full transition-all duration-300 ${selectedVehicle?.id === v.id ? 'w-5 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* ══════════════════════════════════════════════
                    STATS OVERVIEW
                ══════════════════════════════════════════════ */}
                {/* ══════════════════════════════════════════════
                    EV ENERGY & DISTANCE STATS
                ══════════════════════════════════════════════ */}
                {selectedVehicle && (
                    <section>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Total Range / Distance */}
                            <div className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-md transition-all hover:shadow-md flex flex-col justify-between h-[150px] border border-slate-300">
                                <div className="absolute -left-6 -bottom-6 h-36 w-36 rounded-full bg-blue-500/30 blur-2xl" />
                                <div className="z-10 flex items-center gap-2">
                                    <div className="rounded-3xl bg-blue-600 p-2 text-white">
                                        <Gauge className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Số Odo hiện tại</span>
                                </div>
                                <div className="z-10 mt-2">
                                    <div className="flex items-center gap-1">
                                        <p className="text-3xl font-black text-slate-800 leading-none">
                                            {selectedVehicle.current_odometer.toLocaleString()}
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setNewOdo(''); setShowOdoModal(true) }}
                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs font-bold text-blue-600 uppercase tracking-tighter">Tổng km</p>
                                </div>
                            </div>

                            {/* Energy Consumption / Charging */}
                            <div className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between h-[150px] border border-slate-300">
                                <div className="absolute -left-6 -bottom-6 h-36 w-36 rounded-full bg-emerald-500/30 blur-2xl" />
                                <div className="z-10 flex items-center gap-2">
                                    <div className="rounded-3xl bg-emerald-500 p-2 text-white">
                                        <Zap className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">KWh tháng này</span>
                                </div>
                                <div className="z-10 mt-2">
                                    <p className="text-3xl font-black text-slate-800 leading-none">
                                        {isLoadingStats ? '...' : (stats?.totalKwh ? stats.totalKwh.toFixed(1) : '0')}
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-emerald-600">KWH</p>
                                </div>
                            </div>
                        </div>

                        {/* Middle Stats Row */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-3xl bg-white p-5 shadow-md flex items-center gap-3 h-[100px] border border-slate-300">
                                <div className="rounded-3xl bg-blue-50 p-2">
                                    <Route className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-md font-black text-slate-800 leading-none">{stats?.totalTrips || 0}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lộ trình</p>
                                </div>
                            </div>
                            <div className="rounded-3xl bg-white p-5 shadow-md flex items-center gap-3 h-[100px] border border-slate-300">
                                <div className="rounded-3xl bg-emerald-100 p-2">
                                    <BatteryCharging className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-md font-black text-slate-800 leading-none">{stats?.totalChargeSessions || 0}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lần sạc tháng này</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    SUMMARY EXPENSES (REPORT STYLE)
                ══════════════════════════════════════════════ */}
                {selectedVehicle && stats && !isLoadingStats && (
                    <section className="bg-white rounded-3xl shadow-md border border-slate-300 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-100 to-white px-6 py-4 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Chi phí tháng này</p>
                                    <p className="text-2xl font-black text-slate-800">
                                        {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                                    </p>
                                </div>
                                <div className="h-12 w-12 rounded-3xl bg-emerald-100 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 gap-4">
                            {[
                                { label: 'Sạc điện (kWh)', val: stats.totalFuelCost, icon: <Zap className="h-4 w-4 text-emerald-500" />, bg: 'bg-emerald-50' },
                                { label: 'Bảo dưỡng xe', val: stats.totalMaintenanceCost, icon: <Wrench className="h-4 w-4 text-amber-500" />, bg: 'bg-amber-50' },
                                { label: 'Chi phí khác', val: stats.totalOtherExpenses, icon: <Receipt className="h-4 w-4 text-rose-500" />, bg: 'bg-rose-50' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-3xl ${item.bg} flex items-center justify-center`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-800">{formatCurrency(item.val)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    CẢNH BÁO
                ══════════════════════════════════════════════ */}
                {alerts.length > 0 && (
                    <section className="space-y-2.5">
                        {alerts.map((alert, index) => {
                            const { title, remainingText, isCritical } = getAlertInfo(alert)
                            return (
                                <div
                                    key={index}
                                    className={`flex items-start gap-3 rounded-2xl p-4 border ${isCritical
                                        ? 'bg-red-50 border-red-100 shadow-sm shadow-red-100'
                                        : 'bg-amber-50 border-amber-100 shadow-sm shadow-amber-100'
                                        }`}
                                >
                                    <div className={`shrink-0 mt-0.5 rounded-xl p-2 ${isCritical ? 'bg-red-100' : 'bg-amber-100'}`}>
                                        <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-black ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>{title}</p>
                                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {remainingText}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>{alert.message}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    VERTICAL MAINTENANCE TIMELINE
                ══════════════════════════════════════════════ */}
                {selectedVehicle && (maintProgress || maintDateProgress || selectedVehicle.insurance_expiry_date || selectedVehicle.inspection_expiry_date) && (
                    <section>
                        <div className="mb-4 flex items-center justify-between px-1">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Thông tin bảo dưỡng & Bảo hiểm</h2>
                        </div>

                        <div className="space-y-4">
                            {/* EV Maintenance Progress */}
                            {maintProgress && (
                                <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-100 to-white p-5 border border-slate-300 shadow-md transition-all hover:border-emerald-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`rounded-3xl p-2 ${maintProgress.isOverdue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                <Wrench className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">Bảo dưỡng định kỳ</p>
                                                <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Dự kiến tại {maintProgress.target.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${maintProgress.isOverdue ? 'text-red-500' : 'text-red-500'}`}>
                                                {maintProgress.isOverdue ? `Quá mốc!` : `Còn ${maintProgress.kmLeft.toLocaleString()} km`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="h-2 w-full rounded-full bg-slate-50 overflow-hidden ring-1 ring-slate-100/50">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${maintProgress.isOverdue ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                                                style={{ width: `${Math.min(100, Math.max(2, maintProgress.pct))}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400">{maintProgress.pct}% tiến độ</span>
                                            <button onClick={() => navigate('/ev/maintenance')} className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                                                Cấu hình mốc bảo dưỡng <ChevronRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Legal Docs (Inspection/Insurance) in 2-col cards */}
                            <div className="grid grid-cols-2 gap-3">
                                {selectedVehicle.insurance_expiry_date && (() => {
                                    const d = new Date(selectedVehicle.insurance_expiry_date)
                                    const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                    return (
                                        <div className="rounded-3xl bg-gradient-to-r from-blue-100 to-blue-50 p-4 border border-slate-300 shadow-md">
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-3xl bg-blue-500">
                                                <Shield className="h-5 w-5 text-white" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Bảo hiểm</p>
                                            <p className={`text-sm font-black ${days < 30 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {days < 0 ? 'Hết hạn' : `Còn ${days} ngày`}
                                            </p>
                                        </div>
                                    )
                                })()}
                                {selectedVehicle.inspection_expiry_date && (() => {
                                    const d = new Date(selectedVehicle.inspection_expiry_date)
                                    const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                    return (
                                        <div className="rounded-3xl bg-gradient-to-r from-slate-100 to-slate-50 p-4 border border-slate-300 shadow-md">
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-3xl bg-slate-500">
                                                <ClipboardCheck className="h-5 w-5 text-white" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Đăng kiểm</p>
                                            <p className={`text-sm font-black ${days < 30 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {days < 0 ? 'Hết hạn' : `Còn ${days} ngày`}
                                            </p>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    CHỨC NĂNG QUẢN LÝ
                ══════════════════════════════════════════════ */}
                {/* ══════════════════════════════════════════════
                    QUICK ACTIONS / MANAGEMENT
                ══════════════════════════════════════════════ */}
                {selectedVehicle && (
                    <section>
                        <div className="mb-4 flex items-center justify-between px-1">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tiện ích khác</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Trip Analysis */}
                            <button
                                onClick={() => navigate('/ev/trips')}
                                className="group flex flex-col gap-2 rounded-3xl bg-white p-5 border border-slate-300 shadow-md transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-indigo-500 text-white">
                                    <Route className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Lộ trình</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">Lịch sử di chuyển</p>
                                </div>
                            </button>

                            {/* Energy Management */}
                            <button
                                onClick={() => navigate('/ev/charging')}
                                className="group flex flex-col gap-4 rounded-3xl bg-white p-5 border border-slate-300 shadow-md transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-emerald-500 text-white">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Sạc điện</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">Quản lý Pin & Sạc</p>
                                </div>
                            </button>

                            {/* Reports */}
                            <button
                                onClick={() => navigate('/ev/reports')}
                                className="group flex flex-col gap-4 rounded-3xl bg-white p-5 border border-slate-300 shadow-md transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-blue-500 text-white">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Báo cáo</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">Phân tích hiệu suất</p>
                                </div>
                            </button>

                            {/* Maintenance */}
                            <button
                                onClick={() => navigate('/ev/maintenance')}
                                className="group flex flex-col gap-4 rounded-3xl bg-white p-5 border border-slate-300 shadow-md transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-amber-500 text-white shadow-sm">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Bảo dưỡng</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Lịch sử & Nhắc lịch</p>
                                </div>
                            </button>

                            {/* Expenses */}
                            <button
                                onClick={() => navigate('/ev/expenses')}
                                className="group flex flex-col gap-4 rounded-3xl bg-white p-5 border border-slate-300 shadow-md transition-all hover:-translate-y-1 hover:shadow-md"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-rose-500 text-white shadow-sm">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Chi phí khác</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Gửi xe, Rửa xe...</p>
                                </div>
                            </button>

                            {/* EV Calculator */}
                            <button
                                onClick={() => navigate('/ev/calculator')}
                                className="group flex flex-col gap-4 rounded-3xl bg-emerald-600 p-5 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1"
                            >
                                <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-white text-emerald-600">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Công cụ EV</p>
                                    <p className="text-[10px] font-bold text-white/80 mt-0.5 uppercase tracking-tighter">Tính toán km</p>
                                </div>
                            </button>
                        </div>
                    </section>
                )}

                <div className="h-[120px] w-full flex-shrink-0" />
            </main>

            {/* ══ ODO Modal ══ */}
            {showOdoModal && selectedVehicle && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setShowOdoModal(false)}
                >
                    <div
                        className="w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className="h-1.5 w-10 rounded-full bg-slate-200" />
                        </div>

                        {/* Header */}
                        <div className={`px-5 py-5 text-white flex items-center justify-between shrink-0`}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-3xl bg-blue-600 p-2.5">
                                    <Gauge className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">Cập nhật số km</h3>
                                    <p className="text-xs text-slate-800">{selectedVehicle.license_plate}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowOdoModal(false)} className="rounded-full bg-slate-300 p-1.5 hover:bg-slate-400 transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-6 space-y-5 overflow-y-auto">
                            <div className="flex flex-col items-center rounded-2xl bg-slate-50 border border-slate-200 py-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hiện tại</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-800">{selectedVehicle.current_odometer.toLocaleString()}</span>
                                    <span className="text-sm font-bold text-slate-400">km</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nhập số KM mới</label>
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0"
                                    value={newOdo}
                                    onChange={e => setNewOdo(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveOdo()}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-center text-2xl font-black text-slate-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-200"
                                />
                                {newOdo && Number(newOdo) > 0 && (
                                    <p className={`mt-2 text-center text-xs font-bold ${Number(newOdo) > selectedVehicle.current_odometer ? 'text-green-500' : 'text-red-500'}`}>
                                        {Number(newOdo) > selectedVehicle.current_odometer
                                            ? `↑ Tăng thêm ${(Number(newOdo) - selectedVehicle.current_odometer).toLocaleString()} km`
                                            : 'ODO mới phải lớn hơn ODO hiện tại'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 pb-6 shrink-0 pt-2 border-t border-slate-100">
                            <button onClick={() => setShowOdoModal(false)}
                                className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all active:scale-95">
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveOdo}
                                disabled={savingOdo || !newOdo || Number(newOdo) <= selectedVehicle.current_odometer}
                                className={`flex-[2] flex items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-black text-white shadow-lg transition-all disabled:opacity-40 active:scale-95 ${isMoto ? 'bg-orange-500 shadow-orange-500/25' : isElectric ? 'bg-emerald-500 shadow-emerald-500/25' : 'bg-blue-600 shadow-blue-500/25'}`}
                            >
                                {savingOdo ? 'Đang lưu...' : <><Check className="h-4 w-4" /> Cập nhật</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <VehicleFooterNav
                onAddClick={() => navigate('/ev/charging')}
                isElectricVehicle={isElectric}
                addLabel="Ghi chép"
                isMainPage={true}
            />
        </div>
    )
}
