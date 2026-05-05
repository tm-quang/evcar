import { useState, useEffect } from 'react'
import { X, Save, DollarSign, Gift } from 'lucide-react'
import { getAllChargingPrices, saveElectricChargingSettings, type ChargingType, getElectricDiscountSettings } from '../../lib/ev/chargingPriceService'
import { useNotification } from '../../contexts/notificationContext.helpers'

interface ChargingPriceSettingsProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
}


export function ChargingPriceSettings({ isOpen, onClose, onSave }: ChargingPriceSettingsProps) {
    const { success, error: showError } = useNotification()
    const [loading, setLoading] = useState(false)
    const [prices, setPrices] = useState<Record<ChargingType, number>>({
        electric: 3858,
    } as Record<ChargingType, number>)
    const [discountMode, setDiscountMode] = useState<'pct' | 'vnd'>('vnd')
    const [discountValue, setDiscountValue] = useState('')

    useEffect(() => {
        if (isOpen) {
            loadPrices()
        }
    }, [isOpen])

    const loadPrices = async () => {
        try {
            const currentPrices = await getAllChargingPrices()
            setPrices(currentPrices)
            const d = await getElectricDiscountSettings()
            setDiscountMode(d.mode)
            setDiscountValue(d.value)
        } catch (error) {
            console.error('Error loading prices:', error)
            showError('Không thể tải giá hiện tại')
        }
    }

    const handlePriceChange = (chargingType: ChargingType, value: string) => {
        const numValue = parseInt(value) || 0
        setPrices((prev) => ({
            ...prev,
            [chargingType]: numValue,
        }))
    }

    const handleSave = async () => {
        if (prices.electric <= 0) {
            showError('Giá điện phải lớn hơn 0')
            return
        }

        setLoading(true)
        try {
            // Save both electricity price and discount settings in one atomic operation
            await saveElectricChargingSettings({
                price: prices.electric,
                discountMode: discountMode,
                discountValue: discountValue.replace(/[^\d]/g, '')
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
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[3px] transition-all animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Handle Indicator */}
                <div className="h-1.5 w-12 rounded-full bg-slate-200 mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

                {/* Header */}
                <div className="px-6 pt-2 pb-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Đơn giá sạc tại trạm Vinfast
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cấu hình tham số sạc pin</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-full bg-slate-100 p-2.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50 transition-all active:scale-90"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    {/* Đơn giá Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Đơn giá sạc điện</h4>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-blue-200">
                            <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">
                                Đơn giá VNĐ
                            </label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={prices.electric}
                                    onChange={(e) => handlePriceChange('electric', e.target.value)}
                                    className="w-full rounded-3xl border-2 border-slate-100 bg-white px-5 py-4 pr-20 text-2xl font-black text-slate-800 transition-all focus:border-blue-400 focus:outline-none focus:ring-8 focus:ring-blue-50/50"
                                    min="0"
                                    step="100"
                                    placeholder="0"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-3xl">
                                    đ/kWh
                                </span>
                            </div>
                        </div>

                        {/* Info Tip */}
                        <div className="rounded-3xl bg-red-50/50 border border-dashed border-red-500 p-4 flex gap-3">
                            <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold text-white">i</span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-red-600/80">
                                <strong>Giá điện</strong> và <strong>mức ưu đãi</strong> bạn thiết lập tại đây sẽ được hệ thống tự động áp dụng khi ghi chép lịch sử sạc mới.
                            </p>
                        </div>
                    </div>

                    {/* Electric Discount Section */}
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Giảm giá & Ưu đãi</h4>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 italic">Áp dụng mặc định cho sạc mới</p>
                            </div>
                            <div className="flex rounded-3xl overflow-hidden border border-red-100 p-1 bg-red-50/30">
                                <button
                                    onClick={() => { setDiscountMode('pct'); setDiscountValue('') }}
                                    className={`px-4 py-1.5 text-[10px] font-black rounded-3xl transition-all duration-300 ${discountMode === 'pct' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-red-500'
                                        }`}>%</button>
                                <button
                                    onClick={() => { setDiscountMode('vnd'); setDiscountValue('') }}
                                    className={`px-4 py-1.5 text-[10px] font-black rounded-3xl transition-all duration-300 ${discountMode === 'vnd' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-red-500'
                                        }`}>VNĐ</button>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-red-400">
                                <Gift className="h-5 w-5" />
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
                                className="w-full rounded-3xl border-2 border-red-50 bg-red-50/10 px-5 py-2 pl-14 pr-16 text-2xl font-black text-red-600 transition-all focus:border-red-300 focus:bg-white focus:outline-none focus:ring-8 focus:ring-red-50/50 placeholder:text-red-200"
                                placeholder={discountMode === 'pct' ? 'Ví dụ: 50' : 'Số tiền...'}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-red-300 bg-red-50 px-2 py-1 rounded-lg">
                                {discountMode === 'pct' ? '%' : 'VNĐ'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-slate-50 shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full rounded-3xl bg-emerald-500 px-6 py-4 font-black text-sm text-white transition-all hover:bg-emerald-600 active:scale-95 shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2.5"
                    >
                        {loading ? (
                            <>
                                <div className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                                Đang lưu cấu hình...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Xác nhận lưu cài đặt
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

