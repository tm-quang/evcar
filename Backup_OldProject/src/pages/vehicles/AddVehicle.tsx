import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Bike } from 'lucide-react'
import { createVehicle, updateVehicle, type VehicleRecord } from '../../lib/vehicles/vehicleService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../../components/layout/HeaderBar'
import { ModalFooterButtons } from '../../components/ui/ModalFooterButtons'
import { ImageUpload } from '../../components/vehicles/ImageUpload'

interface AddVehicleProps {
    vehicle?: VehicleRecord
    onSuccess?: () => void
}

export default function AddVehicle({ vehicle, onSuccess }: AddVehicleProps) {
    const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        license_plate: vehicle?.license_plate || '',
        vehicle_type: vehicle?.vehicle_type || 'car' as const,
        brand: vehicle?.brand || '',
        model: vehicle?.model || '',
        year: vehicle?.year || new Date().getFullYear(),
        color: vehicle?.color || '',
        current_odometer: vehicle?.current_odometer || 0,
        fuel_type: vehicle?.fuel_type || 'petrol' as const,
        insurance_expiry_date: vehicle?.insurance_expiry_date || '',
        inspection_expiry_date: vehicle?.inspection_expiry_date || '',
        next_maintenance_km: vehicle?.next_maintenance_km || undefined,
        next_maintenance_date: vehicle?.next_maintenance_date || '',
        image_url: vehicle?.image_url || null,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.license_plate || !formData.model) {
            showError('Vui lòng nhập biển số và loại xe')
            return
        }

        setLoading(true)
        try {
            // Clean up data: convert empty strings to null for optional fields
            const cleanedData = {
                ...formData,
                brand: formData.brand || undefined,
                year: formData.year || undefined,
                color: formData.color || undefined,
                insurance_expiry_date: formData.insurance_expiry_date || undefined,
                inspection_expiry_date: formData.inspection_expiry_date || undefined,
                next_maintenance_km: formData.next_maintenance_km || undefined,
                next_maintenance_date: formData.next_maintenance_date || undefined,
                image_url: formData.image_url || undefined,
            }

            if (vehicle) {
                await updateVehicle(vehicle.id, cleanedData as any)
                success('Cập nhật thông tin xe thành công!')
            } else {
                await createVehicle(cleanedData as any)
                success('Thêm xe mới thành công!')
            }

            if (onSuccess) {
                onSuccess()
            } else {
                navigate('/vehicles')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể lưu thông tin xe'
            showError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar
                variant="page"
                title={vehicle ? 'Cập nhật xe' : 'Thêm xe mới'}
            />

            <main className="flex-1 overflow-y-auto overscroll-contain pb-4">
                <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-2 pb-4">
                    <form onSubmit={handleSubmit} id="vehicle-form" className="space-y-4">
                        {/* Header */}
                        <div className="mb-6 text-center">
                            <div className="mb-4 inline-flex rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-4">
                                <Car className="h-8 w-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {vehicle ? 'Cập nhật thông tin xe' : 'Thêm xe mới của bạn'}
                            </h2>
                            <p className="text-sm text-slate-600">Điền đầy đủ thông tin để quản lý tốt hơn</p>
                        </div>

                        {/* Vehicle Image */}
                        <div className="rounded-2xl bg-white p-4 shadow-lg mb-4">
                            <h3 className="mb-3 font-semibold text-slate-700">Hình ảnh phương tiện</h3>
                            <ImageUpload
                                value={formData.image_url}
                                onChange={(url) => setFormData({ ...formData, image_url: url })}
                                label="Chọn ảnh đại diện cho xe"
                            />
                        </div>

                        {/* Vehicle Type Selection */}
                        <div className="rounded-2xl bg-white p-4 shadow-lg mb-4">
                            <h3 className="mb-3 font-semibold text-slate-700">Loại phương tiện</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, vehicle_type: 'motorcycle' })}
                                    className={`rounded-2xl border-2 p-4 transition-all ${formData.vehicle_type === 'motorcycle'
                                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                                        : 'border-slate-200 bg-white hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className={`rounded-3xl p-2 ${formData.vehicle_type === 'motorcycle'
                                                ? 'bg-blue-500'
                                                : 'bg-slate-100'
                                                }`}
                                        >
                                            <Bike className={`h-8 w-8 ${formData.vehicle_type === 'motorcycle' ? 'text-white' : 'text-slate-600'}`} />
                                        </div>
                                        <span
                                            className={`text-sm font-semibold ${formData.vehicle_type === 'motorcycle'
                                                ? 'text-blue-700'
                                                : 'text-slate-700'
                                                }`}
                                        >
                                            Xe máy
                                        </span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, vehicle_type: 'car' })}
                                    className={`rounded-2xl border-2 p-4 transition-all ${formData.vehicle_type === 'car'
                                        ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                                        : 'border-slate-200 bg-white hover:border-blue-300'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className={`rounded-3xl p-2 ${formData.vehicle_type === 'car' ? 'bg-blue-500' : 'bg-slate-100'
                                                }`}
                                        >
                                            <Car
                                                className={`h-8 w-8 ${formData.vehicle_type === 'car' ? 'text-white' : 'text-slate-600'
                                                    }`}
                                            />
                                        </div>
                                        <span
                                            className={`text-sm font-semibold ${formData.vehicle_type === 'car' ? 'text-blue-700' : 'text-slate-700'
                                                }`}
                                        >
                                            Xe ô tô
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="rounded-2xl bg-white p-4 shadow-lg">
                            <h3 className="mb-4 font-semibold text-slate-700">Thông tin cơ bản</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Biển số xe <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.license_plate}
                                        onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                                        placeholder="Biển số xe"
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Hãng xe</label>
                                        <input
                                            type="text"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                            placeholder="Nhập hãng xe"
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Loại xe <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            placeholder="Nhập tên xe"
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Năm sản xuất</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                            min="Năm"
                                            max={new Date().getFullYear() + 1}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Màu sắc</label>
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            placeholder="Nhập màu sắc"
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Số km hiện tại</label>
                                        <input
                                            type="number"
                                            value={formData.current_odometer}
                                            onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) })}
                                            min="0"
                                            placeholder="0"
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Loại nhiên liệu</label>
                                        <select
                                            value={formData.fuel_type}
                                            onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value as any })}
                                            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="petrol">Xăng</option>
                                            <option value="diesel">Dầu diesel</option>
                                            <option value="electric">Điện</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Insurance & Inspection */}
                        <div className="rounded-2xl bg-white p-4 shadow-lg">
                            <h3 className="mb-4 font-semibold text-slate-700">Bảo hiểm & Đăng kiểm</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Hết hạn bảo hiểm</label>
                                    <input
                                        type="date"
                                        value={formData.insurance_expiry_date}
                                        onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Hết hạn đăng kiểm</label>
                                    <input
                                        type="date"
                                        value={formData.inspection_expiry_date}
                                        onChange={(e) => setFormData({ ...formData, inspection_expiry_date: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Maintenance Reminders */}
                        <div className="rounded-2xl bg-white p-4 shadow-lg">
                            <h3 className="mb-4 font-semibold text-slate-700">Nhắc nhở bảo dưỡng</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Bảo dưỡng lần (km)</label>
                                    <input
                                        type="number"
                                        value={formData.next_maintenance_km || ''}
                                        onChange={(e) => setFormData({ ...formData, next_maintenance_km: e.target.value ? parseInt(e.target.value) : undefined })}
                                        min="0"
                                        placeholder="10000"
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Bảo dưỡng lần (ngày)</label>
                                    <input
                                        type="date"
                                        value={formData.next_maintenance_date}
                                        onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="h-[150px] w-full flex-shrink-0"></div>
            </main>

            {/* Fixed Footer with Action Buttons */}
            < ModalFooterButtons
                onCancel={() => navigate(-1)
                }
                onConfirm={() => { }}
                confirmText={loading ? 'Đang lưu...' : vehicle ? 'Cập nhật' : 'Thêm xe'}
                isSubmitting={loading}
                disabled={loading}
                confirmButtonType="submit"
                formId="vehicle-form"
                fixed={true}
            />
        </div >
    )
}

