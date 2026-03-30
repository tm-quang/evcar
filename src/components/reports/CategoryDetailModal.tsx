import { useMemo } from 'react'
import { FaTimes, FaCalendarAlt, FaWallet, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import type { TransactionRecord } from '../../lib/transactionService'
import type { CategoryRecord, CategoryWithChildren } from '../../lib/categoryService'
import type { WalletRecord } from '../../lib/walletService'
import { CategoryIcon } from '../ui/CategoryIcon'
// Removed unused import
import type { DateRangeType } from '../../pages/Reports'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface CategoryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  category: CategoryRecord | CategoryWithChildren | null
  transactions: TransactionRecord[]
  wallets: WalletRecord[]
  dateRange: {
    start: string
    end: string
    type: DateRangeType
  }
  allCategories?: CategoryRecord[] // For finding children categories
}

const RANGE_LABEL_MAP: Record<DateRangeType, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
  custom: 'Tùy chỉnh',
}

export const CategoryDetailModal = ({
  isOpen,
  onClose,
  category,
  transactions,
  wallets,
  dateRange,
  allCategories = [],
}: CategoryDetailModalProps) => {

  // Get all category IDs to filter (parent + children if it's a parent category)
  const categoryIds = useMemo(() => {
    if (!category) return []
    
    const ids = [category.id]
    
    // If it's a parent category with children, include all children IDs
    if ('children' in category && category.children && category.children.length > 0) {
      category.children.forEach(child => {
        ids.push(child.id)
      })
    } else {
      // If it's a regular category, check if it has children in allCategories
      const children = allCategories.filter(cat => cat.parent_id === category.id)
      children.forEach(child => {
        ids.push(child.id)
      })
    }
    
    return ids
  }, [category, allCategories])

  // Filter transactions by category (parent + children) and date range
  const categoryTransactions = useMemo(() => {
    if (!category || categoryIds.length === 0) return []
    
    // Filter by category IDs (parent + children)
    let filtered = transactions.filter((t) => categoryIds.includes(t.category_id))
    
    // Filter by date range
    if (dateRange.start && dateRange.end) {
      // Parse dates - dateRange.start and dateRange.end are in format 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss'
      const startDateStr = dateRange.start.split('T')[0] // Remove time if present
      const endDateStr = dateRange.end.split('T')[0] // Remove time if present
      
      filtered = filtered.filter((t) => {
        // transaction_date is in format 'YYYY-MM-DD' from database
        const transactionDateStr = t.transaction_date.split('T')[0]
        
        // Simple string comparison works for YYYY-MM-DD format
        const isInRange = transactionDateStr >= startDateStr && transactionDateStr <= endDateStr
        
        return isInRange
      })
    }
    
    return filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [transactions, categoryIds, dateRange.start, dateRange.end])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = categoryTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const income = categoryTransactions
      .filter((t) => t.type === 'Thu')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const expense = categoryTransactions
      .filter((t) => t.type === 'Chi')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const count = categoryTransactions.length

    return { total, income, expense, count }
  }, [categoryTransactions])

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionRecord[]>()
    
    categoryTransactions.forEach((transaction) => {
      const dateKey = formatDate(transaction.transaction_date)
      const existing = groups.get(dateKey) || []
      existing.push(transaction)
      groups.set(dateKey, existing)
    })

    return Array.from(groups.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }, [categoryTransactions])


  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
      <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 mt-12 sm:mt-0 max-h-[80vh] safe-area-bottom" onClick={e => e.stopPropagation()}>
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <CategoryIcon iconId={category.icon_id} iconUrl={category.icon_url} className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <FaCalendarAlt className="h-3 w-3" />
                {RANGE_LABEL_MAP[dateRange.type]}
                {'children' in category && category.children && category.children.length > 0 && (
                  <span className="ml-1">({category.children.length} danh mục con)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <FaTimes />
          </button>
        </div>

        {/* Statistics */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white shrink-0">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <FaArrowUp className="h-3 w-3" />
                </div>
                <p className="text-xs font-semibold text-slate-500">Thu nhập</p>
              </div>
              <p className="text-lg font-bold text-green-600">+{formatCurrency(stats.income)}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <FaArrowDown className="h-3 w-3" />
                </div>
                <p className="text-xs font-semibold text-slate-500">Chi tiêu</p>
              </div>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(stats.expense)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-100 mb-1">Tổng cộng</p>
                <p className="text-2xl font-bold">
                  {category.type === 'Thu nhập' ? '+' : '-'}
                  {formatCurrency(stats.total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-100 mb-1">Số giao dịch</p>
                <p className="text-xl font-bold">{stats.count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {categoryTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4">
                <FaWallet className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">Chưa có giao dịch</p>
              <p className="text-xs text-slate-500">
                Không có giao dịch nào trong {RANGE_LABEL_MAP[dateRange.type].toLowerCase()}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {groupedTransactions.map(([dateKey, dayTransactions]) => {
                const dayTotal = dayTransactions.reduce((sum, t) => {
                  const amount = Number(t.amount) || 0
                  return t.type === 'Thu' ? sum + amount : sum - amount
                }, 0)

                return (
                  <div key={dateKey} className="space-y-2">
                    {/* Date Header */}
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-xs font-bold text-slate-600">{dateKey}</p>
                      <p className={`text-xs font-bold ${dayTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dayTotal >= 0 ? '+' : ''}
                        {formatCurrency(Math.abs(dayTotal))}
                      </p>
                    </div>

                    {/* Transactions */}
                    <div className="space-y-2">
                      {dayTransactions.map((transaction) => {
                        const wallet = wallets.find((w) => w.id === transaction.wallet_id)
                        const amount = Number(transaction.amount) || 0

                        return (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                    transaction.type === 'Thu'
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-red-100 text-red-600'
                                  }`}
                                >
                                  {transaction.type === 'Thu' ? (
                                    <FaArrowUp className="h-3 w-3" />
                                  ) : (
                                    <FaArrowDown className="h-3 w-3" />
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {transaction.description || 'Không có mô tả'}
                                </p>
                              </div>
                              {wallet && (
                                <p className="text-xs text-slate-500 ml-8">{wallet.name}</p>
                              )}
                            </div>
                            <div className="text-right ml-2">
                              <p
                                className={`text-sm font-bold ${
                                  transaction.type === 'Thu' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {transaction.type === 'Thu' ? '+' : '-'}
                                {formatCurrency(amount)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


