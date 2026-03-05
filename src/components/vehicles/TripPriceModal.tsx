import React, { useState, useEffect } from 'react'
import { X, Save, TrendingUp } from 'lucide-react'
import { getTripPricePerKm, updateTripPricePerKm } from '../../lib/vehicles/tripPriceService'
import { useNotification } from '../../contexts/notificationContext.helpers'

export function TripPriceModal({
    isOpen,
    onClose,
    vehicleId,
    onSuccess
}: {
    isOpen: boolean
    onClose: () => void
    vehicleId: string
    onSuccess: (newPrice: number) => void
}) {
    const { success, error: showError } = useNotification()
    const [priceStr, setPriceStr] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen && vehicleId) {
            getTripPricePerKm(vehicleId).then(price => {
                setPriceStr(price > 0 ? price.toString() : '')
            }).catch(console.error)
        }
    }, [isOpen, vehicleId])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const priceNum = Number(priceStr)
        if (priceNum < 0) {
            showError('Giá cước không hợp lệ.')
            return
        }

        setIsLoading(true)
        try {
            await updateTripPricePerKm(vehicleId, priceNum)
            success('Đã lưu cài đặt giá cước!')
            onSuccess(priceNum)
            onClose()
        } catch (error) {
            showError('Lỗi cập nhật giá cước. Vui lòng thử lại.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
            <div className="w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 mt-12 sm:mt-0 max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto safe-area-bottom pointer-events-auto">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 pt-3 pb-4 text-white">
                    {/* Mobile Handle */}
                    <div className="flex w-full justify-center pb-3 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full">
                        <div className="h-1.5 w-12 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="rounded-xl bg-white/20 p-2">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold flex-1">Cài đặt giá cước /km</h3>
                        <button
                            onClick={onClose}
                            className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Đơn giá áp dụng (đ/km)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={0}
                                    value={priceStr}
                                    onChange={(e) => setPriceStr(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3.5 pl-4 pr-12 text-lg font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
                                    placeholder="Nhập đơn giá"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <span className="text-sm font-bold text-slate-400">₫</span>
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500 italic">
                                Sẽ được dùng để tính tự động thành tiền khi kết thúc lộ trình.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    <span>Lưu cài đặt</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
