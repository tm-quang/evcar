import { useState, useEffect } from 'react'
import { X, Save, DollarSign, Gift } from 'lucide-react'
import { getAllFuelPrices, updateFuelPrice, type FuelType, getElectricDiscountSettings, setElectricDiscountSettings } from '../../lib/ev/chargingPriceService'
import { useNotification } from '../../contexts/notificationContext.helpers'

interface ChargingPriceSettingsProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
    petrol_a95: 'Xăng A95',
    petrol_e5: 'Xăng E5',
    diesel: 'Dầu Diesel',
    electric: 'Giá điện mặc định',
}

const FUEL_TYPE_UNITS: Record<FuelType, string> = {
    petrol_a95: 'đ/lít',
    petrol_e5: 'đ/lít',
    diesel: 'đ/lít',
    electric: 'đ/kWh',
}

export function ChargingPriceSettings({ isOpen, onClose, onSave }: ChargingPriceSettingsProps) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [prices, setPrices] = useState<Record<FuelType, number>>({
        electric: 3858,
    })
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('vnd')
    const [discountValue, setDiscountValue] = useState('')

    useEffect(() => {
        if (isOpen) {
            loadPrices()
        }
    }, [isOpen])

    const loadPrices = async () => {
        try {
            const currentPrices = await getAllFuelPrices()
            setPrices(currentPrices)
            const d = getElectricDiscountSettings()
            setDiscountMode(d.mode)
            setDiscountValue(d.value)
        } catch (error) {
            console.error('Error loading prices:', error)
            showError('Không thể tải giá hiện tại')
        }
    }

    const handlePriceChange = (fuelType: FuelType, value: string) => {
        const numValue = parseInt(value) || 0
        setPrices((prev) => ({
            ...prev,
            [fuelType]: numValue,
        }))
    }

    const handleSave = async () => {
        if (prices.electric <= 0) {
            showError('Giá điện phải lớn hơn 0')
            return
        }

        setLoading(true)
        try {
            // Only update electricity price to database
            await updateFuelPrice('electric', prices.electric)

            // Save discount settings
            setElectricDiscountSettings({
                mode: discountMode,
                value: discountValue.replace(/[^\d]/g, '')
            })

            success('Đã cập nhật cài đặt thành công!')
            onSave()
            onClose()
        } catch (error) {
            console.error('Error saving prices:', error)
            showError('Không thể lưu giá. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Cài đặt giá
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Price Inputs */}
                <div className="space-y-4 mb-6">

                    {/* Điện Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-blue-600">Đơn giá điện năng</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Thiết lập chung</span>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-blue-200">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 mb-1 block">
                                    Đơn giá (VNĐ)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={prices.electric}
                                        onChange={(e) => handlePriceChange('electric', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-lg font-black text-slate-800 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50"
                                        min="0"
                                        step="100"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                        đ/kWh
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="mb-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[13px] leading-relaxed text-blue-800">
                        💡 <strong>Giá điện</strong> và <strong>mức ưu đãi</strong> bạn thiết lập tại đây sẽ được hệ thống tự động áp dụng khi ghi chép lịch sử sạc mới.
                    </p>
                </div>

                {/* Electric Discount Section */}
                <div className="mb-8 border-t border-slate-100 pt-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-red-600">Giảm giá & Ưu đãi mặc định</h4>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-medium">Tự động áp dụng cho tất cả lần sạc mới</p>
                        </div>
                        <div className="flex rounded-xl overflow-hidden border-2 border-red-50 p-1 bg-red-50/50">
                            <button
                                onClick={() => { setDiscountMode('pct'); setDiscountValue('') }}
                                className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all duration-300 ${discountMode === 'pct' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-red-500'
                                    }`}>%</button>
                            <button
                                onClick={() => { setDiscountMode('vnd'); setDiscountValue('') }}
                                className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all duration-300 ${discountMode === 'vnd' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-red-500'
                                    }`}>VNĐ</button>
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500">
                            <Gift className="h-4 w-4" />
                        </div>
                        <input
                            type="text"
                            value={discountMode === 'vnd'
                                ? (discountValue ? parseInt(discountValue || '0').toLocaleString('vi-VN') : '')
                                : discountValue
                            }
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, '')
                                if (discountMode === 'pct') {
                                    setDiscountValue(parseInt(raw) > 100 ? '100' : raw)
                                } else {
                                    setDiscountValue(raw)
                                }
                            }}
                            className="w-full rounded-2xl border-2 border-red-50 bg-red-50/20 px-4 py-3.5 pl-10 pr-12 text-lg font-black text-red-600 transition-all focus:border-red-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-red-50"
                            placeholder={discountMode === 'pct' ? 'Ví dụ: 50' : 'Số tiền mặc định'}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-red-400">
                            {discountMode === 'pct' ? '%' : 'VNĐ'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-green-500 to-green-500 px-4 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Lưu cài đặt
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

