import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataPreloader } from '../hooks/useDataPreloader'
import { getNowUTC7, getDateComponentsUTC7, getDayOfWeekUTC7, createDateUTC7 } from '../utils/dateUtils'
import {
  FaSearch,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { TransactionDetailModal } from '../components/transactions/TransactionDetailModal'
import { TransactionCard } from '../components/transactions/TransactionCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TransactionListSkeleton } from '../components/skeletons'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, deleteTransaction, type TransactionRecord } from '../lib/transactionService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)


// Helper function to get date range based on period type
const getDateRangeForPeriod = (periodType: 'day' | 'week' | 'month' | 'quarter') => {
  const now = getNowUTC7()
  const components = getDateComponentsUTC7(now)
  let startDate: Date
  let endDate: Date = createDateUTC7(components.year, components.month, components.day, 23, 59, 59)

  switch (periodType) {
    case 'day':
      startDate = createDateUTC7(components.year, components.month, components.day, 0, 0, 0)
      break
    case 'week': {
      const dayOfWeek = getDayOfWeekUTC7(now)
      const diff = components.day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      startDate = createDateUTC7(components.year, components.month, diff, 0, 0, 0)
      break
    }
    case 'month':
      startDate = createDateUTC7(components.year, components.month, 1, 0, 0, 0)
      endDate = createDateUTC7(components.year, components.month, components.day, 23, 59, 59)
      break
    case 'quarter': {
      const quarter = Math.floor((components.month - 1) / 3)
      startDate = createDateUTC7(components.year, quarter * 3 + 1, 1, 0, 0, 0)
      endDate = createDateUTC7(components.year, components.month, components.day, 23, 59, 59)
      break
    }
    default:
      startDate = createDateUTC7(components.year, components.month, components.day, 0, 0, 0)
  }

  return {
    start: startDate,
    end: endDate,
  }
}

// Format date to dd/MM/yy
const formatDateShort = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

const TransactionsPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  useDataPreloader() // Preload data khi vào trang
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')
  const [walletFilter] = useState<string>('all')
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'quarter'>('day')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Long press handler refs
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<TransactionRecord | null>(null)

  // Load data - sử dụng cache, chỉ reload khi cần
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Sử dụng cache - chỉ fetch khi cache hết hạn hoặc chưa có
        const [transactionsData, categoriesData, walletsData] = await Promise.all([
          fetchTransactions(),
          fetchCategories(),
          fetchWallets(false), // Chỉ lấy ví active, không lấy ví đã ẩn
        ])

        // Load icons for all categories using icon_url from category
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                iconsMap[category.id] = <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-14 w-14" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)

        // Sort by date: newest first
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA
          }
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA
        })
        setAllTransactions(sortedTransactions)
        setCategories(categoriesData)
        setWallets(walletsData)
      } catch (error) {
        console.error('Error loading transactions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    // Chỉ load một lần khi mount, cache sẽ được sử dụng
    // Nếu đã preload, dữ liệu sẽ lấy từ cache ngay lập tức
    loadData()
  }, []) // Chỉ load một lần, cache sẽ được sử dụng cho các lần sau

  // Get period date range
  const periodRange = useMemo(() => getDateRangeForPeriod(periodType), [periodType])

  // Filter and paginate transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions]

    // Filter by period
    filtered = filtered.filter((t) => {
      const transactionDate = new Date(t.transaction_date)
      return transactionDate >= periodRange.start && transactionDate <= periodRange.end
    })

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter)
    }

    // Filter by wallet
    if (walletFilter !== 'all') {
      filtered = filtered.filter((t) => t.wallet_id === walletFilter)
    }

    // Enhanced search: tên giao dịch, hạng mục, khoảng số tiền, ngày cập nhật
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((t) => {
        const category = categories.find((c) => c.id === t.category_id)
        const categoryName = category?.name.toLowerCase() || ''
        const description = (t.description || '').toLowerCase()
        const notes = (t.notes || '').toLowerCase()
        const formattedAmount = formatCurrency(t.amount).toLowerCase().replace(/\s/g, '')
        const amountString = t.amount.toString()

        // Tìm kiếm theo tên giao dịch
        if (description.includes(term) || notes.includes(term)) return true

        // Tìm kiếm theo hạng mục
        if (categoryName.includes(term)) return true

        // Tìm kiếm theo số tiền (hỗ trợ khoảng số tiền)
        if (formattedAmount.includes(term) || amountString.includes(term)) {
          // Hỗ trợ tìm kiếm khoảng số tiền (ví dụ: "100000-500000" hoặc "100k-500k")
          const rangeMatch = term.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
          if (rangeMatch) {
            const min = parseFloat(rangeMatch[1].replace(/\./g, ''))
            const max = parseFloat(rangeMatch[2].replace(/\./g, ''))
            return t.amount >= min && t.amount <= max
          }
          return true
        }

        // Tìm kiếm theo ngày cập nhật (created_at)
        const createdDate = new Date(t.created_at).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).toLowerCase()
        const transactionDate = new Date(t.transaction_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).toLowerCase()

        if (createdDate.includes(term) || transactionDate.includes(term)) return true

        return false
      })
    }

    return filtered
  }, [allTransactions, typeFilter, walletFilter, searchTerm, categories, periodRange])

  // Calculate totals
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'Thu')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = filteredTransactions
      .filter((t) => t.type === 'Chi')
      .reduce((sum, t) => sum + t.amount, 0)
    return { income, expense }
  }, [filteredTransactions])

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, TransactionRecord[]> = {}
    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date)
      const dateKey = formatDateShort(date)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(transaction)
    })
    // Sort dates descending (newest first)
    return Object.entries(grouped).sort(([dateA], [dateB]) => {
      const [dayA, monthA, yearA] = dateA.split('/').map(Number)
      const [dayB, monthB, yearB] = dateB.split('/').map(Number)
      const fullYearA = 2000 + yearA
      const fullYearB = 2000 + yearB
      const dateObjA = new Date(fullYearA, monthA - 1, dayA).getTime()
      const dateObjB = new Date(fullYearB, monthB - 1, dayB).getTime()
      return dateObjB - dateObjA
    })
  }, [filteredTransactions])


  // Get category info for a transaction
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: 'Khác', icon: null, iconId: undefined, iconUrl: undefined }

    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
      iconId: category.icon_id,
      iconUrl: category.icon_url || null,
    }
  }

  // Get wallet name
  const getWalletName = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    return wallet?.name || 'Không xác định'
  }

  // Get wallet color based on ID (consistent color for same wallet)
  const getWalletColor = (walletId: string) => {
    // Array of beautiful color combinations
    const colors = [
      { bg: 'bg-sky-100', icon: 'text-sky-600', text: 'text-sky-700' },
      { bg: 'bg-green-100', icon: 'text-green-600', text: 'text-green-700' },
      { bg: 'bg-red-100', icon: 'text-red-600', text: 'text-red-700' },
      { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
      { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' },
      { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' },
      { bg: 'bg-pink-100', icon: 'text-pink-600', text: 'text-pink-700' },
      { bg: 'bg-cyan-100', icon: 'text-cyan-600', text: 'text-cyan-700' },
      { bg: 'bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' },
      { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-700' },
    ]

    // Simple hash function to convert wallet ID to index
    let hash = 0
    for (let i = 0; i < walletId.length; i++) {
      hash = walletId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Reload transactions when a new transaction is added/updated/deleted
  const handleTransactionSuccess = () => {
    const loadTransactions = async () => {
      try {
        const transactionsData = await fetchTransactions()
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA
          }
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA
        })
        setAllTransactions(sortedTransactions)
      } catch (error) {
        console.error('Error reloading transactions:', error)
      }
    }
    loadTransactions()
  }

  // Long press handlers
  const handleLongPressStart = (transaction: TransactionRecord) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    longPressTargetRef.current = transaction

    // Set timer for long press (500ms)
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressTargetRef.current) {
        setSelectedTransaction(longPressTargetRef.current)
        setIsActionModalOpen(true)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  const handleLongPressCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  // Handle view transaction detail
  const handleViewClick = () => {
    setIsActionModalOpen(false)
    if (selectedTransaction) {
      setIsDetailModalOpen(true)
    }
  }

  // Handle edit
  const handleEditClick = () => {
    setIsEditConfirmOpen(true)
  }

  const handleEditConfirm = () => {
    setIsEditConfirmOpen(false)
    setIsActionModalOpen(false)
    if (selectedTransaction) {
      navigate(`/add-transaction?id=${selectedTransaction.id}`)
    }
  }

  // Handle delete
  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return

    setIsDeleting(true)
    try {
      await deleteTransaction(selectedTransaction.id)
      success('Đã xóa giao dịch thành công!')
      handleTransactionSuccess()
      setSelectedTransaction(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa giao dịch'
      showError(message)
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title={isSearchOpen ? '' : "Lịch sử ghi chép"}
        showIcon={
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 transition hover:scale-110 active:scale-95"
            aria-label="Tìm kiếm"
          >
            <FaSearch className="h-4 w-4 text-slate-600" />
          </button>
        }
        customContent={
          isSearchOpen ? (
            <div className="flex-1 px-4">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm giao dịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 text-sm 
                  text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  onBlur={() => {
                    // Không đóng search khi blur, chỉ đóng khi bấm nút search lại
                  }}
                />
              </div>
            </div>
          ) : null
        }
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-2 pb-24 sm:pt-2 sm:pb-28">

          {/* Period Selection */}
          <section className="flex gap-2">
            {(['day', 'week', 'month', 'quarter'] as const).map((period) => {
              const labels: Record<typeof period, string> = {
                day: 'Hôm nay',
                week: 'Tuần này',
                month: 'Tháng này',
                quarter: 'Quý này',
              }
              const isActive = periodType === period
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setPeriodType(period)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm ${isActive
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                    : 'bg-white text-slate-600 shadow-sm border border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {labels[period]}
                </button>
              )
            })}
          </section>

          {/* Total Income and Expense */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-white px-4 py-3 shadow-lg border border-green-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-500">Tổng Thu</p>
              <p className="mt-1 text-lg font-bold text-green-500">
                {isLoading ? '...' : formatCurrency(totals.income)}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-red-50 to-white px-4 py-3 shadow-lg border border-red-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Tổng Chi</p>
              <p className="mt-1 text-lg font-bold text-red-500">
                {isLoading ? '...' : formatCurrency(totals.expense)}
              </p>
            </div>
          </section>

          {/* Transactions List Grouped by Date */}
          <section className="space-y-4">
            {isLoading ? (
              <TransactionListSkeleton count={10} />
            ) : transactionsByDate.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 shadow-lg border border-slate-100">
                <div className="mb-4 p-4 overflow-hidden">
                  {searchTerm || typeFilter !== 'all' || walletFilter !== 'all' ? (
                    <FaSearch className="h-8 w-8 text-slate-400" />
                  ) : (
                    <img
                      src="/bg-giaodich.png"
                      alt="Giao dịch"
                      className="h-56 w-56 object-contain opacity-90"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {searchTerm || typeFilter !== 'all' || walletFilter !== 'all'
                    ? 'Không tìm thấy giao dịch phù hợp'
                    : 'Chưa có giao dịch nào'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {searchTerm || typeFilter !== 'all' || walletFilter !== 'all'
                    ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                    : 'Bắt đầu bằng cách thêm giao dịch mới'}
                </p>
              </div>
            ) : (
              <>
                {transactionsByDate.map(([dateKey, transactions]) => {
                  // Format date for display
                  const [day, month, year] = dateKey.split('/').map(Number)
                  const fullYear = 2000 + year
                  const date = new Date(fullYear, month - 1, day)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)
                  date.setHours(0, 0, 0, 0)

                  let dayLabel = dateKey
                  if (date.getTime() === today.getTime()) {
                    dayLabel = 'Hôm nay'
                  } else if (date.getTime() === yesterday.getTime()) {
                    dayLabel = 'Hôm qua'
                  }

                  // calculate total net amount for the date
                  const dayTotal = transactions.reduce((sum, t) => {
                    if (t.type === 'Thu') return sum + t.amount
                    if (t.type === 'Chi') return sum - t.amount
                    return sum
                  }, 0)

                  return (
                    <div key={dateKey}>
                      {/* Date Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-sky-400" />
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{dayLabel}</span>
                        </div>
                        <span className={`text-[13px] font-black ${dayTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {dayTotal >= 0 ? '+' : ''}{Math.round(dayTotal).toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      {/* Transactions for this date */}
                      <div className="space-y-3 pl-3.5 border-l-2 ml-[3px] py-1 border-slate-100">
                        {transactions.map((transaction) => {
                          const categoryInfo = getCategoryInfo(transaction.category_id)
                          const walletColor = getWalletColor(transaction.wallet_id)
                          const formatTransactionDate = () => dayLabel;

                          return (
                            <TransactionCard
                              key={transaction.id}
                              transaction={transaction}
                              categoryInfo={categoryInfo}
                              walletInfo={{
                                name: getWalletName(transaction.wallet_id),
                                color: walletColor,
                              }}
                              onLongPressStart={handleLongPressStart}
                              onLongPressEnd={handleLongPressEnd}
                              onLongPressCancel={handleLongPressCancel}
                              formatCurrency={formatCurrency}
                              formatDate={formatTransactionDate}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </section>
        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />

      <TransactionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTransaction(null)
        }}
        transaction={selectedTransaction}
        categoryInfo={selectedTransaction ? getCategoryInfo(selectedTransaction.category_id) : undefined}
        walletInfo={selectedTransaction ? { name: getWalletName(selectedTransaction.wallet_id) } : undefined}
      />

      <TransactionActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false)
          setSelectedTransaction(null)
        }}
        onView={handleViewClick}
        onEdit={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for edit action
          handleEditClick()
        }}
        onDelete={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for delete action
          handleDeleteClick()
        }}
      />

      <ConfirmDialog
        isOpen={isEditConfirmOpen}
        onClose={() => setIsEditConfirmOpen(false)}
        onConfirm={handleEditConfirm}
        type="warning"
        title="Xác nhận sửa giao dịch"
        message="Bạn có chắc chắn muốn sửa giao dịch này? Thông tin giao dịch sẽ được cập nhật và có thể ảnh hưởng đến số dư ví."
        confirmText="Sửa"
        cancelText="Hủy"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        type="error"
        title="Xác nhận xóa giao dịch"
        message="Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến số dư ví."
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={isDeleting}
      />
    </div>
  )
}

export default TransactionsPage


