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

    // ── Maintenance progress data ─────────────────────────────────────────
    const maintProgress = (() => {
        if (!selectedVehicle?.next_maintenance_km) return null
        const odo = selectedVehicle.current_odometer
        const target = selectedVehicle.next_maintenance_km
        const kmLeft = target - odo

        let interval = selectedVehicle.maintenance_interval_km || (isMoto ? 3000 : 5000)
        // Nếu số km còn lại lớn hơn cả chu kỳ (có thể do set lần đầu), dùng luôn ODO gốc làm mốc
        if (kmLeft > interval) {
            interval = target
        }

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

        // Nếu số ngày còn lại vượt quá chu kỳ, nới chu kỳ ra bằng mốc ban đầu (ví dụ 1 năm)
        if (days > intervalDays) {
            intervalDays = Math.max(intervalDays, days + 30) // Tạm lấy khoảng dôi ra để progress bar không bị 0% hoàn toàn
        }

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

    // Module definitions — subtitle added for Settings-style cards
    const modules = [
        {
            id: 'trips',
            name: 'Lộ Trình',
            subtitle: 'Hành trình',
            icon: Route,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
        {
            id: 'fuel',
            name: isElectric ? 'Sạc Điện' : 'Nhiên Liệu',
            subtitle: isElectric ? 'Pin & sạc' : 'Xăng/Dầu',
            icon: isElectric ? BatteryCharging : Fuel,
            color: isElectric ? 'text-green-600' : 'text-orange-600',
            bgColor: isElectric ? 'bg-green-50' : 'bg-orange-50',
            electric: isElectric,
        },
        {
            id: 'maintenance',
            name: 'Bảo Dưỡng',
            subtitle: 'Lịch bảo trì',
            icon: Wrench,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
        },
        {
            id: 'expenses',
            name: 'Chi Phí Khác',
            subtitle: 'Phí & vé',
            icon: Receipt,
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
        },
        {
            id: 'reports',
            name: 'Báo Cáo',
            subtitle: 'Thống kê',
            icon: BarChart3,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
        },
    ]

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
                <HeaderBar variant="page" title="Quản Lý Phương Tiện" />
                <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-48 bg-gray-200 rounded-3xl" />
                        <div className="h-32 bg-gray-200 rounded-2xl" />
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
                        </div>
                    </div>
                    <div className="h-[150px] w-full flex-shrink-0"></div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar
                variant="page"
                title="Quản Lý Phương Tiện"
                customContent={
                    <button
                        onClick={() => navigate('/vehicles/add')}
                        className="flex items-center justify-center rounded-full bg-blue-500 p-2 shadow-md transition-all hover:bg-blue-600 hover:shadow-lg active:scale-95"
                        aria-label="Thêm xe mới"
                    >
                        <Plus className="h-5 w-5 text-white" />
                    </button>
                }
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-md mx-auto px-4 pb-4 pt-4">

                {/* ── Xe của bạn ──────────────────────────────────────────── */}
                <div className="mb-5">
                    <div className="mb-3 flex items-center justify-between px-1">
                        <h3 className="text-base font-bold text-slate-800">Xe của bạn</h3>
                        <span className="text-xs font-medium text-slate-500">{vehicles.length} xe</span>
                    </div>

                    <div className="relative">
                        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide">
                            {vehicles.map((vehicle) => {
                                const isSelected = selectedVehicle?.id === vehicle.id
                                const VehicleIcon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car
                                const gradientColor = vehicle.vehicle_type === 'motorcycle'
                                    ? 'from-orange-600 via-orange-700 to-red-800'
                                    : 'from-blue-700 via-blue-800 to-indigo-900'
                                const badgeColor = vehicle.vehicle_type === 'motorcycle' ? 'text-amber-300' : 'text-emerald-300'

                                return (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setSelectedId(vehicle.id)}
                                        className="group relative flex min-w-[calc(100%-1rem)] flex-shrink-0 snap-center transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] rounded-3xl overflow-hidden cursor-pointer"
                                    >
                                        <div className={`relative h-56 w-full overflow-hidden rounded-3xl p-5 ${isSelected ? 'shadow-2xl shadow-blue-500/30' : 'shadow-lg shadow-slate-300/40'} ${!vehicle.image_url ? `bg-gradient-to-br ${gradientColor}` : 'bg-slate-900'}`}>
                                            {/* Decorative patterns or Image */}
                                            {vehicle.image_url ? (
                                                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
                                                    <img src={vehicle.image_url} alt={vehicle.license_plate} className="h-full w-full object-cover opacity-60" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
                                                    <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
                                                    <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl" />
                                                    <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg" />
                                                    <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
                                                    <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
                                                        <path d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z" fill="white" />
                                                        <path d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z" fill="white" opacity="0.6" />
                                                    </svg>
                                                    <div className="absolute right-3 top-14 -translate-y-12 z-0 opacity-15">
                                                        <VehicleIcon className="h-32 w-32 text-white" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="relative z-10 flex h-full flex-col justify-between text-white">
                                                <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm shrink-0">
                                                            <VehicleIcon className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-lg font-bold uppercase tracking-widest text-white/90">{vehicle.license_plate}</p>
                                                            <p className="truncate text-xs font-medium text-white/80">{vehicle.brand} {vehicle.model}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <span className={`text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                                                            {vehicle.vehicle_type === 'motorcycle' ? 'Xe máy' : 'Ô tô'}
                                                        </span>
                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/vehicles/edit/${vehicle.id}`) }}
                                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white/60 hover:bg-white/30 transition-all">
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={(e) => toggleDefaultVehicle(e, vehicle.id, !!vehicle.is_default)}
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${vehicle.is_default ? 'bg-yellow-400 text-white shadow-lg' : 'bg-white/20 text-white/60 hover:bg-white/30'}`}>
                                                            <Star className={`h-4 w-4 ${vehicle.is_default ? 'fill-current' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Gauge className="h-5 w-5 text-white/70" />
                                                        <p className="truncate text-3xl font-black tracking-tight">{vehicle.current_odometer.toLocaleString()}</p>
                                                        <span className="text-sm font-medium text-white/70">km</span>
                                                        {/* Quick ODO update button */}
                                                        {isSelected && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setNewOdo(''); setShowOdoModal(true) }}
                                                                className="ml-auto flex items-center gap-1 rounded-xl bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/30 transition-all active:scale-95"
                                                            >
                                                                <Pencil className="h-3 w-3" /> Cập nhật km
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-white/70">Số km hiện tại</p>
                                                </div>

                                                <div className="mt-auto flex items-start justify-between gap-3 border-t border-white/20 pt-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-white/70">Năm SX</p>
                                                        <p className="mt-1 text-base font-bold">{vehicle.year || 'N/A'}</p>
                                                    </div>
                                                    <div className="h-12 w-px shrink-0 bg-white/20" />
                                                    <div className="flex-1 min-w-0 text-right">
                                                        <p className="text-xs text-white/70">Loại nhiên liệu</p>
                                                        <p className="mt-1 text-base font-bold">
                                                            {vehicle.fuel_type === 'petrol' ? 'Xăng' :
                                                                vehicle.fuel_type === 'diesel' ? 'Dầu' :
                                                                    vehicle.fuel_type === 'electric' ? 'Điện' : 'Hybrid'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute inset-0 rounded-3xl ring-2 ring-blue-400/30 ring-inset pointer-events-none" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {vehicles.length > 1 && (
                            <div className="mt-2 flex justify-center gap-1.5">
                                {vehicles.map((vehicle) => (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => setSelectedId(vehicle.id)}
                                        className={`h-1.5 rounded-full transition-all ${selectedVehicle?.id === vehicle.id ? 'w-6 bg-gradient-to-r from-blue-500 to-cyan-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
                                        aria-label={`Chọn xe ${vehicle.license_plate}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Thống kê nhanh theo loại xe ─────────────────────────── */}
                {selectedVehicle && (
                    <div className="mb-5">
                        {/* Header row */}
                        <div className="mb-3 flex items-center gap-2 px-1">
                            <div className={`rounded-lg p-1.5 ${isMoto ? 'bg-orange-100' : isElectric ? 'bg-green-100' : 'bg-blue-100'}`}>
                                {isMoto
                                    ? <Bike className="h-4 w-4 text-orange-600" />
                                    : isElectric
                                        ? <Zap className="h-4 w-4 text-green-600" />
                                        : <Car className="h-4 w-4 text-blue-600" />
                                }
                            </div>
                            <h3 className="text-base font-bold text-slate-800">
                                {isMoto ? 'Thống kê xe máy' : isElectric ? 'Thống kê xe điện' : 'Thống kê ô tô'}
                            </h3>
                        </div>

                        {/* Stats mini-grid */}
                        {isLoadingStats ? (
                            <div className="grid grid-cols-3 gap-2 animate-pulse">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-200" />)}
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-md py-3 px-2 text-center">
                                    <div className={`mb-1.5 rounded-xl p-2 ${isMoto ? 'bg-orange-50' : 'bg-blue-50'}`}>
                                        <Navigation className={`h-4 w-4 ${isMoto ? 'text-orange-500' : 'text-blue-500'}`} />
                                    </div>
                                    <p className="text-base font-black text-slate-800">{stats.totalDistance.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">km đã đi</p>
                                </div>
                                <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-md py-3 px-2 text-center">
                                    <div className="mb-1.5 rounded-xl bg-indigo-50 p-2">
                                        <Route className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <p className="text-base font-black text-slate-800">{stats.totalTrips}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">chuyến đi</p>
                                </div>
                                <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-md py-3 px-2 text-center">
                                    <div className="mb-1.5 rounded-xl bg-emerald-50 p-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <p className="text-base font-black text-slate-800">
                                        {stats.costPerKm > 0 ? Math.round(stats.costPerKm).toLocaleString() : '—'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">đ/km</p>
                                </div>
                            </div>
                        ) : null}

                        {/* Chi phí tháng này */}
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-50">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-bold text-slate-700">Chi phí tháng này</span>
                            </div>

                            {isLoadingStats ? (
                                <div className="animate-pulse space-y-2 p-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-slate-100" />)}
                                </div>
                            ) : stats ? (
                                <div className="divide-y divide-slate-50">
                                    {/* Fuel / Electric row */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`rounded-lg p-1.5 ${isElectric ? 'bg-green-50' : 'bg-orange-50'}`}>
                                                {isElectric
                                                    ? <Zap className="h-4 w-4 text-green-600" />
                                                    : <Fuel className="h-4 w-4 text-orange-600" />
                                                }
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">
                                                {isElectric ? 'Sạc điện' : 'Nhiên liệu'}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-bold ${isElectric ? 'text-green-600' : 'text-orange-600'}`}>
                                            {formatCurrency(stats.totalFuelCost)}
                                        </span>
                                    </div>

                                    {/* Maintenance row */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-gray-50 p-1.5">
                                                <Wrench className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">Bảo dưỡng</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-600">{formatCurrency(stats.totalMaintenanceCost)}</span>
                                    </div>

                                    {/* Other expenses row */}
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-rose-50 p-1.5">
                                                <Receipt className="h-4 w-4 text-rose-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">Phí khác</span>
                                        </div>
                                        <span className="text-sm font-bold text-rose-600">{formatCurrency(stats.totalOtherExpenses)}</span>
                                    </div>

                                    {/* Total row */}
                                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-bold text-slate-700">Tổng cộng</span>
                                        <span className="text-base font-black text-blue-600">
                                            {formatCurrency(stats.totalFuelCost + stats.totalMaintenanceCost + stats.totalOtherExpenses)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="px-4 py-6 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Bảo dưỡng & Hạn giấy tờ ──────────────────────────── */}
                {selectedVehicle && (maintProgress || maintDateProgress || selectedVehicle.insurance_expiry_date || selectedVehicle.inspection_expiry_date) && (
                    <div className="mb-5">
                        <div className="mb-3 px-1">
                            <h3 className="text-base font-bold text-slate-800">Thông tin liên quan</h3>
                        </div>
                        <div className="rounded-2xl bg-white border border-slate-100 shadow-md overflow-hidden divide-y divide-slate-50">

                            {/* Maintenance km progress bar */}
                            {maintProgress && (
                                <div className="px-4 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`rounded-lg p-1.5 ${maintProgress.isOverdue ? 'bg-red-100' : maintProgress.pct >= 80 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                                <Wrench className={`h-4 w-4 ${maintProgress.isOverdue ? 'text-red-600' : maintProgress.pct >= 80 ? 'text-amber-600' : 'text-gray-600'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Bảo dưỡng theo km</p>
                                                <p className="text-xs text-slate-400">Kỳ tiếp: {maintProgress.target.toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {maintProgress.isOverdue ? (
                                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                                    Quá {Math.abs(maintProgress.kmLeft).toLocaleString()} km
                                                </span>
                                            ) : (
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${maintProgress.pct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    Còn {maintProgress.kmLeft.toLocaleString()} km
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${maintProgress.isOverdue ? 'bg-red-500' : maintProgress.pct >= 80 ? 'bg-amber-400' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(1, maintProgress.pct))}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[10px] text-slate-400">{maintProgress.pct}% chu kỳ</span>
                                        <button onClick={() => navigate('/vehicles/maintenance')}
                                            className="text-[10px] font-semibold text-gray-600 hover:text-gray-800">
                                            Xem bảo dưỡng →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Maintenance date progress bar */}
                            {maintDateProgress && (
                                <div className="px-4 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`rounded-lg p-1.5 ${maintDateProgress.isOverdue ? 'bg-red-100' : maintDateProgress.pct >= 80 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                                <Calendar className={`h-4 w-4 ${maintDateProgress.isOverdue ? 'text-red-600' : maintDateProgress.pct >= 80 ? 'text-amber-600' : 'text-gray-600'}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Bảo dưỡng theo thẻ</p>
                                                <p className="text-xs text-slate-400">Kỳ tiếp: {maintDateProgress.target.toLocaleDateString('vi-VN')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {maintDateProgress.isOverdue ? (
                                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                                    Quá {Math.abs(maintDateProgress.daysLeft)} ngày
                                                </span>
                                            ) : (
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${maintDateProgress.pct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    Còn {maintDateProgress.daysLeft} ngày
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${maintDateProgress.isOverdue ? 'bg-red-500' : maintDateProgress.pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${Math.min(100, Math.max(1, maintDateProgress.pct))}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[10px] text-slate-400">{maintDateProgress.pct}% chu kỳ</span>
                                        <button onClick={() => navigate('/vehicles/maintenance')}
                                            className="text-[10px] font-semibold text-gray-600 hover:text-gray-800">
                                            Xem bảo dưỡng →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Insurance expiry */}
                            {selectedVehicle.insurance_expiry_date && (() => {
                                const d = new Date(selectedVehicle.insurance_expiry_date)
                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                const isOver = days < 0
                                const isWarn = days >= 0 && days <= 30
                                const pct = Math.max(0, Math.min(100, Math.round(((365 - Math.max(0, days)) / 365) * 100)))
                                return (
                                    <div className="px-4 py-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-lg p-1.5 ${isOver ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                    <Shield className={`h-4 w-4 ${isOver ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-blue-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">Bảo hiểm</p>
                                                    <p className="text-xs text-slate-400">Hạn: {d.toLocaleDateString('vi-VN')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOver ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {isOver ? `Quá ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-blue-400'}`}
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[10px] text-slate-400">{pct}% chu kỳ 1 năm</span>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Inspection expiry */}
                            {selectedVehicle.inspection_expiry_date && (() => {
                                const d = new Date(selectedVehicle.inspection_expiry_date)
                                const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
                                const isOver = days < 0
                                const isWarn = days >= 0 && days <= 30
                                const pct = Math.max(0, Math.min(100, Math.round(((365 - Math.max(0, days)) / 365) * 100)))
                                return (
                                    <div className="px-4 py-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`rounded-lg p-1.5 ${isOver ? 'bg-red-100' : isWarn ? 'bg-amber-100' : 'bg-teal-100'}`}>
                                                    <ClipboardCheck className={`h-4 w-4 ${isOver ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-teal-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">Đăng kiểm</p>
                                                    <p className="text-xs text-slate-400">Hạn: {d.toLocaleDateString('vi-VN')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isOver ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
                                                    {isOver ? `Quá ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-teal-400'}`}
                                                style={{ width: `${Math.min(100, pct)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[10px] text-slate-400">{pct}% chu kỳ 1 năm</span>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                )}

                {/* ── Alerts ──────────────────────────────────────────────── */}
                {alerts.length > 0 && (
                    <div className="mb-5 space-y-2">
                        {alerts.map((alert, index) => {
                            const { title, remainingText, isCritical } = getAlertInfo(alert)
                            return (
                                <div key={index} className={`flex items-start gap-3 rounded-2xl p-4 shadow-md ${isCritical ? 'bg-red-50' : 'bg-amber-50'}`}>
                                    <div className={`mt-0.5 rounded-lg p-1.5 ${isCritical ? 'bg-red-100' : 'bg-amber-100'}`}>
                                        <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-red-600' : 'text-amber-600'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>{title}</p>
                                        <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>{alert.message}</p>
                                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {remainingText}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* ── Chức năng — Settings-style 2-col grid ───────────────── */}
                {selectedVehicle && (
                    <div className="mb-6">
                        <div className="mb-3 px-1">
                            <h3 className="text-base font-bold text-slate-800">Chức năng quản lý</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {isMoto ? 'Xe máy' : isElectric ? 'Xe điện' : 'Ô tô'} · {selectedVehicle.license_plate}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {modules.map((module) => {
                                const Icon = module.icon
                                return (
                                    <button
                                        key={module.id}
                                        onClick={() => navigate(`/vehicles/${module.id}`)}
                                        className="group flex flex-col items-center gap-2.5 rounded-3xl bg-white border border-slate-100 px-4 py-5 shadow-md transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                                    >
                                        {/* Icon container */}
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${module.bgColor} transition-transform group-hover:scale-105`}
                                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04), inset 0 -1px 3px rgba(255,255,255,0.9)' }}>
                                            <Icon className={`h-7 w-7 ${module.color}`} />
                                        </div>

                                        {/* Text */}
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-800 leading-tight">
                                                {module.name}
                                                {'electric' in module && module.electric && (
                                                    <span className="ml-1.5 inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-black text-green-700 align-middle">EV</span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{module.subtitle}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            {/* ── ODO Quick Update Modal ─────────────────────────────── */}
            {showOdoModal && selectedVehicle && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className={`px-5 py-5 text-white flex items-center justify-between ${isMoto ? 'bg-orange-500' : isElectric ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/20 p-2 shadow-inner">
                                    <Gauge className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold leading-tight">Cập nhật số km</h3>
                                    <p className="text-[11px] font-medium text-white/80">{selectedVehicle.license_plate}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowOdoModal(false)} className="rounded-full bg-black/10 p-1.5 hover:bg-black/20 text-white transition-all active:scale-95">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-6">
                            <div className="mb-5 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 py-3 shadow-inner">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hiện tại</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black tracking-tight text-slate-800">{selectedVehicle.current_odometer.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-400">km</span>
                                </div>
                            </div>

                            <label className="mb-2 block text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Nhập số KM mới</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0"
                                    value={newOdo}
                                    onChange={e => setNewOdo(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveOdo()}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-tight text-slate-800 shadow-md transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-200"
                                />
                            </div>
                            {newOdo && Number(newOdo) > 0 && (
                                <p className={`mt-3 text-center text-xs font-bold ${Number(newOdo) > selectedVehicle.current_odometer ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {Number(newOdo) > selectedVehicle.current_odometer
                                        ? `Tăng thêm ${(Number(newOdo) - selectedVehicle.current_odometer).toLocaleString()} km`
                                        : 'ODO mới phải lớn hơn ODO hiện tại'}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 pb-6">
                            <button onClick={() => setShowOdoModal(false)}
                                className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95">
                                Hủy
                            </button>
                            <button onClick={handleSaveOdo} disabled={savingOdo || !newOdo || Number(newOdo) <= selectedVehicle.current_odometer}
                                className={`flex-[2] flex items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 active:scale-95 ${isMoto ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25' :
                                    isElectric ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' :
                                        'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                                    }`}>
                                {savingOdo ? 'Đang lưu...' : <><Check className="h-4 w-4" /> Cập nhật</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Maintenance Progress Widget (after stats) ─────────── */}

            <VehicleFooterNav
                onAddClick={() => navigate('/vehicles/fuel')}
                isElectricVehicle={isElectric}
                addLabel="Ghi chép"
                isMainPage={true}
            />
        </div>
    )
}
