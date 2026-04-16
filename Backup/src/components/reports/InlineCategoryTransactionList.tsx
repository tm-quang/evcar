import { useMemo, useRef, useEffect } from 'react'
import { FaTimes, FaWallet, FaArrowUp, FaArrowDown, FaChartPie } from 'react-icons/fa'
import type { TransactionRecord } from '../../lib/transactionService'
import type { CategoryRecord, CategoryWithChildren } from '../../lib/categoryService'
import type { WalletRecord } from '../../lib/walletService'
import { CategoryIcon } from '../ui/CategoryIcon'
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

interface InlineCategoryTransactionListProps {
  category: CategoryRecord | CategoryWithChildren
  transactions: TransactionRecord[]
  wallets: WalletRecord[]
  dateRange: {
    start: string
    end: string
    type: DateRangeType
  }
  allCategories?: CategoryRecord[]
  onClose: () => void
}

export const InlineCategoryTransactionList = ({
  category,
  transactions,
  wallets,
  dateRange,
  allCategories = [],
  onClose,
}: InlineCategoryTransactionListProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to this component when it appears
  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [category.id])

  const categoryIds = useMemo(() => {
    const ids = [category.id]
    if ('children' in category && category.children && category.children.length > 0) {
      category.children.forEach(child => ids.push(child.id))
    } else {
      const children = allCategories.filter(cat => cat.parent_id === category.id)
      children.forEach(child => ids.push(child.id))
    }
    return ids
  }, [category, allCategories])

  const categoryTransactions = useMemo(() => {
    if (categoryIds.length === 0) return []
    
    let filtered = transactions.filter((t) => categoryIds.includes(t.category_id))
    
    if (dateRange.start && dateRange.end) {
      const startDateStr = dateRange.start.split('T')[0]
      const endDateStr = dateRange.end.split('T')[0]
      filtered = filtered.filter((t) => {
        const transactionDateStr = t.transaction_date.split('T')[0]
        return transactionDateStr >= startDateStr && transactionDateStr <= endDateStr
      })
    }
    
    return filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [transactions, categoryIds, dateRange.start, dateRange.end])

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

  return (
    <div ref={containerRef} className="mt-8 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <CategoryIcon iconId={category.icon_id} iconUrl={category.icon_url} className="h-10 w-10 shadow-sm" />
            <div>
              <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {stats.count} giao dịch · Tổng {formatCurrency(stats.total)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Transaction List */}
        <div className="p-4 bg-slate-50/30">
          {categoryTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-4">
                <FaChartPie className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Không có giao dịch</p>
              <p className="text-xs text-slate-500 mt-1">
                Chưa có giao dịch nào cho hạng mục này
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedTransactions.map(([dateKey, dayTransactions]) => {
                const dayTotal = dayTransactions.reduce((sum, t) => {
                  const amount = Number(t.amount) || 0
                  return t.type === 'Thu' ? sum + amount : sum - amount
                }, 0)

                return (
                  <div key={dateKey} className="space-y-2.5">
                    {/* Date Header */}
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dateKey}</p>
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
                            className="flex items-center justify-between rounded-2xl bg-white p-3.5 shadow-sm border border-slate-100 hover:border-blue-100 transition-colors group"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-3">
                              <div
                                className={`flex shrink-0 h-10 w-10 items-center justify-center rounded-full ${
                                  transaction.type === 'Thu'
                                    ? 'bg-green-50 text-green-600 group-hover:bg-green-100'
                                    : 'bg-red-50 text-red-600 group-hover:bg-red-100'
                                } transition-colors`}
                              >
                                {transaction.type === 'Thu' ? (
                                  <FaArrowUp className="h-4 w-4" />
                                ) : (
                                  <FaArrowDown className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {transaction.description || category.name}
                                </p>
                                {wallet && (
                                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                    <FaWallet className="w-2.5 h-2.5 opacity-70" />
                                    {wallet.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-3 shrink-0">
                              <p
                                className={`text-[15px] font-bold ${
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
