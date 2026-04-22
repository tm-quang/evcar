import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Car,
    Bike,
    Route,
    Wrench,
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
    Plus,
    LayoutList,
} from 'lucide-react'
import { useAppearance } from '../../contexts/AppearanceContext'
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
        maximumFractionDigits: 0,
    }).format(Math.round(value)) + ' đ'

export default function VehicleManagement() {
    const navigate = useNavigate()
    const { isDarkMode } = useAppearance()
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
    const isEmpty = !loading && vehicles.length === 0

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



    const cardClass = isDarkMode
        ? 'bg-slate-800 border border-slate-700 shadow-xl shadow-black/20'
        : 'bg-white border border-slate-200 shadow-sm'
    const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900'
    const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-400'
    const subStatBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#F1F5F9] border-white'
    const subStatIconBg = isDarkMode ? 'bg-slate-700' : 'bg-white'

    if (loading) {
        return (
            <div className="flex h-screen flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--app-home-bg)' }}>
                <HeaderBar variant="page" title="Phương tiện" />
                <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-4 pt-4 space-y-4">
                    <div className={`h-56 rounded-3xl animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-gradient-to-br from-slate-200 to-slate-300'}`} />
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => <div key={i} className={`h-24 rounded-2xl animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />)}
                    </div>
                    <div className={`h-40 rounded-3xl animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </main>
            </div>
        )
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: 'var(--app-home-bg)', color: 'var(--app-text-primary)' }}>
            <div className="relative z-10 flex flex-col flex-1 min-h-0">
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

                <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full max-w-md mx-auto px-4 pb-28 pt-4 flex flex-col">
                    {isEmpty ? (
                        <div className="flex-1 flex flex-col items-center justify-center px-2 py-4 animate-in fade-in zoom-in-95 duration-1000 relative">
                            {/* Decorative background glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/10 blur-[100px] rounded-full pointer-events-none" />

                            <div className="relative w-full max-w-sm bg-white rounded-3xl p-4 shadow-md flex flex-col items-center">
                                {/* Badge */}
                                <div className="rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100/50">
                                    <span className="text-[13px] font-black uppercase tracking-[0.2em] text-emerald-600">EVNGo - Quản lý xe của bạn</span>
                                </div>

                                {/* Main Illustration Container */}
                                <div className="relative w-full aspect-square rounded-3xl overflow-hidden flex items-center justify-center">
                                    <img
                                        src="/EVGo-Logo.png"
                                        alt="Dashboard Preview"
                                        className="max-h-[220px] max-w-[220px] object-contain transition-transform duration-1000 hover:scale-105"
                                    />

                                    {/* Floating chips for visual context */}
                                    <div className="absolute top-6 left-6 h-11 w-11 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] rounded-3xl flex items-center justify-center animate-bounce duration-[4000ms] border border-slate-50">
                                        <Zap className="h-5.5 w-5.5 text-yellow-500" />
                                    </div>
                                    <div className="absolute bottom-12 right-6 h-11 w-11 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.06)] rounded-3xl flex items-center justify-center animate-bounce duration-[5000ms] border border-slate-50">
                                        <TrendingUp className="h-5.5 w-5.5 text-emerald-500" />
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="text-center space-y-3 px-1">
                                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                                        Thêm xe của bạn để tự động hóa việc theo dõi <span className="text-emerald-600 font-bold">Sạc pin</span>, <span className="text-blue-600 font-bold">Chi phí</span> và <span className="text-amber-600 font-bold">Bảo dưỡng</span>.
                                    </p>
                                </div>

                                {/* Action Area */}
                                <div className="mt-9 w-full">
                                    <button
                                        onClick={() => navigate('/ev/add')}
                                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white font-black text-base shadow-[0_15px_30px_-8px_rgba(37,99,235,0.45)] active:scale-[0.97] transition-all flex items-center justify-center gap-3 group"
                                    >
                                        <div className="bg-white/20 p-1.5 rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform">
                                            <Plus className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="tracking-wide">Thêm phương tiện</span>
                                    </button>
                                </div>

                                {/* Micro-stats/Features hint */}
                                <div className="mt-6 pt-2 border-t border-slate-50 flex justify-between w-full opacity-60">
                                    <div className="flex flex-col items-center gap-1">
                                        <BarChart3 className="h-4 w-4 text-red-500" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-red-500">Báo cáo</span>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <div className="flex flex-col items-center gap-1">
                                        <Wrench className="h-4 w-4 text-slate-700" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-700">Bảo trì</span>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <div className="flex flex-col items-center gap-1">
                                        <Shield className="h-4 w-4 text-blue-500" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-blue-500">Bảo mật</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* ══════════════════════════════════════════════
                    VEHICLE HERO CAROUSEL
                ══════════════════════════════════════════════ */}
                            <section>
                                <div className="mb-3 flex items-center justify-between px-1">
                                    <h3 className={`text-sm font-black uppercase tracking-widest ${textSecondary}`}>Xe của bạn</h3>
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
                                <section className="px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Total Distance Card */}
                                        <div className={`group relative overflow-hidden rounded-[32px] p-5 transition-all hover:shadow-md h-[160px] flex flex-col justify-between ${cardClass}`}>
                                            <div className="absolute right-0 top-0 p-3 opacity-10">
                                                <Gauge className="h-16 w-16 text-blue-600" />
                                            </div>
                                            <div className="z-10">
                                                <div className={`rounded-2xl w-fit p-2.5 border ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                    <Gauge className="h-5 w-5" />
                                                </div>
                                                <p className={`mt-3 text-[11px] font-black uppercase tracking-[0.1em] ${textSecondary}`}>Odo hiện tại</p>
                                            </div>
                                            <div className="z-10">
                                                <div className="flex items-baseline gap-1">
                                                    <p className={`text-3xl font-black tracking-tight ${textPrimary}`}>
                                                        {selectedVehicle.current_odometer.toLocaleString()}
                                                    </p>
                                                    <span className={`text-xs font-bold uppercase ${textSecondary}`}>km</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setNewOdo(''); setShowOdoModal(true) }}
                                                    className="mt-1 text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <Edit className="h-2.5 w-2.5" />
                                                    Cập nhật số km
                                                </button>
                                            </div>
                                        </div>

                                        {/* Energy Stats Card */}
                                        <div className={`group relative overflow-hidden rounded-[32px] p-5 transition-all hover:shadow-md h-[160px] flex flex-col justify-between ${cardClass}`}>
                                            <div className="absolute right-0 top-0 p-3 opacity-10">
                                                <Zap className="h-16 w-16 text-emerald-600" />
                                            </div>
                                            <div className="z-10">
                                                <div className={`rounded-2xl w-fit p-2.5 border ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <p className={`mt-3 text-[11px] font-black uppercase tracking-[0.1em] ${textSecondary}`}>Điện tháng này</p>
                                            </div>
                                            <div className="z-10">
                                                <div className="flex items-baseline gap-1">
                                                    <p className={`text-3xl font-black tracking-tight ${textPrimary}`}>
                                                        {isLoadingStats ? '...' : (stats?.totalKwh ? stats.totalKwh.toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : '0')}
                                                    </p>
                                                    <span className={`text-xs font-bold uppercase ${textSecondary}`}>kWh</span>
                                                </div>
                                                <p className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                    <TrendingUp className="h-2.5 w-2.5" />
                                                    Năng lượng sạch
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub Stats Row */}
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className={`rounded-[28px] p-4 flex items-center gap-4 border transition-all hover:shadow-sm group h-[88px] ${subStatBg}`}>
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-all duration-300 ${subStatIconBg}`}>
                                                <Route className="h-6 w-6 text-slate-600 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className={`text-xl font-black leading-none ${textPrimary}`}>{stats?.totalTrips || 0}</p>
                                                <p className={`text-[10px] font-black uppercase mt-1.5 tracking-widest ${textSecondary}`}>Lộ trình</p>
                                            </div>
                                        </div>
                                        <div className={`rounded-[28px] p-4 flex items-center gap-4 border transition-all hover:shadow-sm group h-[88px] ${subStatBg}`}>
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition-all duration-300 ${subStatIconBg}`}>
                                                <BatteryCharging className="h-6 w-6 text-slate-600 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className={`text-xl font-black leading-none ${textPrimary}`}>{stats?.totalChargeSessions || 0}</p>
                                                <p className={`text-[10px] font-black uppercase mt-1.5 tracking-widest ${textSecondary}`}>Lần sạc</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ══════════════════════════════════════════════
                    SUMMARY EXPENSES (REPORT STYLE)
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && stats && !isLoadingStats && (
                                <section className="px-1">
                                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-7 text-white shadow-2xl shadow-slate-900/20">
                                        {/* Background Orbs */}
                                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
                                        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Chi phí tháng này</p>
                                                    <h2 className="text-3xl font-black tracking-tight">
                                                        {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                                                    </h2>
                                                </div>
                                                <div className="h-14 w-14 rounded-[22px] bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
                                                    <TrendingUp className="h-7 w-7 text-emerald-400" />
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                {[
                                                    { label: 'Tiền sạc pin', val: stats.totalFuelCost, icon: <Zap className="h-4 w-4" />, color: 'emerald' },
                                                    { label: 'Bảo dưỡng xe', val: stats.totalMaintenanceCost, icon: <Wrench className="h-4 w-4" />, color: 'amber' },
                                                    { label: 'Chi phí khác', val: stats.totalOtherExpenses, icon: <LayoutList className="h-4 w-4" />, color: 'rose' },
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all duration-300 ${item.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                                item.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                                    'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                                }`}>
                                                                {item.icon}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{item.label}</p>
                                                                <p className="text-[10px] font-medium opacity-40 uppercase tracking-tighter">Thanh toán định kỳ</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black group-hover:text-white transition-colors">{formatCurrency(item.val)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => navigate('/ev/reports')}
                                                className="mt-8 w-full py-4 rounded-3xl bg-white/10 border border-white/10 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-[0.2em]"
                                            >
                                                Xem báo cáo chi tiết
                                            </button>
                                        </div>
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
                                        <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${textSecondary}`}>bảo dưỡng, Bảo hiểm, đăng kiểm</h2>
                                    </div>

                                    <div className="space-y-4">
                                        {/* EV Maintenance Progress */}
                                        {maintProgress && (
                                            <div className={`group relative overflow-hidden rounded-3xl p-5 shadow-md transition-all hover:border-emerald-200 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gradient-to-r from-slate-200 to-white border border-slate-300'}`}>
                                                <div className="absolute -right-3 -bottom-3 opacity-[0.05] text-slate-500 transition-transform group-hover:scale-110">
                                                    <Wrench className="h-24 w-24" />
                                                </div>
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-3xl p-2 ${maintProgress.isOverdue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                            <Wrench className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-black ${textPrimary}`}>Bảo dưỡng định kỳ</p>
                                                            <p className={`text-[10px] font-bold tracking-wide uppercase ${textSecondary}`}>Dự kiến tại {maintProgress.target.toLocaleString()} km</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${maintProgress.isOverdue ? 'text-red-500' : 'text-red-500'}`}>
                                                            {maintProgress.isOverdue ? `Quá mốc!` : `Còn ${maintProgress.kmLeft.toLocaleString()} km`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <div className={`h-2 w-full rounded-full overflow-hidden ring-1 ${isDarkMode ? 'bg-slate-700 ring-slate-600/50' : 'bg-slate-50 ring-slate-100/50'}`}>
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${maintProgress.isOverdue ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                                                            style={{ width: `${Math.min(100, Math.max(2, maintProgress.pct))}%` }}
                                                        />
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <span className={`text-[10px] font-bold ${textSecondary}`}>{maintProgress.pct}% tiến độ</span>
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
                                                    <div className="relative group overflow-hidden rounded-3xl bg-blue-50 p-5 border border-blue-100 shadow-sm transition-all hover:bg-white hover:shadow-md">
                                                        <div className="absolute -right-3 -bottom-3 opacity-[0.08] text-blue-600 transition-transform group-hover:scale-110">
                                                            <Shield className="h-20 w-20" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                                                                <Shield className="h-5 w-5" />
                                                            </div>
                                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Bảo hiểm</p>
                                                            <p className={`text-sm font-black ${days < 30 ? 'text-red-500' : 'text-slate-800'}`}>
                                                                {days < 0 ? 'Hết hạn' : `Còn ${days} ngày`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                            {selectedVehicle.inspection_expiry_date && (() => {
                                                const d = new Date(selectedVehicle.inspection_expiry_date)
                                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                                return (
                                                    <div className="relative group overflow-hidden rounded-3xl bg-slate-50 p-5 border border-slate-200 shadow-sm transition-all hover:bg-white hover:shadow-md">
                                                        <div className="absolute -right-3 -bottom-3 opacity-[0.08] text-slate-500 transition-transform group-hover:scale-110">
                                                            <ClipboardCheck className="h-20 w-20" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-500 text-white shadow-lg shadow-slate-500/20">
                                                                <ClipboardCheck className="h-5 w-5" />
                                                            </div>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textSecondary}`}>Đăng kiểm</p>
                                                            <p className={`text-sm font-black ${days < 30 ? 'text-red-600' : 'text-slate-900'}`}>
                                                                {days < 0 ? 'Hết hạn' : `Còn ${days} ngày`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ══════════════════════════════════════════════
                    QUICK ACTIONS / MANAGEMENT
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && (
                                <section>
                                    <div className="mb-4 flex items-center justify-between px-1">
                                        <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${textSecondary}`}>Tiện ích khác</h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'trips', label: 'Lộ trình', sub: 'Lịch sử di chuyển', icon: Route, color: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100', route: '/ev/trips' },
                                            { id: 'charging', label: 'Sạc pin', sub: 'Quản lý Pin & Sạc', icon: Zap, color: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', route: '/ev/charging' },
                                            { id: 'reports', label: 'Báo cáo', sub: 'Phân tích hiệu suất', icon: BarChart3, color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100', route: '/ev/reports' },
                                            { id: 'maintenance', label: 'Bảo dưỡng', sub: 'Lịch sử & Nhắc lịch', icon: Wrench, color: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100', route: '/ev/maintenance' },
                                            { id: 'expenses', label: 'Chi phí khác', sub: 'Gửi xe, Rửa xe...', icon: LayoutList, color: 'bg-rose-600', text: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100', route: '/ev/expenses' },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => navigate(item.route)}
                                                className={`group relative overflow-hidden flex flex-col items-center justify-center text-center gap-2 rounded-3xl p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : `${item.bg} border ${item.border}`}`}
                                            >
                                                <div className={`absolute -right-2 -bottom-2 opacity-10 ${item.text} transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                                                    <item.icon className="h-20 w-20" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className={`h-11 w-11 flex items-center justify-center rounded-2xl ${item.color} text-white shadow-lg mx-auto mb-3 transition-transform group-hover:scale-110`}>
                                                        <item.icon className="h-5 w-5" />
                                                    </div>
                                                    <p className={`text-sm font-black tracking-tight ${isDarkMode ? item.text : item.text}`}>{item.label}</p>
                                                    <p className={`text-[9px] font-black opacity-50 mt-1 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.sub}</p>
                                                </div>
                                            </button>
                                        ))}

                                        {/* EV Calculator */}
                                        <button
                                            onClick={() => navigate('/ev/calculator')}
                                            className="group relative overflow-hidden flex flex-col items-center justify-center text-center gap-2 rounded-3xl bg-[#059669] p-6 shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
                                        >
                                            <div className="absolute -right-2 -bottom-2 opacity-20 text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
                                                <Calculator className="h-20 w-20" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-lg mx-auto mb-3 transition-transform group-hover:scale-110">
                                                    <Calculator className="h-5 w-5" />
                                                </div>
                                                <div className="text-white">
                                                    <p className="text-sm font-black tracking-tight">Công cụ EV</p>
                                                    <p className="text-[9px] font-black opacity-80 mt-1 uppercase tracking-widest">Tính toán km</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                    <div className="h-[120px] w-full flex-shrink-0" />
                </main>
            </div>

            {/* ══ ODO Modal ══ */}
            {showOdoModal && selectedVehicle && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
                    onClick={() => setShowOdoModal(false)}
                >
                    <div
                        className={`w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                            <div className={`h-1.5 w-10 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
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
                            <div className={`flex flex-col items-center rounded-2xl border py-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${textSecondary}`}>Hiện tại</p>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-3xl font-black ${textPrimary}`}>{selectedVehicle.current_odometer.toLocaleString()}</span>
                                    <span className={`text-sm font-bold ${textSecondary}`}>km</span>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-center text-xs font-bold uppercase tracking-widest mb-2 ${textSecondary}`}>Nhập số KM mới</label>
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0"
                                    value={newOdo}
                                    onChange={e => setNewOdo(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveOdo()}
                                    className={`w-full rounded-2xl border-2 px-4 py-3.5 text-center text-2xl font-black shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-200 ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
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
                        <div className={`flex gap-3 px-5 pb-6 shrink-0 pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <button onClick={() => setShowOdoModal(false)}
                                className={`flex-1 rounded-2xl py-3.5 text-sm font-bold transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
