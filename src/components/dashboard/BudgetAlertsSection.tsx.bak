import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaExclamationTriangle, FaChartPie, FaArrowRight, FaFire } from 'react-icons/fa'
import { getBudgetsWithAlerts } from '../../lib/budgetAlertService'
import { fetchCategories, type CategoryRecord } from '../../lib/categoryService'
import { type BudgetWithSpending } from '../../lib/budgetService'
import { CategoryIcon } from '../ui/CategoryIcon'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const BudgetAlertsSection = () => {
  const navigate = useNavigate()
  const [budgetsWithAlerts, setBudgetsWithAlerts] = useState<BudgetWithSpending[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [budgets, categoriesData] = await Promise.all([
          getBudgetsWithAlerts(),
          fetchCategories(),
        ])
        console.log('BudgetAlertsSection: Loaded budgets with alerts:', budgets.length)
        setBudgetsWithAlerts(budgets)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading budget alerts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return null
  }

  if (budgetsWithAlerts.length === 0) {
    return null
  }

  // Chỉ hiển thị top 3 budgets có cảnh báo cao nhất
  const topAlerts = budgetsWithAlerts.slice(0, 3)
  
  // Xác định mức độ cảnh báo cao nhất
  const hasCriticalAlerts = topAlerts.some(b => b.usage_percentage >= 100)
  const hasHighAlerts = topAlerts.some(b => b.usage_percentage >= 90)

  // Màu sắc và gradient dựa trên mức độ cảnh báo
  const sectionStyles = hasCriticalAlerts
    ? 'bg-gradient-to-br from-red-50 via-orange-50 to-rose-50 border-2 border-red-300 shadow-red-200/50'
    : hasHighAlerts
    ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-300 shadow-orange-200/50'
    : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 border-2 border-amber-300 shadow-amber-200/50'

  const headerIconBg = hasCriticalAlerts
    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white animate-pulse'
    : hasHighAlerts
    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
    : 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white'

  const headerTextColor = hasCriticalAlerts
    ? 'text-red-700'
    : hasHighAlerts
    ? 'text-orange-700'
    : 'text-amber-700'

  return (
    <section className={`rounded-3xl ${sectionStyles} p-5 shadow-xl relative overflow-hidden`}>
      {/* Animated background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-gradient-to-br from-red-200/30 to-orange-200/30 blur-2xl animate-pulse" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-200/30 to-yellow-200/30 blur-xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${headerIconBg} shadow-lg`}>
              {hasCriticalAlerts ? (
                <FaFire className="h-6 w-6" />
              ) : (
                <FaExclamationTriangle className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${headerTextColor} flex items-center gap-2`}>
                Cảnh báo hạn mức
                {hasCriticalAlerts && (
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                    KHẨN CẤP
                  </span>
                )}
              </h3>
              <p className={`text-sm font-medium ${headerTextColor}/80`}>
                {budgetsWithAlerts.length} hạn mức cần chú ý
              </p>
            </div>
          </div>
          {budgetsWithAlerts.length > 3 && (
            <button
              onClick={() => navigate('/budgets')}
              className={`flex items-center gap-1 text-xs font-semibold ${headerTextColor} hover:opacity-80 transition-all`}
            >
              Xem tất cả
              <FaArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="space-y-3">
        {topAlerts.map((budget) => {
          const category = categories.find((c) => c.id === budget.category_id)
          const categoryName = category?.name || 'Hạng mục không xác định'
          const isOverBudget = budget.usage_percentage > 100
          const isCritical = budget.usage_percentage >= 100
          const isHigh = budget.usage_percentage >= 90

          // Màu sắc nổi bật hơn dựa trên mức độ cảnh báo
          const cardStyles = isCritical
            ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-400 shadow-lg shadow-red-200/50 hover:shadow-xl hover:shadow-red-300/50'
            : isHigh
            ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400 shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/50'
            : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-400 shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-300/50'

          const badgeStyles = isCritical
            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-700 shadow-lg shadow-red-300/50 animate-pulse'
            : isHigh
            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-600 shadow-md'
            : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-600'

          const progressStyles = isCritical
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-lg shadow-red-400/50'
            : isHigh
            ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md shadow-orange-400/50'
            : 'bg-gradient-to-r from-amber-400 to-yellow-500'

          const remainingTextColor = isOverBudget
            ? 'text-red-700 font-bold'
            : isHigh
            ? 'text-orange-700 font-semibold'
            : 'text-amber-700 font-semibold'

          return (
            <button
              key={budget.id}
              onClick={() => navigate('/budgets')}
              className={`w-full text-left rounded-2xl ${cardStyles} p-4 transition-all transform hover:scale-[1.02] active:scale-100 relative overflow-hidden`}
            >
              {/* Animated background effect */}
              {isCritical && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-transparent to-rose-400/10 animate-pulse" />
              )}
              
              <div className="relative z-10 flex items-start gap-3">
                <div className={`h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl ${
                  isCritical ? 'bg-red-100 ring-2 ring-red-400' : isHigh ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-amber-100 ring-2 ring-amber-400'
                } shadow-md`}>
                  <CategoryIcon
                    iconId={category?.icon_id || ''}
                    iconUrl={category?.icon_url}
                    className="h-10 w-10"
                  />
                  {isCritical && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full flex items-center justify-center border-2 border-white">
                      <FaExclamationTriangle className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-base font-bold truncate ${
                      isCritical ? 'text-red-900' : isHigh ? 'text-orange-900' : 'text-amber-900'
                    }`}>
                      {categoryName}
                    </p>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold border-2 ${badgeStyles} min-w-[60px] text-center`}
                    >
                      {budget.usage_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="h-3 w-full bg-white/60 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${progressStyles} transition-all duration-500 relative`}
                        style={{
                          width: `${Math.min(budget.usage_percentage, 100)}%`,
                        }}
                      >
                        {isCritical && (
                          <div className="absolute inset-0 bg-white/30 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${
                      isCritical ? 'text-red-700' : isHigh ? 'text-orange-700' : 'text-amber-700'
                    }`}>
                      Đã chi: <span className="font-bold">{formatCurrency(budget.spent_amount)}</span>
                    </span>
                    <span className={remainingTextColor}>
                      {isOverBudget ? (
                        <span className="flex items-center gap-1">
                          <FaExclamationTriangle className="h-3 w-3" />
                          Vượt: {formatCurrency(Math.abs(budget.remaining_amount))}
                        </span>
                      ) : (
                        `Còn: ${formatCurrency(budget.remaining_amount)}`
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
        </div>

        {budgetsWithAlerts.length > 3 && (
          <button
            onClick={() => navigate('/budgets')}
            className={`mt-4 w-full rounded-xl ${
              hasCriticalAlerts
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-300/50'
                : hasHighAlerts
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-300/50'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md'
            } px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95`}
          >
            <FaChartPie className="h-4 w-4" />
            Xem tất cả {budgetsWithAlerts.length} hạn mức
          </button>
        )}
      </div>
    </section>
  )
}

