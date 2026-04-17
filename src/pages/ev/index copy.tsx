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
    Plus,
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
        <div className="flex h-[100dvh] flex-col overflow-hidden transition-all duration-700 bg-[#F7F9FC]">
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
                        <div className="space-y-6">

                            {/* ══════════════════════════════════════════════
                    VEHICLE HERO CAROUSEL
                ══════════════════════════════════════════════ */}
                            <section className="px-1">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-400">Xe của bạn</h3>
                                    <button
                                        onClick={() => navigate('/ev/list')}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 active:scale-95 transition-all bg-blue-50 px-3 py-1.5 rounded-full"
                                    >
                                        Tất cả ({vehicles.length})
                                    </button>
                                </div>
                                <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {vehicles.map((vehicle) => {
                                        const isSelected = selectedVehicle?.id === vehicle.id
                                        const VehicleIcon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car
                                        const isMc = vehicle.vehicle_type === 'motorcycle'
                                        
                                        // Dynamic gradients based on vehicle type and selection
                                        const grad = isSelected 
                                            ? 'from-[#0F172A] via-[#111827] to-[#1E293B]' // Deep premium dark
                                            : 'from-slate-100 to-slate-200'

                                        return (
                                            <div
                                                key={vehicle.id}
                                                onClick={() => setSelectedId(vehicle.id)}
                                                className={`group relative flex min-w-[280px] w-[88%] flex-shrink-0 snap-center rounded-[32px] overflow-hidden cursor-pointer transition-all duration-500 ${isSelected ? 'scale-100 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10' : 'scale-[0.96] opacity-70 border border-slate-200 shadow-sm'}`}
                                            >
                                                {/* Background Area */}
                                                <div className={`relative h-56 w-full p-6 transition-colors duration-500 overflow-hidden bg-gradient-to-br ${grad}`}>
                                                    {vehicle.image_url ? (
                                                        <div className="absolute inset-0 z-0 overflow-hidden">
                                                            <img src={vehicle.image_url} alt={vehicle.license_plate} className="h-full w-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000" />
                                                            <div className={`absolute inset-0 bg-gradient-to-t ${isSelected ? 'from-[#0F172A] via-[#0F172A]/40 to-transparent' : 'from-slate-200/50 to-transparent'}`} />
                                                        </div>
                                                    ) : (
                                                        <div className="absolute inset-0 z-0 overflow-hidden">
                                                            <div className={`absolute -right-8 -top-8 h-48 w-48 rounded-full blur-3xl ${isSelected ? 'bg-blue-500/20' : 'bg-slate-300/30'}`} />
                                                            <div className={`absolute -left-12 bottom-0 h-40 w-40 rounded-full blur-3xl ${isSelected ? 'bg-emerald-500/10' : 'bg-slate-300/20'}`} />
                                                            <div className={`absolute right-4 bottom-4 opacity-[0.05] transition-all duration-700 ${isSelected ? 'scale-110 rotate-3' : ''}`}>
                                                                <VehicleIcon className={`h-44 w-44 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Content Overlay */}
                                                    <div className={`relative z-10 flex h-full flex-col justify-between ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                                        {/* Header Row */}
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`rounded-[18px] p-3 backdrop-blur-xl border transition-all duration-300 ${isSelected ? 'bg-white/5 border-white/10 shadow-lg' : 'bg-white border-slate-300 shadow-sm'}`}>
                                                                    <VehicleIcon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className={`text-2xl font-black tracking-tighter uppercase truncate leading-none mb-1 shadow-black/20 ${isSelected ? 'text-white drop-shadow-md' : 'text-slate-900'}`}>
                                                                        {vehicle.license_plate}
                                                                    </h4>
                                                                    <p className={`text-[11px] font-black uppercase tracking-[0.1em] opacity-40 truncate ${isSelected ? 'text-slate-100' : 'text-slate-500'}`}>
                                                                        {vehicle.model}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/ev/edit/${vehicle.id}`) }}
                                                                    className={`h-10 w-10 flex items-center justify-center rounded-[18px] backdrop-blur-xl transition-all border ${isSelected ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' : 'bg-white border-slate-200 text-slate-400 shadow-sm'}`}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => toggleDefaultVehicle(e, vehicle.id, !!vehicle.is_default)}
                                                                    className={`h-10 w-10 flex items-center justify-center rounded-[18px] transition-all border shadow-lg ${vehicle.is_default ? 'bg-yellow-400 border-yellow-300 shadow-yellow-400/30' : isSelected ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-sm'}`}
                                                                >
                                                                    <Star className={`h-4 w-4 ${vehicle.is_default ? 'text-white fill-current' : isSelected ? 'text-white' : 'text-slate-300'}`} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Stats Strip */}
                                                        <div className={`flex items-center justify-around rounded-2xl py-3 border-t ${isSelected ? 'border-white/5 bg-white/5 backdrop-blur-sm' : 'border-slate-200 bg-black/5'}`}>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Năm SX</span>
                                                                <span className="text-[13px] font-black tracking-tight">{vehicle.year || '2024'}</span>
                                                            </div>
                                                            <div className="h-4 w-px bg-white/10" />
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Loại xe</span>
                                                                <span className="text-[13px] font-black tracking-tight">{isMc ? 'Xe máy' : 'Ô tô'}</span>
                                                            </div>
                                                            <div className="h-4 w-px bg-white/10" />
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">Động cơ</span>
                                                                <div className="flex items-center gap-1">
                                                                    <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400/20" />
                                                                    <span className="text-[13px] font-black tracking-tight uppercase">EV</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Dot indicators */}
                                {vehicles.length > 1 && (
                                    <div className="flex justify-center gap-2 mt-2">
                                        {vehicles.map((v) => (
                                            <button
                                                key={v.id}
                                                onClick={() => setSelectedId(v.id)}
                                                className={`rounded-full transition-all duration-500 ${selectedVehicle?.id === v.id ? 'w-8 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* ══════════════════════════════════════════════
                    EV ENERGY & DISTANCE STATS
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && (
                                <section className="px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Total Distance Card */}
                                        <div className="group relative overflow-hidden rounded-[32px] bg-white p-5 shadow-sm border border-slate-200 transition-all hover:border-blue-200 hover:shadow-md h-[160px] flex flex-col justify-between">
                                            <div className="absolute right-0 top-0 p-3 opacity-10">
                                                <Gauge className="h-16 w-16 text-blue-600" />
                                            </div>
                                            <div className="z-10">
                                                <div className="rounded-2xl bg-blue-50 w-fit p-2.5 text-blue-600 border border-blue-100">
                                                    <Gauge className="h-5 w-5" />
                                                </div>
                                                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">Odo hiện tại</p>
                                            </div>
                                            <div className="z-10">
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-3xl font-black text-slate-900 tracking-tight">
                                                        {selectedVehicle.current_odometer.toLocaleString()}
                                                    </p>
                                                    <span className="text-xs font-bold text-slate-400 uppercase">km</span>
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
                                        <div className="group relative overflow-hidden rounded-[32px] bg-white p-5 shadow-sm border border-slate-200 transition-all hover:border-emerald-200 hover:shadow-md h-[160px] flex flex-col justify-between">
                                            <div className="absolute right-0 top-0 p-3 opacity-10">
                                                <Zap className="h-16 w-16 text-emerald-600" />
                                            </div>
                                            <div className="z-10">
                                                <div className="rounded-2xl bg-emerald-50 w-fit p-2.5 text-emerald-600 border border-emerald-100">
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">Điện tháng này</p>
                                            </div>
                                            <div className="z-10">
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-3xl font-black text-slate-900 tracking-tight">
                                                        {isLoadingStats ? '...' : (stats?.totalKwh ? stats.totalKwh.toFixed(1) : '0')}
                                                    </p>
                                                    <span className="text-xs font-bold text-slate-400 uppercase">kWh</span>
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
                                        <div className="rounded-[28px] bg-[#F1F5F9] p-4 flex items-center gap-4 border border-white transition-all hover:bg-white hover:shadow-sm group h-[88px]">
                                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-all duration-300">
                                                <Route className="h-6 w-6 text-slate-600 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-900 leading-none">{stats?.totalTrips || 0}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1.5 tracking-widest">Lộ trình</p>
                                            </div>
                                        </div>
                                        <div className="rounded-[28px] bg-[#F1F5F9] p-4 flex items-center gap-4 border border-white transition-all hover:bg-white hover:shadow-sm group h-[88px]">
                                            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition-all duration-300">
                                                <BatteryCharging className="h-6 w-6 text-slate-600 group-hover:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-900 leading-none">{stats?.totalChargeSessions || 0}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1.5 tracking-widest">Lần sạc</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ══════════════════════════════════════════════
                    SUMMARY EXPENSES - PREMIUM REPORT STYLE
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && stats && !isLoadingStats && (
                                <section className="px-1">
                                    <div className="relative overflow-hidden rounded-[40px] bg-[#0F172A] p-7 text-white shadow-2xl shadow-slate-900/20">
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
                                                    { label: 'Năng lượng (kWh)', val: stats.totalFuelCost, icon: <Zap className="h-4 w-4" />, color: 'emerald' },
                                                    { label: 'Bảo dưỡng xe', val: stats.totalMaintenanceCost, icon: <Wrench className="h-4 w-4" />, color: 'amber' },
                                                    { label: 'Chi phí khác', val: stats.totalOtherExpenses, icon: <Receipt className="h-4 w-4" />, color: 'rose' },
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                                                                item.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
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
                                                className="mt-8 w-full py-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-xs uppercase tracking-[0.2em]"
                                            >
                                                Xem báo cáo chi tiết
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ══════════════════════════════════════════════
                    ALERT SECTION
                ══════════════════════════════════════════════ */}
                            {alerts.length > 0 && (
                                <section className="px-1 space-y-3">
                                    {alerts.map((alert, index) => {
                                        const { title, remainingText, isCritical } = getAlertInfo(alert)
                                        return (
                                            <div
                                                key={index}
                                                className={`group flex items-start gap-4 rounded-3xl p-5 border transition-all duration-300 ${isCritical
                                                    ? 'bg-red-50 border-red-100 shadow-sm'
                                                    : 'bg-amber-50 border-amber-100 shadow-sm'
                                                }`}
                                            >
                                                <div className={`shrink-0 rounded-2xl p-3 shadow-inner ${isCritical ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                    <AlertTriangle className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <p className={`text-sm font-black uppercase tracking-wide ${isCritical ? 'text-red-900' : 'text-amber-900'}`}>{title}</p>
                                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-tighter border ${isCritical ? 'bg-red-100 border-red-200 text-red-700' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
                                                            {remainingText}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs font-medium leading-relaxed opacity-80 ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>{alert.message}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </section>
                            )}

                            {/* ══════════════════════════════════════════════
                    MAINTENANCE TIMELINE
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && (maintProgress || maintDateProgress || selectedVehicle.insurance_expiry_date || selectedVehicle.inspection_expiry_date) && (
                                <section className="px-1">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-400">Dịch vụ & Bảo hiểm</h2>
                                    </div>

                                    <div className="space-y-4">
                                        {/* EV Maintenance Card */}
                                        {maintProgress && (
                                            <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 border border-slate-200 shadow-sm transition-all hover:border-emerald-200">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${maintProgress.isOverdue ? 'bg-red-100 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                            <Wrench className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">Bảo dưỡng định kỳ</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Mốc {maintProgress.target.toLocaleString()} km</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${maintProgress.isOverdue ? 'bg-red-500 border-red-600 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                            {maintProgress.isOverdue ? `Quá hạn!` : `Khuyên dùng`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-1.5">
                                                        <span className="text-slate-400">Tiến độ vận hành</span>
                                                        <span className={maintProgress.isOverdue ? 'text-red-500' : 'text-emerald-600'}>{maintProgress.pct}%</span>
                                                    </div>
                                                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 shadow-sm ${maintProgress.isOverdue ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
                                                            style={{ width: `${Math.min(100, Math.max(2, maintProgress.pct))}%` }}
                                                        />
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <p className={`text-xs font-black ${maintProgress.isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                                            {maintProgress.isOverdue ? `Đã quá ${Math.abs(maintProgress.kmLeft).toLocaleString()} km` : `Còn ${(maintProgress.kmLeft).toLocaleString()} km`}
                                                        </p>
                                                        <button onClick={() => navigate('/ev/maintenance')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                                                            Lịch sử <ChevronRight className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Legal Cards */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedVehicle.insurance_expiry_date && (() => {
                                                const d = new Date(selectedVehicle.insurance_expiry_date)
                                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                                return (
                                                    <div className="rounded-[32px] bg-white p-5 border border-slate-200 shadow-sm group">
                                                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white">
                                                            <Shield className="h-5 w-5" />
                                                        </div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Bảo hiểm</p>
                                                        <p className={`text-md font-black ${days < 30 ? 'text-red-600' : 'text-slate-900'}`}>
                                                            {days < 0 ? 'Hết hạn' : `Còn ${days} ngày`}
                                                        </p>
                                                    </div>
                                                )
                                            })()}
                                            {selectedVehicle.inspection_expiry_date && (() => {
                                                const d = new Date(selectedVehicle.inspection_expiry_date)
                                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                                return (
                                                    <div className="rounded-[32px] bg-white p-5 border border-slate-200 shadow-sm group">
                                                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm transition-all group-hover:bg-amber-600 group-hover:text-white">
                                                            <ClipboardCheck className="h-5 w-5" />
                                                        </div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Đăng kiểm</p>
                                                        <p className={`text-md font-black ${days < 30 ? 'text-red-600' : 'text-slate-900'}`}>
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
                    QUICK ACTIONS / MENU
                ══════════════════════════════════════════════ */}
                            {selectedVehicle && (
                                <section className="px-1">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-400">Tiện ích & Quản lý</h2>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'trips', label: 'Lộ trình', sub: 'Hành trình di chuyển', icon: <Route className="h-6 w-6" />, bg: 'bg-indigo-500' },
                                            { id: 'charging', label: 'Sạc pin', sub: 'Quản lý Pin & Sạc', icon: <Zap className="h-6 w-6" />, bg: 'bg-emerald-500' },
                                            { id: 'reports', label: 'Báo cáo', sub: 'Phân tích hiệu suất', icon: <BarChart3 className="h-6 w-6" />, bg: 'bg-blue-500' },
                                            { id: 'maintenance', label: 'Bảo dưỡng', sub: 'Lịch sử & Nhắc lịch', icon: <Wrench className="h-6 w-6" />, bg: 'bg-amber-500' },
                                            { id: 'expenses', label: 'Chi phí khác', sub: 'Gửi xe, Rửa xe...', icon: <Receipt className="h-6 w-6" />, bg: 'bg-rose-500' },
                                            { id: 'calculator', label: 'Công cụ EV', sub: 'Máy tính tiết kiệm', icon: <Calculator className="h-6 w-6" />, bg: 'bg-[#0F172A]' },
                                        ].map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => navigate(`/ev/${item.id}`)}
                                                className="group relative flex flex-col items-start gap-4 rounded-[32px] bg-white p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300"
                                            >
                                                <div className={`h-12 w-12 flex items-center justify-center rounded-2xl ${item.bg} text-white shadow-lg shadow-${item.bg.split('-')[1]}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                                                    {item.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-wide">{item.label}</p>
                                                    <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{item.sub}</p>
                                                </div>
                                            </button>
                                        ))}
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
