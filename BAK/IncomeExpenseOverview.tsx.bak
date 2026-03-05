import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCog, FaChevronDown, FaTimes, FaCheck } from 'react-icons/fa'
import { fetchTransactions, type TransactionRecord } from '../../lib/transactionService'
import { fetchCategories, fetchCategoriesHierarchical, type CategoryRecord, type CategoryWithChildren } from '../../lib/categoryService'
import { getUserPreferences, updateChartPreferences, type ChartPeriodType } from '../../lib/userPreferencesService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { HorizontalBarChart } from './HorizontalBarChart'
import { IncomeExpenseSummary } from './IncomeExpenseSummary'
import { DonutChartWithLegend } from './DonutChartWithLegend'
import { LoadingRing } from '../ui/LoadingRing'

type IncomeExpenseOverviewProps = {
  walletId?: string
}

type TimePeriod = 'day' | 'week' | 'month'

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
]

// Helper function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get date range based on time period
const getDateRange = (period: TimePeriod) => {
  const now = new Date()
  let startDate: Date
  let endDate: Date

  switch (period) {
    case 'day': {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    }
    case 'week': {
      // Get Monday of current week
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust when day is Sunday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
      break
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    }
    default: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }
  }

  return {
    start: formatDateLocal(startDate),
    end: formatDateLocal(endDate),
  }
}

export const IncomeExpenseOverview = ({ walletId }: IncomeExpenseOverviewProps) => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [parentCategories, setParentCategories] = useState<CategoryWithChildren[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [isTimePeriodDropdownOpen, setIsTimePeriodDropdownOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [selectedDefaultPeriod, setSelectedDefaultPeriod] = useState<TimePeriod>('month')
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const timePeriodDropdownRef = useRef<HTMLDivElement>(null)

  const dateRange = useMemo(() => getDateRange(timePeriod), [timePeriod])

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getUserPreferences()
        if (preferences?.chart_period_type) {
          const savedPeriod = preferences.chart_period_type as TimePeriod
          setTimePeriod(savedPeriod)
          setSelectedDefaultPeriod(savedPeriod)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        // Continue with default if error
      }
    }
    loadPreferences()
  }, [])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [transactionsData, categoriesData, parentCategoriesData] = await Promise.all([
          fetchTransactions({
            start_date: dateRange.start,
            end_date: dateRange.end,
            wallet_id: walletId,
            exclude_from_reports: false, // Only get transactions included in reports
          }),
          fetchCategories(),
          fetchCategoriesHierarchical(),
        ])

        setTransactions(transactionsData)
        setCategories(categoriesData)
        setParentCategories(parentCategoriesData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading overview data:', errorMessage, error)
        setTransactions([])
        setCategories([])
        setParentCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dateRange.start, dateRange.end, walletId])

  // Calculate income and expense
  const { income, expense, expenseTransactions } = useMemo(() => {
    const incomeTxs = transactions.filter((t) => t.type === 'Thu')
    const expenseTxs = transactions.filter((t) => t.type === 'Chi')

    const incomeTotal = incomeTxs.reduce((sum, t) => sum + t.amount, 0)
    const expenseTotal = expenseTxs.reduce((sum, t) => sum + t.amount, 0)

    return {
      income: incomeTotal,
      expense: expenseTotal,
      expenseTransactions: expenseTxs,
    }
  }, [transactions])

  // Get expense parent categories (only Chi tiêu type)
  const expenseParentCategories = useMemo(() => {
    return parentCategories.filter((cat) => cat.type === 'Chi tiêu')
  }, [parentCategories])

  // Close time period dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePeriodDropdownRef.current && !timePeriodDropdownRef.current.contains(event.target as Node)) {
        setIsTimePeriodDropdownOpen(false)
      }
    }

    if (isTimePeriodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTimePeriodDropdownOpen])

  // Lock body scroll when settings modal is open
  useEffect(() => {
    if (isSettingsModalOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isSettingsModalOpen])

  const currentTimePeriodLabel = TIME_PERIOD_OPTIONS.find((opt) => opt.value === timePeriod)?.label || 'Tháng'

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-md font-semibold uppercase tracking-[0.1em] text-slate-700">
            {timePeriod === 'day' ? 'THU CHI HÔM NAY' : timePeriod === 'week' ? 'THU CHI TUẦN NÀY' : 'THU CHI THÁNG NÀY'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Period Dropdown */}
          <div ref={timePeriodDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsTimePeriodDropdownOpen(!isTimePeriodDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {currentTimePeriodLabel}
              <FaChevronDown className={`h-3 w-3 transition-transform ${isTimePeriodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTimePeriodDropdownOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsTimePeriodDropdownOpen(false)}
                  aria-hidden="true"
                />

                {/* Dropdown */}
                <div className="absolute right-0 z-50 mt-2 w-32 rounded-xl border-2 border-slate-200 bg-white shadow-2xl transition-all">
                  <div className="overflow-y-auto overscroll-contain">
                    {TIME_PERIOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setTimePeriod(option.value)
                          setIsTimePeriodDropdownOpen(false)
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${timePeriod === option.value
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {timePeriod === option.value && (
                          <span className="text-xs text-sky-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => {
              setSelectedDefaultPeriod(timePeriod)
              setIsSettingsModalOpen(true)
            }}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title="Cài đặt"
          >
            <FaCog className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content - Show loading ring when loading, image if no data, otherwise show charts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingRing size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="mb-4 flex flex-col items-center justify-center py-2">
          <img
            src="/money-motivation-10.png"
            alt="No data"
            className="h-auto w-[250px] max-w-md object-contain mb-4 opacity-70"
          />
          <p className="text-sm text-slate-500 text-center px-4">
            Chưa có dữ liệu Thu - Chi
          </p>
        </div>
      ) : (
        <>
          {/* Bar Chart and Summary Section */}
          <div className="mb-3 flex items-center gap-5">
            {/* Bar Chart - Left */}
            <div className="flex items-end h-[140px] w-[120px] shrink-0">
              <HorizontalBarChart income={income} expense={expense} height={140} />
            </div>

            {/* Summary - Right */}
            <div className="flex-1">
              <IncomeExpenseSummary income={income} expense={expense} isLoading={false} />
            </div>
          </div>

          {/* Donut Chart Section */}
          {expenseTransactions.length > 0 && expenseParentCategories.length > 0 ? (
            <div className="mb-4">
              <DonutChartWithLegend
                transactions={expenseTransactions}
                categories={categories}
                parentCategories={expenseParentCategories}
                totalAmount={expense}
              />
            </div>
          ) : (
            <div className="mb-4 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-8">
              <p className="text-sm text-slate-500 text-center px-4">
                Chưa có dữ liệu Thu - Chi
              </p>
            </div>
          )}
        </>
      )}

      {/* Record History Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-xl hover:scale-105 active:scale-95"
        >
          Lịch sử ghi chép
        </button>
      </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => !isSavingPreferences && setIsSettingsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Cài đặt</h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Cấu hình tham số hiển thị</p>
              </div>
              <button
                type="button"
                onClick={() => !isSavingPreferences && setIsSettingsModalOpen(false)}
                disabled={isSavingPreferences}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-6">
                {/* Default Period Selection */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3">
                    Biểu đồ mặc định
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Chọn khoảng thời gian hiển thị mặc định khi mở trang
                  </p>
                  <div className="space-y-2">
                    {TIME_PERIOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedDefaultPeriod(option.value)}
                        className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${selectedDefaultPeriod === option.value
                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                        {selectedDefaultPeriod === option.value && (
                          <FaCheck className="h-4 w-4 text-sky-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSavingPreferences(true)
                      try {
                        await updateChartPreferences(
                          selectedDefaultPeriod as ChartPeriodType,
                          false // chart_show_advanced
                        )
                        setTimePeriod(selectedDefaultPeriod)
                        success('Đã lưu cài đặt thành công!')
                        setIsSettingsModalOpen(false)
                      } catch (error) {
                        const message = error instanceof Error ? error.message : 'Không thể lưu cài đặt'
                        showError(message)
                      } finally {
                        setIsSavingPreferences(false)
                      }
                    }}
                    disabled={isSavingPreferences}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all ${isSavingPreferences
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-700 active:scale-95'
                      }`}
                  >
                    {isSavingPreferences ? 'Đang lưu...' : 'Lưu cài đặt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

