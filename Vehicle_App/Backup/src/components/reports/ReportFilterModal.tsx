import { FaTimes, FaFilter } from 'react-icons/fa'
import { CategoryFilter } from './CategoryFilter'
import type { CategoryRecord, CategoryWithChildren } from '../../lib/categoryService'
import type { WalletRecord } from '../../lib/walletService'

type FilterType = 'all' | 'Thu' | 'Chi'

interface ReportFilterModalProps {
    isOpen: boolean
    onClose: () => void
    categories: CategoryRecord[]
    parentCategories?: CategoryWithChildren[]
    selectedCategoryIds: string[]
    onCategoryToggle: (id: string) => void
    onClearCategories: () => void
    typeFilter: FilterType
    onTypeFilterChange: (type: FilterType) => void
    onReset: () => void
    onCategoryClick?: (category: CategoryRecord | CategoryWithChildren) => void

    // Advance Filters
    wallets: WalletRecord[]
    selectedWalletIds: string[]
    onWalletToggle: (id: string) => void
    
    minAmount: string
    maxAmount: string
    onAmountChange: (min: string, max: string) => void
}

export const ReportFilterModal = ({
    isOpen,
    onClose,
    categories,
    parentCategories,
    selectedCategoryIds,
    onCategoryToggle,
    onClearCategories,
    typeFilter,
    onTypeFilterChange,
    onReset,
    onCategoryClick,
    wallets,
    selectedWalletIds,
    onWalletToggle,
    minAmount,
    maxAmount,
    onAmountChange
}: ReportFilterModalProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 mt-12 sm:mt-0 max-h-[80vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FaFilter className="text-slate-500" />
                        Bộ lọc báo cáo
                    </h3>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
                    {/* Type Filter */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-slate-900">Loại giao dịch</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {(['all', 'Thu', 'Chi'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => onTypeFilterChange(type)}
                                    className={`rounded-3xl py-2 text-sm font-semibold transition-all ${typeFilter === type
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {type === 'all' ? 'Tất cả' : type === 'Thu' ? 'Thu nhập' : 'Chi tiêu'}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Category Filter */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-900">Hạng mục</h4>
                            {selectedCategoryIds.length > 0 && (
                                <button
                                    onClick={onClearCategories}
                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                >
                                    Bỏ chọn tất cả
                                </button>
                            )}
                        </div>
                        <CategoryFilter
                            categories={categories}
                            parentCategories={parentCategories}
                            selectedCategoryIds={selectedCategoryIds}
                            onCategoryToggle={onCategoryToggle}
                            onClearAll={onClearCategories}
                            type={typeFilter}
                            onCategoryClick={onCategoryClick}
                        />
                    </section>

                    {/* Wallets Filter */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-900">Ví / Nguồn tiền</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {wallets.map(wallet => {
                                const isSelected = selectedWalletIds.includes(wallet.id)
                                return (
                                    <button
                                        key={wallet.id}
                                        onClick={() => onWalletToggle(wallet.id)}
                                        className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        {wallet.name}
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                    
                    {/* Price Range */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-slate-900">Khoảng số tiền</h4>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Tối thiểu"
                                    value={minAmount}
                                    onChange={(e) => onAmountChange(e.target.value, maxAmount)}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₫</span>
                            </div>
                            <span className="text-slate-400 font-bold">-</span>
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Tối đa"
                                    value={maxAmount}
                                    onChange={(e) => onAmountChange(minAmount, e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₫</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="border-t border-slate-100 p-4 flex gap-3">
                    <button
                        onClick={onReset}
                        className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Đặt lại
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
                    >
                        Áp dụng
                    </button>
                </div>
            </div>
        </div>
    )
}

