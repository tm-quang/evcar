import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Car,
    Bike,
    Route,
    Fuel,
    Wrench,
    Receipt,
    BarChart3,
    Plus,
    AlertTriangle,
    Calendar,
    Star,
    Pencil,
    Gauge,
    Zap,
    BatteryCharging,
    TrendingUp,
    Navigation,
    Check,
    X,
    Shield,
    ClipboardCheck,
    Calculator,
    ChevronRight,
} from 'lucide-react'
import { useVehicles, useVehicleStats, useVehicleAlerts, useSetDefaultVehicle, vehicleKeys } from '../../lib/vehicles/useVehicleQueries'
import { updateVehicle } from '../../lib/vehicles/vehicleService'
import type { VehicleAlert } from '../../lib/vehicles/vehicleService'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { VehicleFooterNav } from '../../components/vehicles/VehicleFooterNav'
import { useVehicleStore } from '../../store/useVehicleStore'

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
    const { selectedVehicleId: selectedId, setSelectedVehicleId: setSelectedId } = useVehicleStore()
    const [showOdoModal, setShowOdoModal] = useState(false)
    const [newOdo, setNewOdo] = useState('')
    const [savingOdo, setSavingOdo] = useState(false)

    const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles()
    const { data: stats, isLoading: isLoadingStats } = useVehicleStats(selectedId || undefined)
    const { data: alerts = [] } = useVehicleAlerts(selectedId || undefined)
    const setDefaultMutation = useSetDefaultVehicle()

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

    // Color scheme per vehicle type
    const accentColor = isMoto
        ? { from: 'from-orange-500', via: 'via-orange-600', to: 'to-red-700', text: 'text-orange-500', bg: 'bg-orange-500', light: 'bg-orange-50', badge: 'text-amber-300', shadow: 'shadow-orange-500/30' }
        : isElectric
            ? { from: 'from-emerald-500', via: 'via-green-600', to: 'to-teal-700', text: 'text-emerald-500', bg: 'bg-emerald-500', light: 'bg-emerald-50', badge: 'text-green-300', shadow: 'shadow-emerald-500/30' }
            : { from: 'from-blue-500', via: 'via-blue-600', to: 'to-indigo-700', text: 'text-blue-500', bg: 'bg-blue-500', light: 'bg-blue-50', badge: 'text-blue-300', shadow: 'shadow-blue-500/30' }

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
                variant="page"
                title="Phương tiện"
                customContent={
                    <button
                        onClick={() => navigate('/vehicles/add')}
                        className="flex items-center justify-center rounded-full bg-blue-500 p-2 shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 hover:shadow-xl active:scale-95"
                        aria-label="Thêm xe mới"
                    >
                        <Plus className="h-5 w-5 text-white" />
                    </button>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-3 space-y-4">

                {/* ══════════════════════════════════════════════
                    VEHICLE HERO CAROUSEL
                ══════════════════════════════════════════════ */}
                <section>
                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {vehicles.map((vehicle) => {
                            const isSelected = selectedVehicle?.id === vehicle.id
                            const VehicleIcon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car
                            const isEV = vehicle.fuel_type === 'electric'
                            const isMc = vehicle.vehicle_type === 'motorcycle'
                            const grad = isMc
                                ? 'from-orange-500 via-orange-700 to-red-800'
                                : isEV
                                    ? 'from-emerald-500 via-green-700 to-teal-800'
                                    : 'from-blue-600 via-blue-800 to-indigo-900'

                            return (
                                <div
                                    key={vehicle.id}
                                    onClick={() => setSelectedId(vehicle.id)}
                                    className="group relative flex min-w-[calc(100%-1rem)] flex-shrink-0 snap-center rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
                                >
                                    {/* Background */}
                                    <div className={`relative h-52 w-full overflow-hidden rounded-3xl p-5 ${!vehicle.image_url ? `bg-gradient-to-br ${grad}` : 'bg-slate-900'}`}>
                                        {vehicle.image_url ? (
                                            <div className="absolute inset-0 z-0">
                                                <img src={vehicle.image_url} alt={vehicle.license_plate} className="h-full w-full object-cover opacity-60" />
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
                                                        <p className="text-xs font-medium text-white/70 truncate">{vehicle.brand} {vehicle.model}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/vehicles/edit/${vehicle.id}`) }}
                                                        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 transition-all border border-white/20">
                                                        <Pencil className="h-3.5 w-3.5 text-white" />
                                                    </button>
                                                    <button onClick={(e) => toggleDefaultVehicle(e, vehicle.id, !!vehicle.is_default)}
                                                        className={`h-8 w-8 flex items-center justify-center rounded-full transition-all border ${vehicle.is_default ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/40' : 'bg-white/15 backdrop-blur-sm border-white/20 hover:bg-white/25'}`}>
                                                        <Star className={`h-3.5 w-3.5 ${vehicle.is_default ? 'text-white fill-current' : 'text-white'}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ODO */}
                                            <div>
                                                <div className="flex items-end gap-3 mb-1">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <Gauge className="h-4 w-4 text-white/60 mb-0.5" />
                                                        <span className="text-4xl font-black tracking-tighter">{vehicle.current_odometer.toLocaleString()}</span>
                                                        <span className="text-sm font-semibold text-white/60">km</span>
                                                    </div>
                                                    {isSelected && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setNewOdo(''); setShowOdoModal(true) }}
                                                            className="mb-1 flex items-center gap-1 rounded-xl bg-white/20 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition-all active:scale-95 border border-white/20"
                                                        >
                                                            <Pencil className="h-3 w-3" /> Cập nhật
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-white/50 font-medium">Số km hiện tại</p>
                                            </div>

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
                                                    <p className="text-[10px] text-white/50">Nhiên liệu</p>
                                                    <p className="text-sm font-black">
                                                        {vehicle.fuel_type === 'electric' ? '⚡ Điện' : vehicle.fuel_type === 'petrol' ? '⛽ Xăng' : vehicle.fuel_type === 'diesel' ? '🛢 Dầu' : '🔋 Hybrid'}
                                                    </p>
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
                {selectedVehicle && (
                    <section>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <div className={`rounded-xl p-1.5 ${accentColor.light}`}>
                                    {isMoto ? <Bike className={`h-4 w-4 ${accentColor.text}`} /> : isElectric ? <Zap className={`h-4 w-4 ${accentColor.text}`} /> : <Car className={`h-4 w-4 ${accentColor.text}`} />}
                                </div>
                                <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                                    {isMoto ? 'Thống kê xe máy' : isElectric ? 'Thống kê xe điện (EV)' : 'Thống kê ô tô'}
                                </h2>
                            </div>
                        </div>

                        {/* Stats cards */}
                        {isLoadingStats ? (
                            <div className={`grid ${isElectric ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                                {[...Array(isElectric ? 4 : 3)].map((_, i) => (
                                    <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
                                ))}
                            </div>
                        ) : stats ? (
                            <div className={`grid ${isElectric ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                                {/* km đã đi */}
                                <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-md p-4 overflow-hidden relative">
                                    <div className={`absolute -bottom-3 -right-3 h-14 w-14 rounded-full opacity-8 ${isMoto ? 'bg-orange-200' : 'bg-blue-100'}`} />
                                    <div className={`mb-2 w-fit rounded-xl p-1.5 ${isMoto ? 'bg-orange-50' : 'bg-blue-50'}`}>
                                        <Navigation className={`h-3.5 w-3.5 ${isMoto ? 'text-orange-500' : 'text-blue-500'}`} />
                                    </div>
                                    <p className="text-lg font-black text-slate-800 leading-none">{stats.totalDistance.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide">km đã đi</p>
                                </div>

                                {/* Chuyến đi */}
                                <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-md p-4 overflow-hidden relative">
                                    <div className="absolute -bottom-3 -right-3 h-14 w-14 rounded-full bg-indigo-100 opacity-8" />
                                    <div className="mb-2 w-fit rounded-xl bg-indigo-50 p-1.5">
                                        <Route className="h-3.5 w-3.5 text-indigo-500" />
                                    </div>
                                    <p className="text-lg font-black text-slate-800 leading-none">{stats.totalTrips}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide">chuyến đi</p>
                                </div>

                                {/* đ/km (hoặc Lần sạc cho xe điện) */}
                                {isElectric ? (
                                    <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-md p-4 overflow-hidden relative">
                                        <div className="absolute -bottom-3 -right-3 h-14 w-14 rounded-full bg-green-100 opacity-8" />
                                        <div className="mb-2 w-fit rounded-xl bg-green-50 p-1.5">
                                            <BatteryCharging className="h-3.5 w-3.5 text-green-500" />
                                        </div>
                                        <p className="text-lg font-black text-slate-800 leading-none">
                                            {stats.totalChargeSessions || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide">Lần sạc</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-md p-4 overflow-hidden relative">
                                        <div className="absolute -bottom-3 -right-3 h-14 w-14 rounded-full bg-green-100 opacity-8" />
                                        <div className="mb-2 w-fit rounded-xl bg-green-50 p-1.5">
                                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                        </div>
                                        <p className="text-lg font-black text-slate-800 leading-none">
                                            {stats.costPerKm > 0 ? Math.round(stats.costPerKm).toLocaleString() : '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide">đ/km</p>
                                    </div>
                                )}

                                {/* kWh đã sạc – chỉ EV */}
                                {isElectric && (
                                    <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-md p-4 overflow-hidden relative">
                                        <div className="absolute -bottom-3 -right-3 h-14 w-14 rounded-full bg-amber-100 opacity-8" />
                                        <div className="mb-2 w-fit rounded-xl bg-amber-50 p-1.5">
                                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                                        </div>
                                        <p className="text-lg font-black text-slate-800 leading-none">
                                            {stats.totalKwh ? Number(stats.totalKwh.toFixed(1)).toLocaleString() : '0'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wide">kWh đã sạc</p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    CHI PHÍ THÁNG NÀY
                ══════════════════════════════════════════════ */}
                {selectedVehicle && stats && !isLoadingStats && (
                    <section className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-50">
                            <div className="rounded-xl bg-blue-50 p-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-black text-slate-800">Chi phí tháng này</p>
                                <p className="text-[10px] text-slate-400">Tổng hợp từ tất cả các mục</p>
                            </div>
                            <span className="text-base font-black text-blue-600">
                                {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                            </span>
                        </div>

                        <div className="px-5 py-3 space-y-1">
                            {/* Fuel / Electric */}
                            <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className={`rounded-xl p-1.5 ${isElectric ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                                        {isElectric ? <Zap className="h-3.5 w-3.5 text-emerald-500" /> : <Fuel className="h-3.5 w-3.5 text-orange-500" />}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">{isElectric ? 'Sạc điện' : 'Nhiên liệu'}</span>
                                </div>
                                <span className={`text-sm font-black ${isElectric ? 'text-emerald-600' : 'text-orange-600'}`}>{formatCurrency(stats.totalFuelCost)}</span>
                            </div>

                            {/* Maintenance */}
                            <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-slate-50 p-1.5">
                                        <Wrench className="h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Bảo dưỡng</span>
                                </div>
                                <span className="text-sm font-black text-slate-600">{formatCurrency(stats.totalMaintenanceCost)}</span>
                            </div>

                            {/* Other expenses */}
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-red-50 p-1.5">
                                        <Receipt className="h-3.5 w-3.5 text-red-400" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Phí khác</span>
                                </div>
                                <span className="text-sm font-black text-red-500">{formatCurrency(stats.totalOtherExpenses)}</span>
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
                    BẢO DƯỠNG & GIẤY TỜ
                ══════════════════════════════════════════════ */}
                {selectedVehicle && (maintProgress || maintDateProgress || selectedVehicle.insurance_expiry_date || selectedVehicle.inspection_expiry_date) && (
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Mốc bảo dưỡng & Giấy tờ</h2>
                        </div>
                        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-50">

                            {/* Maintenance km */}
                            {maintProgress && (
                                <div className="px-5 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`rounded-xl p-1.5 ${maintProgress.isOverdue ? 'bg-red-100' : maintProgress.pct >= 80 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                <Wrench className={`h-3.5 w-3.5 ${maintProgress.isOverdue ? 'text-red-600' : maintProgress.pct >= 80 ? 'text-amber-600' : 'text-slate-500'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Bảo dưỡng theo km</p>
                                                <p className="text-[10px] text-slate-400">Mốc tiếp: {maintProgress.target.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${maintProgress.isOverdue ? 'bg-red-100 text-red-700' : maintProgress.pct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {maintProgress.isOverdue ? `Quá ${Math.abs(maintProgress.kmLeft).toLocaleString()} km` : `Còn ${maintProgress.kmLeft.toLocaleString()} km`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${maintProgress.isOverdue ? 'bg-red-500' : maintProgress.pct >= 80 ? 'bg-amber-400' : 'bg-blue-400'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, maintProgress.pct))}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[10px] text-slate-400">{maintProgress.pct}% chu kỳ</span>
                                        <button onClick={() => navigate('/vehicles/maintenance')} className="text-[10px] font-bold text-blue-500 flex items-center gap-0.5">
                                            Xem chi tiết <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Maintenance date */}
                            {maintDateProgress && (
                                <div className="px-5 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`rounded-xl p-1.5 ${maintDateProgress.isOverdue ? 'bg-red-100' : maintDateProgress.pct >= 80 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                <Calendar className={`h-3.5 w-3.5 ${maintDateProgress.isOverdue ? 'text-red-600' : maintDateProgress.pct >= 80 ? 'text-amber-600' : 'text-slate-500'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Bảo dưỡng theo tháng</p>
                                                <p className="text-[10px] text-slate-400">Mốc tiếp: {maintDateProgress.target.toLocaleDateString('vi-VN')}</p>
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${maintDateProgress.isOverdue ? 'bg-red-100 text-red-700' : maintDateProgress.pct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                            {maintDateProgress.isOverdue ? `Quá ${Math.abs(maintDateProgress.daysLeft)} ngày` : `Còn ${maintDateProgress.daysLeft} ngày`}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${maintDateProgress.isOverdue ? 'bg-red-500' : maintDateProgress.pct >= 80 ? 'bg-amber-400' : 'bg-green-400'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, maintDateProgress.pct))}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1.5 block">{maintDateProgress.pct}% chu kỳ</span>
                                </div>
                            )}

                            {/* Insurance */}
                            {selectedVehicle.insurance_expiry_date && (() => {
                                const d = new Date(selectedVehicle.insurance_expiry_date)
                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                const isOver = days < 0
                                const isWarn = days >= 0 && days <= 30
                                const pct = Math.max(0, Math.min(100, Math.round(((365 - Math.max(0, days)) / 365) * 100)))
                                return (
                                    <div className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`rounded-xl p-1.5 ${isOver ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-blue-50'}`}>
                                                    <Shield className={`h-3.5 w-3.5 ${isOver ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-blue-500'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">Bảo hiểm</p>
                                                    <p className="text-[10px] text-slate-400">Hết hạn: {d.toLocaleDateString('vi-VN')}</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isOver ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isOver ? `Quá ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1.5 block">{pct}% chu kỳ 1 năm</span>
                                    </div>
                                )
                            })()}

                            {/* Inspection */}
                            {selectedVehicle.inspection_expiry_date && (() => {
                                const d = new Date(selectedVehicle.inspection_expiry_date)
                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                const isOver = days < 0
                                const isWarn = days >= 0 && days <= 30
                                const pct = Math.max(0, Math.min(100, Math.round(((365 - Math.max(0, days)) / 365) * 100)))
                                return (
                                    <div className="px-5 py-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`rounded-xl p-1.5 ${isOver ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-teal-50'}`}>
                                                    <ClipboardCheck className={`h-3.5 w-3.5 ${isOver ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-teal-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">Đăng kiểm</p>
                                                    <p className="text-[10px] text-slate-400">Hết hạn: {d.toLocaleDateString('vi-VN')}</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isOver ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                                                {isOver ? `Quá ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-teal-400'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1.5 block">{pct}% chu kỳ 1 năm</span>
                                    </div>
                                )
                            })()}
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════════════
                    CHỨC NĂNG QUẢN LÝ
                ══════════════════════════════════════════════ */}
                {selectedVehicle && (
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Chức năng thêm</h2>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {isMoto ? 'Xe máy' : isElectric ? 'Xe điện (EV)' : 'Ô tô'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Hành trình */}
                            <button
                                onClick={() => navigate('/vehicles/trips')}
                                className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-95"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50">
                                    <Route className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">Hành trình</p>
                                    <p className="text-[10px] text-slate-400">Lịch sử đi lại</p>
                                </div>
                            </button>

                            {/* Nhiên liệu / Sạc */}
                            <button
                                onClick={() => navigate('/vehicles/fuel')}
                                className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-95"
                            >
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isElectric ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                                    {isElectric
                                        ? <BatteryCharging className="h-5 w-5 text-emerald-600" />
                                        : <Fuel className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">{isElectric ? 'Sạc điện' : 'Nhiên liệu'}</p>
                                    <p className="text-[10px] text-slate-400">{isElectric ? 'Pin & sạc' : 'Xăng / Dầu'}</p>
                                </div>
                            </button>

                            {/* Bảo dưỡng */}
                            <button
                                onClick={() => navigate('/vehicles/maintenance')}
                                className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-95"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                                    <Wrench className="h-5 w-5 text-slate-600" />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">Bảo dưỡng</p>
                                    <p className="text-[10px] text-slate-400">Lịch bảo trì</p>
                                </div>
                            </button>

                            {/* Chi phí khác */}
                            <button
                                onClick={() => navigate('/vehicles/expenses')}
                                className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-95"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
                                    <Receipt className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">Chi Phí Khác</p>
                                    <p className="text-[10px] text-slate-400">Phí & vé</p>
                                </div>
                            </button>

                            {/* Báo cáo */}
                            <button
                                onClick={() => navigate('/vehicles/reports')}
                                className="group flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-95"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate">Báo Cáo</p>
                                    <p className="text-[10px] text-slate-400">Thống kê</p>
                                </div>
                            </button>

                            {/* Tính toán EV – chỉ xe điện */}
                            {isElectric && (
                                <button
                                    onClick={() => navigate('/vehicles/calculator')}
                                    className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 border border-orange-500 shadow-md p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(20,184,166,0.45)] active:scale-95 col-span-1"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                                        <Calculator className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-black text-white truncate">Tính Toán</p>
                                            <span className="shrink-0 rounded-full bg-white/25 px-1.5 py-0.5 text-[8px] font-black text-white">EV</span>
                                        </div>
                                        <p className="text-[10px] text-white/70">Công cụ EV</p>
                                    </div>
                                </button>
                            )}
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
                        <div className={`px-5 py-5 text-white flex items-center justify-between shrink-0 ${isMoto ? 'bg-orange-500' : isElectric ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/20 p-2.5">
                                    <Gauge className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black">Cập nhật số km</h3>
                                    <p className="text-xs text-white/70">{selectedVehicle.license_plate}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowOdoModal(false)} className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-all">
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
                onAddClick={() => navigate('/vehicles/fuel')}
                isElectricVehicle={isElectric}
                addLabel="Ghi chép"
                isMainPage={true}
            />
        </div>
    )
}
