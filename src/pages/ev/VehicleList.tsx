import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Plus,
    Car,
    Bike,
    Trash2,
    Star,
    Zap,
    Gauge,
    ChevronRight,
    AlertCircle,
    Edit,
    RotateCw
} from 'lucide-react'
import { useAppearance } from '../../contexts/AppearanceContext'
import { useVehicles, useSetDefaultVehicle, vehicleKeys } from '../../lib/ev/useVehicleQueries'
import { deleteVehicle } from '../../lib/ev/vehicleService'
import { useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'

export default function VehicleList() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { success, error: showError } = useNotification()
    const { data: vehicles = [], isLoading, refetch } = useVehicles()
    const { isDarkMode } = useAppearance()
    const setDefaultMutation = useSetDefaultVehicle()

    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSetDefault = async (id: string, currentDefault: boolean) => {
        if (currentDefault) return // Already default

        setIsProcessing(true)
        try {
            await setDefaultMutation.mutateAsync({ id, isDefault: true })
            success('Đã đặt làm xe mặc định')
        } catch (error) {
            showError('Không thể thay đổi xe mặc định')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeleteVehicle = async () => {
        if (!isDeleting) return

        setIsProcessing(true)
        try {
            await deleteVehicle(isDeleting)
            queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
            success('Đã xóa xe khỏi danh sách')
        } catch (error) {
            showError('Lỗi khi xóa xe. Vui lòng thử lại.')
        } finally {
            setIsProcessing(false)
            setIsDeleting(null)
        }
    }

    if (isLoading) {
        return (
            <div className={`flex h-screen flex-col overflow-hidden ${isDarkMode ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
                <HeaderBar variant="page" title="Danh sách xe" />
                <div className="flex flex-1 items-center justify-center">
                    <RotateCw className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            </div>
        )
    }

    return (
        <div className={`flex h-screen flex-col overflow-hidden ${isDarkMode ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
            <HeaderBar
                variant="page"
                title="Quản lý xe"
                onReload={() => { void refetch() }}
            />

            <main className="flex-1 overflow-y-auto min-h-0 overscroll-contain pb-28">
                <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-12">

                    {/* Summary Card */}
                    <div className={`rounded-3xl bg-gradient-to-br p-6 text-white ${isDarkMode ? 'from-slate-800 to-slate-900 border border-slate-700 shadow-none' : 'from-emerald-600 to-emerald-700 shadow-xl shadow-blue-200'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Tổng cộng</p>
                                <h2 className="text-3xl font-black">{vehicles.length} <span className="text-lg font-medium opacity-70 border-l border-white/20 ml-2 pl-2">Phương tiện</span></h2>
                            </div>
                            <div className={`h-14 w-14 rounded-3xl backdrop-blur-md flex items-center justify-center ${isDarkMode ? 'bg-slate-700/50' : 'bg-white/20'}`}>
                                <Car className="h-7 w-7" />
                            </div>
                        </div>
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={() => navigate('/ev/add')}
                        className={`group flex w-full items-center justify-between rounded-3xl p-5 border transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-none hover:border-blue-500/50' : 'bg-white border-slate-300 shadow-md shadow-slate-200/50 hover:border-blue-200'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-3xl transition-colors ${isDarkMode ? 'bg-slate-700 text-blue-400 group-hover:bg-blue-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white shadow-inner'}`}>
                                <Plus className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Thêm xe mới</p>
                                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Thêm phương tiện của bạn</p>
                            </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-slate-600 group-hover:text-blue-400' : 'text-slate-300 group-hover:text-blue-500'}`} />
                    </button>

                    {/* Vehicles List */}
                    <div className="space-y-4">
                        <h3 className="px-1 text-sm font-black uppercase tracking-widest text-slate-400">Danh sách của bạn</h3>

                        {vehicles.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                <Car className="mb-4 h-12 w-12 opacity-20" />
                                <p className="text-sm font-medium">Chưa có xe nào được thêm</p>
                            </div>
                        ) : (
                            vehicles.map((v) => (
                                <div
                                    key={v.id}
                                    className={`group relative overflow-hidden rounded-3xl p-5 border transition-all ${isDarkMode
                                        ? `bg-slate-900 shadow-none ${v.is_default ? 'border-blue-500' : 'border-slate-800'}`
                                        : `bg-white shadow-md ${v.is_default ? 'border-blue-500 shadow-blue-100' : 'border-slate-300'}`
                                        }`}
                                >
                                    {v.is_default && (
                                        <div className="absolute top-0 right-0 rounded-bl-2xl bg-blue-500 px-4 py-1.5 text-[12px] font-black uppercase text-white shadow-sm">
                                            Mặc định
                                        </div>
                                    )}

                                    <div className="flex items-start gap-4">
                                        {/* Avatar/Type Icon */}
                                        <div className={`relative h-16 w-26 overflow-hidden rounded-xl shadow-inner shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                            {v.image_url ? (
                                                <img src={v.image_url} alt={v.model} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className={`flex h-full w-full items-center justify-center ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                                                    {v.vehicle_type === 'motorcycle' ? <Bike className="h-8 w-8" /> : <Car className="h-8 w-8" />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className={`flex items-center gap-1.5 truncate text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                                {v.license_plate}
                                            </h4>
                                            <p className={`truncate text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {v.model}
                                            </p>
 
                                            <div className="mt-3 flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{v.current_odometer.toLocaleString()} km</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Zap className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Xe Điện</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`mt-5 flex items-center justify-between border-t pt-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSetDefault(v.id, !!v.is_default)}
                                                disabled={v.is_default || isProcessing}
                                                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${v.is_default
                                                    ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600')
                                                    : (isDarkMode ? 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-blue-400' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600')
                                                    }`}
                                            >
                                                <Star className={`h-3.5 w-3.5 ${v.is_default ? (isDarkMode ? 'fill-blue-400' : 'fill-blue-600') : ''}`} />
                                                Mặc định
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/ev/edit/${v.id}`)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-3xl transition-all ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-50'}`}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setIsDeleting(v.id)}
                                                className={`flex h-9 w-9 items-center justify-center rounded-3xl transition-all ${isDarkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-50'}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Help Section */}
                    <div className={`mt-4 rounded-3xl p-5 border flex gap-4 ${isDarkMode ? 'bg-amber-500/10 border-amber-500/20 shadow-none' : 'bg-amber-50 border-amber-100'}`}>
                        <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                        <div>
                            <p className={`text-sm font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>Thông tin bảo mật</p>
                            <p className={`text-xs leading-relaxed mt-0.5 ${isDarkMode ? 'text-amber-500/80' : 'text-amber-700'}`}>Mọi thông tin về phương tiện đều được lưu trữ an toàn trên hệ thống.</p>
                        </div>
                    </div>
                </div>
            </main>

            <ConfirmDialog
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                onConfirm={handleDeleteVehicle}
                title="Xóa phương tiện?"
                message="Dữ liệu về lộ trình và chi phí liên quan đến xe này vẫn sẽ được giữ lại, nhưng xe sẽ không còn xuất hiện trong danh sách."
                confirmText="Xác nhận xóa"
            />

            {isProcessing && <LoadingOverlay isOpen={true} />}
        </div>
    )
}
