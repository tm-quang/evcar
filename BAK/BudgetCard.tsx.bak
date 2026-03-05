import { FaEdit, FaTrash, FaExclamationTriangle, FaBan } from 'react-icons/fa'
import { type BudgetWithSpending } from '../../lib/budgetService'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

type BudgetCardProps = {
  budget: BudgetWithSpending
  categoryName: string
  categoryIcon: React.ReactNode
  walletName?: string | null
  onEdit?: () => void
  onDelete?: () => void
}

// Hàm xác định mức độ cảnh báo theo tỷ lệ 0%, 25%, 50%, 75%, 100%
const getAlertLevel = (usagePercentage: number): 'level0' | 'level25' | 'level50' | 'level75' | 'level100' => {
  if (usagePercentage >= 100) return 'level100'
  if (usagePercentage >= 75) return 'level75'
  if (usagePercentage >= 50) return 'level50'
  if (usagePercentage >= 25) return 'level25'
  return 'level0'
}

// Hàm lấy màu sắc và label cho mức độ cảnh báo - giống với Dashboard
const getAlertLevelInfo = (level: 'level0' | 'level25' | 'level50' | 'level75' | 'level100', usagePercentage: number) => {
  // Xác định màu sắc dựa trên usage percentage giống Dashboard
  const isCritical = usagePercentage >= 100
  const isHigh = usagePercentage >= 90
  const isLow = usagePercentage >= 80
  
  // Màu sắc card giống Dashboard
  const cardStyles = isCritical
    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-400 shadow-lg shadow-red-200/50 hover:shadow-xl hover:shadow-red-300/50'
    : isHigh
    ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400 shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50'
    : isLow
    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-400 shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50'
    : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-2 border-emerald-300 shadow-lg shadow-emerald-200/50'

  const badgeStyles = isCritical
    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-700 shadow-lg shadow-red-300/50 animate-pulse'
    : isHigh
    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-600 shadow-md'
    : isLow
    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-600'
    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600'

  const progressStyles = isCritical
    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-lg shadow-red-400/50'
    : isHigh
    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-400/50'
    : isLow
    ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
    : 'bg-gradient-to-r from-emerald-400 to-emerald-500'

  const textColor = isCritical
    ? 'text-red-700'
    : isHigh
    ? 'text-orange-700'
    : isLow
    ? 'text-amber-700'
    : 'text-emerald-700'

  const titleColor = isCritical
    ? 'text-red-900'
    : isHigh
    ? 'text-orange-900'
    : isLow
    ? 'text-amber-900'
    : 'text-slate-900'

  return {
    label: level === 'level0' ? '0%' : level === 'level25' ? '25%' : level === 'level50' ? '50%' : level === 'level75' ? '75%' : '100%',
    cardStyles,
    badgeStyles,
    progressStyles,
    textColor,
    titleColor,
    isCritical,
    isHigh,
    isLow,
  }
}

export const BudgetCard = ({
  budget,
  categoryName,
  categoryIcon,
  walletName,
  onEdit,
  onDelete,
}: BudgetCardProps) => {
  // Xác định mức độ cảnh báo dựa trên usage_percentage (0%, 25%, 50%, 75%, 100%)
  const alertLevel = getAlertLevel(budget.usage_percentage)
  const alertInfo = getAlertLevelInfo(alertLevel, budget.usage_percentage)

  const usagePercentage = Math.min(budget.usage_percentage, 120) // Cap at 120% for display
  const isOverBudget = budget.usage_percentage > 100

  return (
    <div className={`group relative rounded-3xl ${alertInfo.cardStyles} transition-all transform hover:scale-[1.02] active:scale-100 overflow-hidden p-4 sm:p-5`}>
      {/* Animated background effect */}
      {alertInfo.isCritical && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-transparent to-rose-400/10 animate-pulse" />
      )}
      
      <div className="relative z-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center overflow-hidden ${
              alertInfo.isCritical ? 'bg-red-100 ring-2 ring-red-400' : alertInfo.isHigh ? 'bg-orange-100 ring-2 ring-orange-400' : alertInfo.isLow ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-emerald-100 ring-2 ring-emerald-400'
            } shadow-md`}>
              {categoryIcon}
            </div>
            {alertInfo.isCritical && (
              <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-white">
                <FaExclamationTriangle className="h-2.5 w-2.5 text-white" />
              </div>
            )}
            {budget.limit_type && !alertInfo.isCritical && (
              <div className={`absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center ${budget.limit_type === 'hard'
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 text-white'
                } shadow-lg`}>
                {budget.limit_type === 'hard' ? (
                  <FaBan className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                ) : (
                  <FaExclamationTriangle className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-bold text-sm sm:text-base truncate ${alertInfo.titleColor}`}>{categoryName}</h3>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                {formatDate(budget.period_start)} - {formatDate(budget.period_end)}
              </p>
              {walletName && (
                <>
                  <span className="text-slate-300 shrink-0">•</span>
                  <p className="text-[10px] sm:text-xs text-slate-500 truncate font-medium">{walletName}</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold text-white ${alertInfo.badgeStyles} shadow-md whitespace-nowrap`}>
            {alertInfo.label}
          </span>
          <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${alertInfo.badgeStyles} shadow-sm whitespace-nowrap`}>
            {budget.usage_percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2 gap-2">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Đã chi</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 break-words leading-tight">
              {formatCurrency(budget.spent_amount)}
            </span>
          </div>
          <div className="flex flex-col items-end min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Hạn mức</span>
            <span className="text-sm sm:text-base font-bold text-slate-700 break-words leading-tight text-right">
              {formatCurrency(budget.amount)}
            </span>
          </div>
        </div>
        <div className="relative w-full bg-white/60 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className={`h-full ${alertInfo.progressStyles} transition-all duration-500 ease-out rounded-full relative overflow-hidden`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          >
            {usagePercentage > 100 && (
              <div
                            className={`absolute right-0 top-0 h-full ${alertInfo.progressStyles} opacity-60`}
                style={{ width: `${usagePercentage - 100}%` }}
              />
            )}
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
          {isOverBudget && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                Vượt {budget.usage_percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {budget.usage_percentage >= 80 && (
          <div className="flex items-center gap-1.5 mt-2">
            <FaExclamationTriangle className={`h-3.5 w-3.5 ${alertInfo.textColor}`} />
            <p className={`text-xs ${alertInfo.textColor} font-semibold`}>
              Mức cảnh báo: <span className="font-bold">{alertInfo.label}</span>
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Số tiền còn lại</span>
          <span className={`text-sm sm:text-lg font-bold break-words leading-tight ${budget.remaining_amount >= 0 ? 'text-slate-900' : alertInfo.textColor}`}>
            {budget.remaining_amount >= 0 ? (
              <span className="text-emerald-600">{formatCurrency(budget.remaining_amount)}</span>
            ) : (
              <span className={alertInfo.textColor}>{formatCurrency(Math.abs(budget.remaining_amount))}</span>
            )}
          </span>
        </div>
        <div className="flex gap-1 sm:gap-1.5 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all hover:scale-110 active:scale-95"
              aria-label="Sửa hạn mức"
            >
              <FaEdit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
              aria-label="Xóa hạn mức"
            >
              <FaTrash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

