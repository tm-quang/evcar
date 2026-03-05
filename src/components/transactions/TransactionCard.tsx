import { useRef } from 'react'
import { FaPlus, FaCalendar, FaWallet } from 'react-icons/fa'
import { type TransactionRecord } from '../../lib/transactionService'

export interface CategoryInfo {
  name: string
  icon: React.ReactNode | null
}

export interface WalletInfo {
  name: string
  color: {
    bg: string
    icon: string
    text: string
  }
}

interface TransactionCardProps {
  transaction: TransactionRecord
  categoryInfo: CategoryInfo
  walletInfo: WalletInfo
  onLongPressStart: (transaction: TransactionRecord) => void
  onLongPressEnd: () => void
  onLongPressCancel: () => void
  formatCurrency: (value: number) => string
  formatDate: (date: Date) => string
}

export const TransactionCard = ({
  transaction,
  categoryInfo,
  walletInfo,
  onLongPressStart,
  onLongPressEnd,
  onLongPressCancel,
  formatCurrency,
  formatDate,
}: TransactionCardProps) => {
  const isIncome = transaction.type === 'Thu'
  const categoryIcon = categoryInfo.icon
  const transactionDate = new Date(transaction.transaction_date)

  const longPressTimerRef = useRef<number | null>(null)
  const wasLongPressRef = useRef(false)

  const handleTouchStart = () => {
    wasLongPressRef.current = false
    onLongPressStart(transaction)
    // Set a timer to detect long press
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    onLongPressEnd()
    wasLongPressRef.current = false
  }

  const handleMouseDown = () => {
    wasLongPressRef.current = false
    onLongPressStart(transaction)
    // Set a timer to detect long press
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    onLongPressEnd()
    wasLongPressRef.current = false
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={onLongPressCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={onLongPressCancel}
      className={`group relative flex items-center gap-3 rounded-3xl p-3 shadow-md border transition-all select-none cursor-default active:scale-[0.98] ${isIncome
        ? 'bg-green-200/50 border-green-500/50'
        : 'bg-red-200/50 border-red-500/50'
        }`}
    >
      {/* Icon Container */}
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full overflow-hidden shadow-sm ${isIncome ? 'bg-teal-400' : 'bg-blue-600'
          }`}
      >
        {categoryIcon ? (
          <div className="h-full w-full flex items-center justify-center transition-transform group-hover:scale-110">
            {categoryIcon}
          </div>
        ) : (
          <FaPlus className="h-6 w-6 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        {/* Left side: Description, Date, Category, Tags */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Title - Ưu tiên tên hạng mục cho giống ảnh */}
          <p className="truncate text-base font-bold text-slate-800">
            {categoryInfo.name}
          </p>

          {/* Date */}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
            <FaCalendar className="h-3 w-3 text-slate-400" />
            <span className="font-semibold">{formatDate(transactionDate)}</span>
          </div>

          {/* Description - Hiển thị tên giao dịch nếu có */}
          {transaction.description && transaction.description !== categoryInfo.name && (
            <p className="truncate text-xs text-slate-500 mt-0.5">
              {transaction.description}
            </p>
          )}

          {/* Tags */}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {transaction.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-md bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Amount and Wallet */}
        <div className="flex flex-col items-end justify-center gap-2 shrink-0">
          <span className={`text-lg font-black whitespace-nowrap tracking-tight ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
          {/* Wallet */}
          <div className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-2.5 py-1 transition-colors group-hover:bg-blue-500">
            <FaWallet className="h-3 w-3 text-white" />
            <span className="text-[11px] font-bold text-white whitespace-nowrap">
              {walletInfo.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}


