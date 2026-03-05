import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaDownload,
  FaSearch,
  FaFilter,
  FaWallet,
  FaPiggyBank,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { AdvancedAnalyticsChart } from '../components/charts/AdvancedAnalyticsChart'
import { DonutChartWithLegend } from '../components/charts/DonutChartWithLegend'
import { DateRangeFilter } from '../components/reports/DateRangeFilter'
import { ReportFilterModal } from '../components/reports/ReportFilterModal'
import { ExportExcelModal } from '../components/reports/ExportExcelModal'
import { CategoryDetailModal } from '../components/reports/CategoryDetailModal'
import { exportTransactionsToExcel, type ExportOptions } from '../utils/exportExcel'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { fetchCategories, fetchCategoriesHierarchical, type CategoryRecord, type CategoryWithChildren } from '../lib/categoryService'
import { fetchTransactions, type TransactionRecord } from '../lib/transactionService'
import { getNowUTC7, getDateComponentsUTC7, getFirstDayOfMonthUTC7, getLastDayOfMonthUTC7, formatDateUTC7, createDateUTC7, getDayOfWeekUTC7 } from '../utils/dateUtils'

export type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
type TabType = 'overview' | 'income' | 'expense'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const getDateRange = (rangeType: DateRangeType, customStart?: string, customEnd?: string) => {
  const now = getNowUTC7()
  const components = getDateComponentsUTC7(now)
  let startDate: Date
  let endDate: Date

  switch (rangeType) {
    case 'day':
      startDate = createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)
      endDate = createDateUTC7(components.year, components.month, components.day, 23, 59, 59, 999)
      break
    case 'week': {
      const vnDay = getDayOfWeekUTC7(now)
      const diff = vnDay === 0 ? -6 : 1 - vnDay // Monday is 1

      const monday = createDateUTC7(components.year, components.month, components.day + diff, 0, 0, 0, 0)
      const mondayComponents = getDateComponentsUTC7(monday)
      startDate = createDateUTC7(mondayComponents.year, mondayComponents.month, mondayComponents.day, 0, 0, 0, 0)

      const sunday = createDateUTC7(mondayComponents.year, mondayComponents.month, mondayComponents.day + 6, 23, 59, 59, 999)
      const sundayComponents = getDateComponentsUTC7(sunday)
      endDate = createDateUTC7(sundayComponents.year, sundayComponents.month, sundayComponents.day, 23, 59, 59, 999)
      break
    }
    case 'month':
      startDate = getFirstDayOfMonthUTC7(components.year, components.month)
      endDate = getLastDayOfMonthUTC7(components.year, components.month)
      break
    case 'quarter': {
      const quarter = Math.floor((components.month - 1) / 3)
      const quarterStartMonth = quarter * 3 + 1
      startDate = getFirstDayOfMonthUTC7(components.year, quarterStartMonth)
      const quarterEndMonth = quarterStartMonth + 2
      endDate = getLastDayOfMonthUTC7(components.year, quarterEndMonth)
      break
    }
    case 'year':
      startDate = getFirstDayOfMonthUTC7(components.year, 1)
      endDate = getLastDayOfMonthUTC7(components.year, 12)
      break
    case 'custom':
      if (customStart) {
        const customStartDate = new Date(customStart + 'T00:00:00+07:00')
        const customStartComponents = getDateComponentsUTC7(customStartDate)
        startDate = createDateUTC7(customStartComponents.year, customStartComponents.month, customStartComponents.day, 0, 0, 0, 0)
      } else {
        startDate = getFirstDayOfMonthUTC7(components.year, components.month)
      }
      if (customEnd) {
        const customEndDate = new Date(customEnd + 'T23:59:59+07:00')
        const customEndComponents = getDateComponentsUTC7(customEndDate)
        endDate = createDateUTC7(customEndComponents.year, customEndComponents.month, customEndComponents.day, 23, 59, 59, 999)
      } else {
        endDate = createDateUTC7(components.year, components.month, components.day, 23, 59, 59, 999)
      }
      break
    default:
      startDate = getFirstDayOfMonthUTC7(components.year, components.month)
      endDate = getLastDayOfMonthUTC7(components.year, components.month)
  }

  return {
    start: formatDateUTC7(startDate),
    end: formatDateUTC7(endDate),
    startDateObj: startDate,
    endDateObj: endDate
  }
}

const RANGE_LABEL_MAP: Record<DateRangeType, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
  custom: 'Tùy chỉnh',
}

const ReportPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()

  // Data State
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([]) // Load all transactions once
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]) // Filtered transactions
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [parentCategories, setParentCategories] = useState<CategoryWithChildren[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Track initial load

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isCategoryDetailModalOpen, setIsCategoryDetailModalOpen] = useState(false)
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] = useState<CategoryRecord | CategoryWithChildren | null>(null)

  // Filter State
  const [typeFilter, setTypeFilter] = useState<'all' | 'Thu' | 'Chi'>('all')
  const [rangeType, setRangeType] = useState<DateRangeType>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const dateRange = useMemo(
    () => getDateRange(rangeType, customStartDate, customEndDate),
    [rangeType, customStartDate, customEndDate]
  )

  // Load all data once on mount (categories, wallets, icons)
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [categoriesData, hierarchicalCategories, walletsData] = await Promise.all([
          fetchCategories(),
          fetchCategoriesHierarchical(),
          fetchWallets(false)
        ])

        // Load icons
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                iconsMap[category.id] = <span className="h-10 w-10 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
              } else {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-10 w-10" />
                }
              }
            } catch {
              // Ignore error
            }
          })
        )
        setCategoryIcons(iconsMap)
        setCategories(categoriesData)
        setParentCategories(hierarchicalCategories)
        setWallets(walletsData)
      } catch (err) {
        console.error('Error loading static data:', err)
        showError('Không thể tải dữ liệu báo cáo')
      }
    }

    void loadStaticData()
  }, [showError])

  // Load all transactions once on mount (load last 3 years for better performance)
  useEffect(() => {
    const loadAllTransactions = async () => {
      if (!isInitialLoad) return // Only load once

      setIsLoading(true)
      try {
        // Load transactions from last 3 years to current year
        const now = getNowUTC7()
        const components = getDateComponentsUTC7(now)
        const startYear = components.year - 2 // 3 years: current year + 2 previous years
        const startOfRange = getFirstDayOfMonthUTC7(startYear, 1)
        const endOfRange = getLastDayOfMonthUTC7(components.year, 12)

        const transactionsData = await fetchTransactions({
          start_date: formatDateUTC7(startOfRange),
          end_date: formatDateUTC7(endOfRange),
          exclude_from_reports: false,
        })

        setAllTransactions(transactionsData)
        setIsInitialLoad(false)
      } catch (err) {
        console.error('Error loading transactions:', err)
        showError('Không thể tải dữ liệu giao dịch')
      } finally {
        setIsLoading(false)
      }
    }

    void loadAllTransactions()
  }, [isInitialLoad, showError])

  // Filter transactions by date range (client-side)
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      const startDateStr = dateRange.start.split('T')[0]
      const endDateStr = dateRange.end.split('T')[0]

      const filtered = allTransactions.filter((t) => {
        const transactionDateStr = t.transaction_date.split('T')[0]
        return transactionDateStr >= startDateStr && transactionDateStr <= endDateStr
      })

      setTransactions(filtered)
    } else {
      setTransactions(allTransactions)
    }
  }, [allTransactions, dateRange.start, dateRange.end])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter)
    }

    if (selectedCategoryIds.length > 0) {
      // Get all category IDs including children if a parent is selected
      const expandedCategoryIds = new Set<string>()
      selectedCategoryIds.forEach(id => {
        expandedCategoryIds.add(id)
        const parent = parentCategories.find(p => p.id === id)
        if (parent?.children) {
          parent.children.forEach(child => expandedCategoryIds.add(child.id))
        }
      })
      result = result.filter((t) => expandedCategoryIds.has(t.category_id))
    }

    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      result = result.filter((t) => {
        const category = categories.find((c) => c.id === t.category_id)
        return (
          t.description?.toLowerCase().includes(normalizedSearch) ||
          category?.name.toLowerCase().includes(normalizedSearch) ||
          t.transaction_date.includes(normalizedSearch)
        )
      })
    }

    return result.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [transactions, typeFilter, selectedCategoryIds, searchTerm, categories])

  // Calculate statistics
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'Thu')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const expense = filteredTransactions
      .filter((t) => t.type === 'Chi')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const balance = income - expense

    // Savings Rate
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

    // Daily Average
    const daysDiff = Math.max(1, Math.ceil((dateRange.endDateObj.getTime() - dateRange.startDateObj.getTime()) / (1000 * 60 * 60 * 24)))
    const dailyIncome = income / daysDiff
    const dailyExpense = expense / daysDiff

    return { income, expense, balance, savingsRate, dailyIncome, dailyExpense }
  }, [filteredTransactions, dateRange])

  // Chart Data
  const chartData = useMemo(() => {
    if (transactions.length === 0) return []

    const dataMap = new Map<string, { income: number; expense: number; date: Date }>()

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date)
      let key: string

      if (rangeType === 'day') {
        key = `${date.getHours()}:00`
      } else if (rangeType === 'week') {
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
        key = dayNames[date.getDay()]
      } else if (rangeType === 'month') {
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const weekNum = Math.floor((date.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
        key = `Tuần ${weekNum}`
      } else if (rangeType === 'quarter') {
        key = `Tháng ${date.getMonth() + 1}`
      } else if (rangeType === 'year') {
        key = `Q${Math.floor(date.getMonth() / 3) + 1}`
      } else {
        key = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      }

      const existing = dataMap.get(key) || { income: 0, expense: 0, date }
      const amount = Number(transaction.amount) || 0

      if (transaction.type === 'Thu') existing.income += amount
      else existing.expense += amount
      dataMap.set(key, existing)
    })

    return Array.from(dataMap.entries()).map(([label, values]) => ({
      label,
      income: values.income,
      expense: values.expense,
      balance: values.income - values.expense,
    }))
  }, [transactions, rangeType])

  // Top Categories
  const getTopCategories = (type: 'Thu' | 'Chi') => {
    const map = new Map<string, number>()
    filteredTransactions.filter(t => t.type === type).forEach(t => {
      const amount = Number(t.amount) || 0
      map.set(t.category_id, (map.get(t.category_id) || 0) + amount)
    })

    return Array.from(map.entries())
      .map(([id, amount]) => ({
        category: categories.find(c => c.id === id),
        amount,
        percentage: type === 'Thu' ? (amount / stats.income) * 100 : (amount / stats.expense) * 100
      }))
      .filter(item => item.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const handleExportExcel = async (options: ExportOptions) => {
    try {
      // Apply filters based on options
      let transactionsToExport = transactions

      // Filter by type
      if (options.typeFilter !== 'all') {
        transactionsToExport = transactionsToExport.filter((t) => t.type === options.typeFilter)
      }

      // Filter by categories if specified
      if (options.categoryIds && options.categoryIds.length > 0) {
        transactionsToExport = transactionsToExport.filter((t) => options.categoryIds!.includes(t.category_id))
      }

      // Sort by date if groupByDate
      if (options.groupByDate) {
        transactionsToExport = transactionsToExport.sort((a, b) =>
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        )
      }

      // Sort by category if groupByCategory
      if (options.groupByCategory) {
        transactionsToExport = transactionsToExport.sort((a, b) => {
          const categoryA = categories.find((c) => c.id === a.category_id)?.name || ''
          const categoryB = categories.find((c) => c.id === b.category_id)?.name || ''
          return categoryA.localeCompare(categoryB, 'vi')
        })
      }

      await exportTransactionsToExcel(
        transactionsToExport,
        categories,
        wallets,
        options
      )
      success('Đã xuất file Excel thành công!')
    } catch (error) {
      console.error('Export error:', error)
      showError('Không thể xuất file. Vui lòng thử lại.')
      throw error
    }
  }

  const handleResetFilters = () => {
    setRangeType('month')
    setCustomStartDate('')
    setCustomEndDate('')
    setTypeFilter('all')
    setSelectedCategoryIds([])
    setSearchTerm('')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      {isLoading ? (
        <div className="flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
          <div className="h-5 w-40 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-9 w-9 rounded-full bg-slate-200 animate-pulse" />
        </div>
      ) : (
        <HeaderBar
          variant="page"
          title={isSearchOpen ? '' : "BÁO CÁO & THỐNG KÊ"}
          showIcon={
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 transition hover:scale-110 active:scale-95"
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
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 text-sm outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            ) : null
          }
        />
      )}

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-2 pb-24">
          {isLoading ? (
            <>
              {/* Date Filter Skeleton */}
              <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 rounded-xl bg-slate-200 animate-pulse" />
                  ))}
                </div>
                <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200 animate-pulse" />
              </div>

              {/* Summary Cards Skeleton */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 h-32 rounded-2xl bg-slate-200 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
              </div>

              {/* Tabs Skeleton */}
              <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />

              {/* Chart Area Skeleton */}
              <div className="h-72 rounded-3xl bg-slate-200 animate-pulse" />
            </>
          ) : (
            <>
              {/* Filters & Date */}
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <DateRangeFilter
                      rangeType={rangeType}
                      onRangeTypeChange={setRangeType}
                      startDate={customStartDate}
                      endDate={customEndDate}
                      onStartDateChange={setCustomStartDate}
                      onEndDateChange={setCustomEndDate}
                    />
                  </div>
                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-3xl border transition ${selectedCategoryIds.length > 0 || typeFilter !== 'all'
                      ? 'bg-blue-50 border-blue-200 text-blue-600'
                      : 'bg-white border-slate-200 text-slate-500'
                      }`}
                  >
                    <FaFilter className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Dòng tiền ròng</p>
                    <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                      <FaWallet className="h-3 w-3" />
                      <span>{RANGE_LABEL_MAP[rangeType]}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.balance)}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-blue-100">
                    <div className="flex items-center gap-1">
                      <FaPiggyBank className="h-3 w-3" />
                      <span>Tiết kiệm: {stats.savingsRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-px bg-blue-400/50" />
                    <div>TB ngày: {formatCurrency(stats.dailyIncome - stats.dailyExpense)}</div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-4 shadow-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-500">
                      <FaArrowUp className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Thu nhập</p>
                  </div>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(stats.income)}</p>
                </div>

                <div className="rounded-3xl bg-white p-4 shadow-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500">
                      <FaArrowDown className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">Chi tiêu</p>
                  </div>
                  <p className="text-lg font-bold text-red-500">{formatCurrency(stats.expense)}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex rounded-2xl bg-slate-100 p-1 shadow-inner">
                {(['overview', 'income', 'expense'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {tab === 'overview' ? 'Tổng quan' : tab === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="space-y-4">
                {activeTab === 'overview' && (
                  <section className="rounded-3xl bg-white shadow-lg border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-5 mb-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <FaChartLine className="text-blue-500" />
                        Phân tích tài chính
                      </h3>
                    </div>
                    <div className="pb-5">
                      <AdvancedAnalyticsChart data={chartData} height={300} />
                    </div>
                  </section>
                )}

                {activeTab === 'income' && (
                  <>
                    <section className="rounded-3xl bg-white p-5 shadow-lg border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4">Cơ cấu thu nhập</h3>
                      <DonutChartWithLegend
                        transactions={filteredTransactions.filter(t => t.type === 'Thu')}
                        categories={categories}
                        parentCategories={parentCategories}
                        totalAmount={stats.income}
                      />
                    </section>

                    <section className="space-y-3">
                      <h3 className="font-bold text-slate-900 px-1">Top nguồn thu</h3>
                      {getTopCategories('Thu').map((item) => (
                        <button
                          key={item.category!.id}
                          onClick={() => {
                            setSelectedCategoryForDetail(item.category!)
                            setIsCategoryDetailModalOpen(true)
                          }}
                          className="w-full flex items-center justify-between rounded-3xl bg-white p-3 shadow-lg border border-slate-100 hover:shadow-xl transition-all active:scale-95"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0">
                              {categoryIcons[item.category!.id]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.category!.name}</p>
                              <p className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                          <p className="font-bold text-green-600">+{formatCurrency(item.amount)}</p>
                        </button>
                      ))}
                    </section>
                  </>
                )}

                {activeTab === 'expense' && (
                  <>
                    <section className="rounded-3xl bg-white p-5 shadow-lg border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-4">Cơ cấu chi tiêu</h3>
                      <DonutChartWithLegend
                        transactions={filteredTransactions.filter(t => t.type === 'Chi')}
                        categories={categories}
                        parentCategories={parentCategories}
                        totalAmount={stats.expense}
                      />
                    </section>

                    <section className="space-y-3">
                      <h3 className="font-bold text-slate-900 px-1">Top chi tiêu</h3>
                      {getTopCategories('Chi').map((item) => (
                        <button
                          key={item.category!.id}
                          onClick={() => {
                            setSelectedCategoryForDetail(item.category!)
                            setIsCategoryDetailModalOpen(true)
                          }}
                          className="w-full flex items-center justify-between rounded-3xl bg-white p-3 shadow-lg border border-slate-100 hover:shadow-xl transition-all active:scale-95"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0">
                              {categoryIcons[item.category!.id]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.category!.name}</p>
                              <p className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                          <p className="font-bold text-red-600">-{formatCurrency(item.amount)}</p>
                        </button>
                      ))}
                    </section>
                  </>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-2xl bg-blue-500 text-white hover:bg-blue-600 shadow-lg"
                >
                  <FaDownload /> Xuất báo cáo chi tiết
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />

      <ReportFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        categories={categories}
        parentCategories={parentCategories}
        selectedCategoryIds={selectedCategoryIds}
        onCategoryToggle={(id) => {
          setSelectedCategoryIds(prev => {
            const isSelected = prev.includes(id)
            const parent = parentCategories.find(p => p.id === id)

            if (parent) {
              // It's a parent category
              const childIds = parent.children?.map(c => c.id) || []
              if (isSelected) {
                // Deselect parent and all children
                return prev.filter(i => i !== id && !childIds.includes(i))
              } else {
                // Select parent and all children
                const newSelection = [...new Set([...prev, id, ...childIds])]
                return newSelection
              }
            } else {
              // It's a child or standalone category
              if (isSelected) {
                const newSelection = prev.filter(i => i !== id)
                // If this was the last child of a parent, we might want to deselect the parent?
                // For now, let's just do individual toggle
                return newSelection
              } else {
                return [...prev, id]
              }
            }
          })
        }}
        onClearCategories={() => setSelectedCategoryIds([])}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onReset={handleResetFilters}

        onCategoryClick={(category) => {
          setSelectedCategoryForDetail(category)
          setIsCategoryDetailModalOpen(true)
          setIsFilterModalOpen(false)
        }}
      />

      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportExcel}
        dateRange={{
          start: dateRange.start,
          end: dateRange.end,
          type: rangeType,
        }}
        typeFilter={typeFilter}
        categoryIds={selectedCategoryIds}
      />

      <CategoryDetailModal
        isOpen={isCategoryDetailModalOpen}
        onClose={() => {
          setIsCategoryDetailModalOpen(false)
          setSelectedCategoryForDetail(null)
        }}
        category={selectedCategoryForDetail}
        transactions={allTransactions}
        wallets={wallets}
        dateRange={{
          start: dateRange.start,
          end: dateRange.end,
          type: rangeType,
        }}
        allCategories={categories}
      />
    </div>
  )
}

export default ReportPage

