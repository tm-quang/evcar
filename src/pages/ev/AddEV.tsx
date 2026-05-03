import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Bike, Zap, Check } from 'lucide-react'
import { createVehicle, updateVehicle, type VehicleRecord } from '../../lib/ev/vehicleService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { useAppearance } from '../../contexts/AppearanceContext'
import HeaderBar from '../../components/layout/HeaderBar'
import { ModalFooterButtons } from '../../components/ui/ModalFooterButtons'
import { ImageUpload } from '../../components/ev/ImageUpload'

interface AddEVProps {
    vehicle?: VehicleRecord
    onSuccess?: () => void
}

const VINFAST_MODELS = {
    car: [
        { name: 'VF 3', variants: ['Eco', 'Plus'] },
        { name: 'VF 5', variants: ['Plus'] },
        { name: 'VF 6', variants: ['Eco', 'Plus'] },
        { name: 'VF 7', variants: ['Eco', 'Plus (trần thép)', 'Plus (trần kính)'] },
        { name: 'VF 8', variants: ['Eco', 'Plus'] },
        { name: 'VF 9', variants: ['Eco', 'Plus'] },
        { name: 'Minio Green', variants: [] },
        { name: 'Herio Green', variants: [] },
        { name: 'Nerio Green', variants: [] },
        { name: 'Limo Green', variants: [] },
        { name: 'EC Van', variants: ['Tiêu chuẩn', 'Nâng cao', 'Nâng cao + cửa trượt'] },
        { name: 'VF MPV 7', variants: [] },
    ],
    motorcycle: [
        { name: 'Evo 200', variants: [] },
        { name: 'Evo 200 Lite', variants: [] },
        { name: 'Feliz S', variants: [] },
        { name: 'Feliz II', variants: [] },
        { name: 'Klara S', variants: [] },
        { name: 'Vento S', variants: [] },
        { name: 'Theon S', variants: [] },
    ]
}

export default function AddEV({ vehicle, onSuccess }: AddEVProps) {
    const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const { isDarkMode } = useAppearance()
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        license_plate: vehicle?.license_plate || '',
        vehicle_type: vehicle?.vehicle_type || 'car' as const,
        brand: vehicle?.brand || 'VinFast',
        model: vehicle?.model || '',
        year: vehicle?.year || new Date().getFullYear(),
        color: vehicle?.color || '',
        current_odometer: vehicle?.current_odometer || 0,
        fuel_type: vehicle?.fuel_type || 'electric' as const,
        insurance_expiry_date: vehicle?.insurance_expiry_date || '',
        inspection_expiry_date: vehicle?.inspection_expiry_date || '',
        next_maintenance_km: vehicle?.next_maintenance_km || undefined,
        next_maintenance_date: vehicle?.next_maintenance_date || '',
        image_url: vehicle?.image_url || null,
    })

    const [selectedModelName, setSelectedModelName] = useState<string | null>(null)
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

    const currentModels = VINFAST_MODELS[formData.vehicle_type]

    const handleModelSelect = (modelName: string) => {
        setSelectedModelName(modelName)
        const modelData = currentModels.find(m => m.name === modelName)

        const defaultImages: Record<string, string> = {
            'VF 3': '/images/EVCar/vf3.png',
            'VF 5': '/images/EVCar/vf5.png',
            'VF 6': '/images/EVCar/vf6.png',
            'VF 7': '/images/EVCar/VF7.png',
        }
        const newImageUrl = defaultImages[modelName] || null

        if (modelData && modelData.variants.length > 0) {
            setSelectedVariant(null) // Wait for variant selection
            setFormData(prev => {
                const isCurrentUrlDefault = !prev.image_url || Object.values(defaultImages).includes(prev.image_url)
                return {
                    ...prev,
                    image_url: isCurrentUrlDefault ? (newImageUrl || prev.image_url) : prev.image_url
                }
            })
        } else {
            setSelectedVariant(null)
            setFormData(prev => {
                const isCurrentUrlDefault = !prev.image_url || Object.values(defaultImages).includes(prev.image_url)
                return {
                    ...prev,
                    brand: 'VinFast',
                    model: `VinFast ${modelName}`,
                    image_url: isCurrentUrlDefault ? (newImageUrl || prev.image_url) : prev.image_url
                }
            })
        }
    }

    const handleVariantSelect = (variant: string) => {
        setSelectedVariant(variant)
        setFormData(prev => ({
            ...prev,
            brand: 'VinFast',
            model: `VinFast ${selectedModelName} ${variant}`
        }))
    }

    const selectedModelData = useMemo(() =>
        currentModels.find(m => m.name === selectedModelName),
        [selectedModelName, currentModels]
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.license_plate || !formData.model) {
            showError('Vui lòng nhập biển số và loại xe')
            return
        }

        setLoading(true)
        try {
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
                navigate('/ev')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể lưu thông tin xe'
            showError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`flex h-full flex-col overflow-hidden ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }}>
            <HeaderBar
                variant="page"
                title={vehicle ? 'Cập nhật xe' : 'Thêm xe mới'}
            />

            <main className="flex-1 overflow-y-auto overscroll-contain pb-32">
                <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-12">
                    <form onSubmit={handleSubmit} id="vehicle-form" className="space-y-6">
                        {/* Header Section */}
                        <div className="text-center py-2">
                            <div className={`mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full shadow-md ${isDarkMode ? 'bg-blue-600 shadow-none' : 'bg-emerald-600 shadow-emerald-200'}`}>
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                {vehicle ? 'Cập nhật thông tin xe' : 'Thêm xe mới của bạn'}
                            </h2>
                            <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quản lý phương tiện thông minh & hiệu quả</p>
                        </div>

                        {/* Image Upload Card */}
                        <div className={`rounded-3xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-300 shadow-slate-100'}`}>
                            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">Hình ảnh phương tiện</h3>
                            <ImageUpload
                                value={formData.image_url}
                                onChange={(url) => setFormData({ ...formData, image_url: url })}
                                label="Chọn ảnh đại diện cho xe (Tùy chọn)"
                            />
                        </div>

                        {/* Vehicle Type Card */}
                        <div className={`rounded-3xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-300 shadow-slate-100'}`}>
                            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">Loại phương tiện</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { type: 'motorcycle', label: 'Xe máy', icon: Bike },
                                    { type: 'car', label: 'Xe ô tô', icon: Car },
                                ].map(({ type, label, icon: Icon }) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, vehicle_type: type as any }))
                                            setSelectedModelName(null)
                                            setSelectedVariant(null)
                                        }}
                                        className={`flex flex-col items-center gap-3 rounded-3xl border-2 p-5 transition-all active:scale-95 ${formData.vehicle_type === type
                                            ? (isDarkMode ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50/50')
                                            : (isDarkMode ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700' : 'border-slate-100 bg-slate-50/50 hover:border-slate-300')
                                            }`}
                                    >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-[2rem] shadow-inner ${formData.vehicle_type === type ? 'bg-blue-600 text-white' : (isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-400')
                                            }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className={`text-sm font-black ${formData.vehicle_type === type ? 'text-blue-600' : 'text-slate-500'}`}>
                                            {label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Selection Card */}
                        <div className={`rounded-3xl p-6 shadow-md border ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-300 shadow-slate-100'}`}>
                            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">Chọn nhanh mẫu xe</h3>

                            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-4 scrollbar-hide">
                                {currentModels.map((m) => (
                                    <button
                                        key={m.name}
                                        type="button"
                                        onClick={() => handleModelSelect(m.name)}
                                        className={`flex shrink-0 snap-center flex-col items-center justify-center min-w-[100px] rounded-3xl border-2 px-4 py-3 transition-all ${selectedModelName === m.name
                                            ? (isDarkMode ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-500 bg-emerald-100')
                                            : (isDarkMode ? 'border-slate-800 bg-slate-800 hover:border-slate-700' : 'border-slate-100 bg-white hover:border-emerald-300')
                                            }`}
                                    >
                                        <span className={`text-sm font-extrabold ${selectedModelName === m.name ? 'text-emerald-600' : 'text-slate-600'}`}>
                                            {m.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {selectedModelData && selectedModelData.variants.length > 0 && (
                                <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                    <p className="mb-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Chọn phiên bản</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedModelData.variants.map((v) => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => handleVariantSelect(v)}
                                                className={`flex items-center gap-2 rounded-3xl px-4 py-2.5 text-xs font-bold transition-all border-2 ${selectedVariant === v
                                                    ? (isDarkMode ? 'bg-emerald-600 border-emerald-600 text-white shadow-none' : 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200')
                                                    : (isDarkMode ? 'bg-slate-800 border-slate-800 text-slate-400 hover:border-emerald-500/50' : 'bg-slate-50 border-slate-50 text-slate-600 hover:border-emerald-200')
                                                    }`}
                                            >
                                                {v}
                                                {selectedVariant === v && <Check className="h-4 w-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Detailed Info Card */}
                        <div className={`rounded-3xl p-7 shadow-md border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-300 shadow-slate-100'}`}>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Thông tin cơ bản</h3>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                                        Biển số xe <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.license_plate}
                                        onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                                        placeholder="Ví dụ: 68A-123.45"
                                        className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 text-base font-bold transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500 placeholder:text-slate-400'}`}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Hãng xe</label>
                                        <input
                                            type="text"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 text-base font-bold transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Loại xe <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 text-base font-bold transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Năm SX</label>
                                        <input
                                            type="number"
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 text-base font-bold transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 focus:border-blue-500' : 'bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Màu sắc</label>
                                        <input
                                            type="text"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            placeholder="Nhập màu xe"
                                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 text-base font-bold transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500' : 'bg-slate-50 text-slate-800 focus:bg-white focus:border-blue-500 placeholder:text-slate-400'}`}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center justify-between">
                                        Số Kilomet hiện tại
                                        <span className="text-blue-500 lowercase">(km)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.current_odometer}
                                            onChange={(e) => setFormData({ ...formData, current_odometer: parseInt(e.target.value) || 0 })}
                                            min="0"
                                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 pr-16 text-2xl font-black transition-all focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-blue-400 focus:border-blue-500' : 'bg-slate-50 text-blue-600 focus:bg-white focus:border-blue-500'}`}
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <div className="rounded-full bg-blue-50 p-2">
                                                <Zap className="h-5 w-5 text-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Papers & Reminders Card */}
                        <div className={`rounded-3xl p-7 shadow-md border space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-300 shadow-slate-100'}`}>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Giấy tờ & Bảo dưỡng</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 ml-1">Hạn bảo hiểm</label>
                                    <input
                                        type="date"
                                        value={formData.insurance_expiry_date}
                                        onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                                        className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-700'}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-slate-500 ml-1">Hạn đăng kiểm</label>
                                    <input
                                        type="date"
                                        value={formData.inspection_expiry_date}
                                        onChange={(e) => setFormData({ ...formData, inspection_expiry_date: e.target.value })}
                                        className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-700'}`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-500 ml-1">Mốc bảo dưỡng kế tiếp</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        placeholder="Số km"
                                        value={formData.next_maintenance_km || ''}
                                        onChange={(e) => setFormData({ ...formData, next_maintenance_km: parseInt(e.target.value) || undefined })}
                                        className={`rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-700'}`}
                                    />
                                    <input
                                        type="date"
                                        value={formData.next_maintenance_date}
                                        onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                                        className={`rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-50 text-slate-700'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </form >
                </div >
            </main >

            <ModalFooterButtons
                onCancel={() => navigate(-1)}
                onConfirm={() => { }}
                confirmText={vehicle ? 'Cập nhật' : 'Thêm xe'}
                isSubmitting={loading}
                confirmButtonType="submit"
                formId="vehicle-form"
                fixed={true}
            />
        </div >
    )
}
