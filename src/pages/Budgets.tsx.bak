import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaChartPie, FaWallet, FaExclamationTriangle } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import FooterNav from '../components/layout/FooterNav'
import { BudgetCard } from '../components/budgets/BudgetCard'
import { BudgetListSkeleton } from '../components/budgets/BudgetSkeleton'
import {
  fetchBudgets,
  getBudgetWithSpending,
  deleteBudget,
  type BudgetRecord,
  type BudgetWithSpending,
} from '../lib/budgetService'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { checkAndSendBudgetAlerts } from '../lib/budgetAlertService'
import { useDialog } from '../contexts/dialogContext.helpers'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'

export const BudgetsPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const { showConfirm } = useDialog()
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()

    // Check budget alerts when Budgets page loads (chạy trong background)
    checkAndSendBudgetAlerts().catch((error) => {
      console.warn('Error checking budget alerts on Budgets page load:', error)
    })
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [budgetsData, categoriesData, walletsData] = await Promise.all([
        fetchBudgets({ is_active: true }),
        fetchCategories(),
        fetchWallets(false),
      ])

      const budgetsWithSpending = await Promise.allSettled(
        budgetsData.map((b) => getBudgetWithSpending(b.id))
      )

      // Filter out failed budgets and log errors
      const successfulBudgets = budgetsWithSpending
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.error(`Failed to load budget ${budgetsData[index].id}:`, result.reason)
            return null
          }
        })
        .filter((budget): budget is BudgetWithSpending => budget !== null)

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

      // Sort by usage percentage (highest first) to show critical budgets first
      successfulBudgets.sort((a, b) => b.usage_percentage - a.usage_percentage)

      setBudgets(successfulBudgets)
      setCategories(categoriesData)
      setWallets(walletsData)
    } catch (error) {
      console.error('Error loading budgets:', error)
      showError('Không thể tải danh sách hạn mức.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    navigate('/add-budget')
  }

  const handleEdit = (budget: BudgetWithSpending) => {
    navigate(`/add-budget?id=${budget.id}`)
  }

  const handleDelete = async (budget: BudgetRecord) => {
    const confirmed = await showConfirm(
      'Bạn có chắc muốn xóa hạn mức này? Hành động này không thể hoàn tác.'
    )

    if (!confirmed) return

    try {
      await deleteBudget(budget.id)
      success('Đã xóa hạn mức thành công!')
      loadData()
    } catch {
      showError('Không thể xóa hạn mức.')
    }
  }

  // Removed unused handleModalClose function

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Hạn mức" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-2 pb-24 sm:pt-2 sm:pb-28">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Hạn mức của tôi</h1>
              <p className="mt-1 text-sm text-slate-500">
                Kiểm soát chi tiêu, đảm bảo ổn định tài chính
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-white font-semibold shadow-lg shadow-sky-500/30 hover:from-sky-600 hover:to-blue-700 transition-all active:scale-95"
            >
              <FaPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Tạo hạn mức</span>
              <span className="sm:hidden">Tạo</span>
            </button>
          </div>

          {/* Summary Stats */}
          {!isLoading && budgets.length > 0 && (() => {
            const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
            const totalSpent = budgets.reduce((sum, b) => sum + b.spent_amount, 0)
            const totalRemaining = totalBudget - totalSpent
            const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
            const overBudgetCount = budgets.filter(b => b.usage_percentage > 100).length

            return (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-3 sm:p-4 border border-blue-100 shadow-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <FaWallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-blue-600 truncate">Tổng hạn mức</span>
                  </div>
                  <p className="text-sm sm:text-lg font-bold text-slate-900 break-words leading-tight">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(totalBudget)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-white p-3 sm:p-4 border border-rose-100 shadow-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                      <FaChartPie className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-rose-600 truncate">Đã chi</span>
                  </div>
                  <p className="text-sm sm:text-lg font-bold text-slate-900 break-words leading-tight">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(totalSpent)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-rose-600 font-medium mt-0.5 truncate">
                    {overallPercentage.toFixed(1)}% tổng
                  </p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-3 sm:p-4 border border-emerald-100 shadow-lg overflow-hidden">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <FaExclamationTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 truncate">Còn lại</span>
                  </div>
                  <p className={`text-sm sm:text-lg font-bold break-words leading-tight ${totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      maximumFractionDigits: 0,
                    }).format(Math.abs(totalRemaining))}
                  </p>
                  {overBudgetCount > 0 && (
                    <p className="text-[10px] sm:text-xs text-rose-600 font-medium mt-0.5 truncate">
                      {overBudgetCount} vượt mức
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {isLoading ? (
            <BudgetListSkeleton count={3} />
          ) : budgets.length === 0 ? (
            <div className="rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-white p-8 sm:p-12 text-center shadow-lg border border-slate-100">
              <div className="mx-auto mb-6 sm:mb-8 flex items-center justify-center">
                <img
                  src="/ngan-sach.png"
                  alt="Hạn mức"
                  className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 object-contain max-w-full"
                />
              </div>
              <h3 className="mb-3 text-xl sm:text-2xl font-bold text-slate-900">Chưa có hạn mức nào</h3>
              <p className="mb-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto">
                Tạo hạn mức để kiểm soát chi tiêu hiệu quả
              </p>
              <p className="mb-8 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                Thiết lập giới hạn cứng hoặc mềm để tự động từ chối hoặc cảnh báo khi vượt quá
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 sm:px-8 sm:py-4 text-white font-semibold text-sm sm:text-base shadow-lg shadow-sky-500/30 hover:from-sky-600 hover:to-blue-700 transition-all active:scale-95"
              >
                <FaPlus className="h-5 w-5" />
                Tạo hạn mức đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const category = categories.find((c) => c.id === budget.category_id)
                const wallet = budget.wallet_id
                  ? wallets.find((w) => w.id === budget.wallet_id)
                  : null

                // Get icon component
                const categoryIcon = category && categoryIcons[category.id] ? categoryIcons[category.id] : '💰'

                return (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    categoryName={category?.name || 'Hạng mục đã xóa'}
                    categoryIcon={categoryIcon}
                    walletName={wallet?.name}
                    onEdit={() => handleEdit(budget)}
                    onDelete={() => handleDelete(budget)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>

      <FooterNav onAddClick={handleCreate} />
    </div>
  )
}

export default BudgetsPage

