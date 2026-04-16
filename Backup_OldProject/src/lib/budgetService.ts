import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { fetchTransactions, type TransactionRecord } from './transactionService'
import { fetchCategories } from './categoryService'
import { queryClient } from './react-query'
import { applyArchiveFilter } from '../store/useArchiveStore'
import {
  getNowUTC7,
  formatDateUTC7,
  getFirstDayOfMonthUTC7,
  getLastDayOfMonthUTC7,
  getStartOfDayUTC7,
  getEndOfDayUTC7,
  getDateComponentsUTC7,
  getDayOfWeekUTC7,
  createDateUTC7,
} from '../utils/dateUtils'

export type PeriodType = 'weekly' | 'monthly' | 'yearly'

export type LimitType = 'hard' | 'soft'

export type BudgetRecord = {
  id: string
  user_id: string
  category_id: string
  wallet_id: string | null
  amount: number
  period_type: PeriodType
  period_start: string
  period_end: string
  is_active: boolean
  limit_type: LimitType | null // 'hard' = từ chối, 'soft' = cảnh báo
  notes: string | null
  created_at: string
  updated_at: string
}

export type BudgetInsert = {
  category_id: string
  wallet_id?: string | null
  amount: number
  period_type: PeriodType
  period_start: string
  period_end: string
  limit_type?: LimitType | null
  notes?: string
}

export type BudgetUpdate = Partial<Omit<BudgetInsert, 'category_id'>> & {
  is_active?: boolean
}

export type BudgetStatus = 'safe' | 'warning' | 'danger' | 'critical'

export type BudgetWithSpending = BudgetRecord & {
  spent_amount: number
  usage_percentage: number
  remaining_amount: number
  status: BudgetStatus
}

export type BudgetFilters = {
  category_id?: string
  wallet_id?: string
  period_type?: PeriodType
  year?: number
  month?: number
  is_active?: boolean
}

const TABLE_NAME = 'budgets'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Database columns match code expectations: period_start, period_end, period_type
// No mapping needed

// Get Monday of a given date in UTC+7 (week starts on Monday)
const getMonday = (date: Date): Date => {
  const vnDay = getDayOfWeekUTC7(date)
  const diff = vnDay === 0 ? -6 : 1 - vnDay // Monday is 1
  const mondayTime = date.getTime() + diff * 24 * 60 * 60 * 1000
  const mondayDate = new Date(mondayTime)
  const components = getDateComponentsUTC7(mondayDate)
  return createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)
}

// Get Sunday of a given week in UTC+7 (week ends on Sunday)
const getSunday = (monday: Date): Date => {
  const sundayTime = monday.getTime() + 6 * 24 * 60 * 60 * 1000
  const sundayDate = new Date(sundayTime)
  const components = getDateComponentsUTC7(sundayDate)
  return createDateUTC7(components.year, components.month, components.day, 23, 59, 59, 999)
}

// Calculate period dates in UTC+7
// Ensures periods don't start in the past
export const calculatePeriod = (
  periodType: PeriodType,
  year: number,
  month?: number,
  weekStartDate?: Date // For weekly: the date to calculate week from
): { start: Date; end: Date } => {
  const now = getNowUTC7()
  const nowComponents = getDateComponentsUTC7(now)
  const nowStartOfDay = getStartOfDayUTC7(nowComponents.year, nowComponents.month, nowComponents.day)

  if (periodType === 'monthly' && month) {
    // Create dates in UTC+7
    // Start: first day of the month at 00:00:00 UTC+7
    const selectedMonth = getFirstDayOfMonthUTC7(year, month)
    // End: last day of the month at 23:59:59 UTC+7
    const selectedMonthEnd = getLastDayOfMonthUTC7(year, month)

    // If selected month is in the past, use current month instead
    if (selectedMonthEnd < nowStartOfDay) {
      const currentMonth = getFirstDayOfMonthUTC7(nowComponents.year, nowComponents.month)
      const currentMonthEnd = getLastDayOfMonthUTC7(nowComponents.year, nowComponents.month)
      return { start: currentMonth, end: currentMonthEnd }
    }

    return { start: selectedMonth, end: selectedMonthEnd }
  }

  if (periodType === 'yearly') {
    // Create dates in UTC+7
    const selectedYear = getStartOfDayUTC7(year, 1, 1)
    const selectedYearEnd = getEndOfDayUTC7(year, 12, 31)

    // If selected year is in the past, use current year instead
    if (selectedYearEnd < nowStartOfDay) {
      const currentYear = getStartOfDayUTC7(nowComponents.year, 1, 1)
      const currentYearEnd = getEndOfDayUTC7(nowComponents.year, 12, 31)
      return { start: currentYear, end: currentYearEnd }
    }

    return { start: selectedYear, end: selectedYearEnd }
  }

  // Weekly
  if (periodType === 'weekly') {
    let weekStart: Date

    if (weekStartDate) {
      // Use provided week start date
      weekStart = getMonday(weekStartDate)
    } else {
      // Use current week
      weekStart = getMonday(now)
    }

    // If the week is in the past, use current week instead
    const weekEnd = getSunday(weekStart)
    if (weekEnd < nowStartOfDay) {
      weekStart = getMonday(now)
    }

    const weekEndDate = getSunday(weekStart)
    return { start: weekStart, end: weekEndDate }
  }

  // Fallback: return current month in UTC+7
  const currentMonth = getFirstDayOfMonthUTC7(nowComponents.year, nowComponents.month)
  const currentMonthEnd = getLastDayOfMonthUTC7(nowComponents.year, nowComponents.month)
  return { start: currentMonth, end: currentMonthEnd }
}

// Get current period in UTC+7
export const getCurrentPeriod = (periodType: PeriodType): { start: Date; end: Date } => {
  const now = getNowUTC7()
  const nowComponents = getDateComponentsUTC7(now)
  const year = nowComponents.year
  const month = nowComponents.month

  if (periodType === 'monthly') {
    return calculatePeriod('monthly', year, month)
  }

  if (periodType === 'yearly') {
    return calculatePeriod('yearly', year)
  }

  // Weekly - use current week in UTC+7
  return calculatePeriod('weekly', year, undefined, now)
}

// Calculate spent amount
const calculateBudgetSpent = (
  budget: BudgetRecord,
  transactions: TransactionRecord[]
): number => {
  return transactions
    .filter((t) => {
      if (t.category_id !== budget.category_id) return false
      if (t.type !== 'Chi') return false

      const txDate = new Date(t.transaction_date)
      const periodStart = new Date(budget.period_start)
      const periodEnd = new Date(budget.period_end)

      if (txDate < periodStart || txDate > periodEnd) return false
      if (budget.wallet_id && t.wallet_id !== budget.wallet_id) return false

      return true
    })
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

// Calculate usage percentage
const calculateUsagePercentage = (spent: number, budget: number): number => {
  if (budget <= 0) return 0
  return Math.round((spent / budget) * 100 * 100) / 100
}

// Get budget status
export const getBudgetStatus = (percentage: number): BudgetStatus => {
  if (percentage < 80) return 'safe'
  if (percentage < 100) return 'warning'
  if (percentage < 120) return 'danger'
  return 'critical'
}

// Get budget color
export const getBudgetColor = (status: BudgetStatus): string => {
  switch (status) {
    case 'safe':
      return 'green'
    case 'warning':
      return 'amber'
    case 'danger':
      return 'red'
    case 'critical':
      return 'red'
  }
}

// Fetch budgets
export const fetchBudgets = async (filters?: BudgetFilters): Promise<BudgetRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem hạn mức.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'period_start')

  query = query
    .order('period_start', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters) {
    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.wallet_id) query = query.eq('wallet_id', filters.wallet_id)
    if (filters.period_type) query = query.eq('period_type', filters.period_type)
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)
    if (filters.year) {
      query = query.gte('period_start', `${filters.year}-01-01`)
      query = query.lte('period_end', `${filters.year}-12-31`)
    }
    if (filters.month && filters.year) {
      const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
      // Format date in UTC+7
      const endDate = getLastDayOfMonthUTC7(filters.year, filters.month)
      const end = formatDateUTC7(endDate)
      query = query.gte('period_start', start)
      query = query.lte('period_end', end)
    }
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách hạn mức.')

  return data ?? []
}

// Get budget by ID
export const getBudgetById = async (id: string): Promise<BudgetRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem hạn mức.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải hạn mức.')

  return data
}

// Get budget with spending
export const getBudgetWithSpending = async (budgetId: string): Promise<BudgetWithSpending> => {
  const budget = await getBudgetById(budgetId)
  if (!budget) {
    throw new Error(`Không tìm thấy hạn mức với ID: ${budgetId}`)
  }

  try {
    const transactions = await fetchTransactions({
      category_id: budget.category_id,
      type: 'Chi',
      start_date: budget.period_start,
      end_date: budget.period_end,
      wallet_id: budget.wallet_id || undefined,
    })

    const spent = calculateBudgetSpent(budget, transactions)
    const percentage = calculateUsagePercentage(spent, budget.amount)
    const status = getBudgetStatus(percentage)

    return {
      ...budget,
      spent_amount: spent,
      usage_percentage: percentage,
      remaining_amount: budget.amount - spent,
      status,
    }
  } catch (error) {
    console.error(`Error calculating spending for budget ${budgetId}:`, error)
    // Return budget with zero spending if transaction fetch fails
    return {
      ...budget,
      spent_amount: 0,
      usage_percentage: 0,
      remaining_amount: budget.amount,
      status: 'safe' as BudgetStatus,
    }
  }
}

// Create budget
export const createBudget = async (payload: BudgetInsert): Promise<BudgetRecord> => {
  try {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
      throw new Error('Bạn cần đăng nhập để tạo hạn mức.')
    }

    // Validate category is "Chi tiêu"
    const categories = await fetchCategories()
    const category = categories.find((c) => c.id === payload.category_id)
    if (!category || category.type !== 'Chi tiêu') {
      throw new Error('Hạn mức chỉ có thể đặt cho hạng mục "Chi tiêu".')
    }

    // Check for duplicate active budget
    const existingBudgets = await fetchBudgets({
      category_id: payload.category_id,
      wallet_id: payload.wallet_id || undefined,
      is_active: true,
    })

    const hasOverlap = existingBudgets.some((b) => {
      const bStart = new Date(b.period_start)
      const bEnd = new Date(b.period_end)
      const pStart = new Date(payload.period_start)
      const pEnd = new Date(payload.period_end)

      return (
        (pStart >= bStart && pStart <= bEnd) ||
        (pEnd >= bStart && pEnd <= bEnd) ||
        (pStart <= bStart && pEnd >= bEnd)
      )
    })

    if (hasOverlap) {
      throw new Error('Đã có hạn mức active cho hạng mục này trong khoảng thời gian này.')
    }

    // Build insert object, only including fields that have values
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      category_id: payload.category_id,
      amount: payload.amount,
      period_type: payload.period_type,
      period_start: payload.period_start,
      period_end: payload.period_end,
      is_active: true,
    }

    // Only add optional fields if they have values
    if (payload.wallet_id !== undefined && payload.wallet_id !== null) {
      insertData.wallet_id = payload.wallet_id
    }

    if (payload.limit_type !== undefined && payload.limit_type !== null) {
      insertData.limit_type = payload.limit_type
    }

    if (payload.notes) {
      insertData.notes = payload.notes.trim()
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating budget:', error)

      // Provide more user-friendly error messages
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        throw new Error('Không thể tạo hạn mức. Vui lòng thử lại.')
      } else if (error.message.includes('column') && error.message.includes('not found')) {
        // Schema error - column doesn't exist
        throw new Error('Lỗi cấu hình database. Vui lòng liên hệ quản trị viên để cập nhật schema.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại')
      } else if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Hạn mức này đã tồn tại. Vui lòng kiểm tra lại.')
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại hạng mục hoặc ví đã chọn.')
      }
      throw new Error(error.message || 'Không thể tạo hạn mức.')
    }

    if (!data) {
      throw new Error('Không nhận được dữ liệu hạn mức sau khi tạo.')
    }

    await queryClient.invalidateQueries({ queryKey: ['budgets'] })

    return data
  } catch (err) {
    // Re-throw with better error message if it's not already an Error
    if (err instanceof Error) {
      throw err
    }
    throw new Error('Đã xảy ra lỗi không mong muốn khi tạo hạn mức')
  }
}

// Update budget
export const updateBudget = async (id: string, updates: BudgetUpdate): Promise<BudgetRecord> => {
  try {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
      throw new Error('Bạn cần đăng nhập để cập nhật hạn mức.')
    }

    // Build update object, only including fields that are explicitly provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Only include fields that are explicitly provided in updates
    if (updates.wallet_id !== undefined) {
      updateData.wallet_id = updates.wallet_id || null
    }

    if (updates.amount !== undefined) {
      updateData.amount = updates.amount
    }

    if (updates.period_type !== undefined) {
      updateData.period_type = updates.period_type
    }

    if (updates.period_start !== undefined) {
      updateData.period_start = updates.period_start
    }

    if (updates.period_end !== undefined) {
      updateData.period_end = updates.period_end
    }

    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active
    }

    // Only add limit_type if it's explicitly provided (including null)
    if ('limit_type' in updates) {
      updateData.limit_type = updates.limit_type || null
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes ? updates.notes.trim() : null
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating budget:', error)

      // Provide more user-friendly error messages
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        throw new Error('Không thể cập nhật hạn mức. Vui lòng thử lại.')
      } else if (error.message.includes('column') && error.message.includes('not found')) {
        // Schema error - column doesn't exist
        throw new Error('Lỗi cấu hình database. Vui lòng liên hệ quản trị viên để cập nhật schema.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại')
      } else if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Hạn mức này đã tồn tại. Vui lòng kiểm tra lại.')
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại hạng mục hoặc ví đã chọn.')
      }
      throw new Error(error.message || 'Không thể cập nhật hạn mức.')
    }

    if (!data) {
      throw new Error('Không nhận được dữ liệu hạn mức sau khi cập nhật.')
    }

    await queryClient.invalidateQueries({ queryKey: ['budgets'] })

    return data
  } catch (err) {
    // Re-throw with better error message if it's not already an Error
    if (err instanceof Error) {
      throw err
    }
    throw new Error('Đã xảy ra lỗi không mong muốn khi cập nhật hạn mức')
  }
}

// Delete budget
export const deleteBudget = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa hạn mức.')
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id).eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa hạn mức.')

  await queryClient.invalidateQueries({ queryKey: ['budgets'] })
}

// Get active budgets for current period
export const getActiveBudgetsForCurrentPeriod = async (
  periodType: PeriodType = 'monthly'
): Promise<BudgetWithSpending[]> => {
  const period = getCurrentPeriod(periodType)
  const budgets = await fetchBudgets({
    is_active: true,
    period_type: periodType,
  })

  const currentBudgets = budgets.filter((b) => {
    const bStart = new Date(b.period_start)
    const bEnd = new Date(b.period_end)
    return period.start >= bStart && period.end <= bEnd
  })

  const budgetsWithSpending = await Promise.all(
    currentBudgets.map((b) => getBudgetWithSpending(b.id))
  )

  return budgetsWithSpending.sort((a, b) => b.usage_percentage - a.usage_percentage)
}

// Get active budget for a specific category, wallet, and date
// Returns the most relevant budget (prioritizes wallet-specific budgets)
export const getBudgetForCategory = async (
  categoryId: string,
  walletId: string | null,
  date: string | Date
): Promise<BudgetWithSpending | null> => {
  const targetDate = typeof date === 'string' ? new Date(date) : date

  // Find active budgets that match this category
  const budgets = await fetchBudgets({
    category_id: categoryId,
    is_active: true
  })

  // Filter budgets that match wallet and date
  const matchingBudgets = budgets.filter((budget) => {
    // Must match wallet (if budget has wallet_id, transaction must match)
    if (budget.wallet_id && budget.wallet_id !== walletId) return false

    // Date must be within budget period
    const periodStart = new Date(budget.period_start)
    const periodEnd = new Date(budget.period_end)
    if (targetDate < periodStart || targetDate > periodEnd) return false

    return true
  })

  if (matchingBudgets.length === 0) {
    return null
  }

  // Prioritize wallet-specific budgets over general budgets
  const walletSpecificBudget = matchingBudgets.find(b => b.wallet_id === walletId)
  const selectedBudget = walletSpecificBudget || matchingBudgets[0]

  return await getBudgetWithSpending(selectedBudget.id)
}

// Check if transaction would exceed budget limits
// Returns: { allowed: boolean, budget: BudgetRecord | null, message: string }
// Improved: Checks all matching budgets and returns the most restrictive limit
export const checkBudgetLimit = async (
  transaction: {
    category_id: string
    wallet_id: string
    amount: number
    transaction_date: string
    type: 'Thu' | 'Chi'
    exclude_from_reports?: boolean
  }
): Promise<{ allowed: boolean; budget: BudgetRecord | null; message: string }> => {
  // Only check for expense transactions
  if (transaction.type !== 'Chi') {
    return { allowed: true, budget: null, message: '' }
  }

  // Skip budget check if transaction is excluded from reports
  if (transaction.exclude_from_reports) {
    return { allowed: true, budget: null, message: '' }
  }

  const transactionDate = new Date(transaction.transaction_date)

  // Find active budgets that match this transaction
  const budgets = await fetchBudgets({ is_active: true })

  const matchingBudgets = budgets.filter((budget) => {
    // Must match category
    if (budget.category_id !== transaction.category_id) return false

    // Must match wallet (if budget has wallet_id, transaction must match)
    if (budget.wallet_id && budget.wallet_id !== transaction.wallet_id) return false

    // Transaction date must be within budget period
    const periodStart = new Date(budget.period_start)
    const periodEnd = new Date(budget.period_end)
    if (transactionDate < periodStart || transactionDate > periodEnd) return false

    return true
  })

  if (matchingBudgets.length === 0) {
    return { allowed: true, budget: null, message: '' }
  }

  // Prioritize wallet-specific budgets, then check all matching budgets
  // Sort: wallet-specific first, then by period start (most recent first)
  const sortedBudgets = matchingBudgets.sort((a, b) => {
    // Wallet-specific budgets first
    if (a.wallet_id === transaction.wallet_id && b.wallet_id !== transaction.wallet_id) return -1
    if (a.wallet_id !== transaction.wallet_id && b.wallet_id === transaction.wallet_id) return 1
    // Then by period start (most recent first)
    return new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)

  // Check each matching budget (prioritize hard limits)
  let hardLimitBudget: { budget: BudgetRecord; budgetWithSpending: BudgetWithSpending } | null = null
  let softLimitBudget: { budget: BudgetRecord; budgetWithSpending: BudgetWithSpending } | null = null

  for (const budget of sortedBudgets) {
    const budgetWithSpending = await getBudgetWithSpending(budget.id)
    const newSpent = budgetWithSpending.spent_amount + transaction.amount
    const wouldExceed = newSpent > budget.amount

    if (wouldExceed) {
      if (budget.limit_type === 'hard') {
        // Hard limit: Store and continue checking (in case there are multiple)
        if (!hardLimitBudget) {
          hardLimitBudget = { budget, budgetWithSpending }
        }
      } else {
        // Soft limit: Store if no hard limit found yet
        if (!softLimitBudget && !hardLimitBudget) {
          softLimitBudget = { budget, budgetWithSpending }
        }
      }
    }
  }

  // Return hard limit error if found (most restrictive)
  if (hardLimitBudget) {
    return {
      allowed: false,
      budget: hardLimitBudget.budget,
      message: `Giao dịch này sẽ vượt quá hạn mức giới hạn cứng cho hạng mục này. Đã chi: ${formatCurrency(hardLimitBudget.budgetWithSpending.spent_amount)}/${formatCurrency(hardLimitBudget.budget.amount)}. Số tiền còn lại: ${formatCurrency(hardLimitBudget.budgetWithSpending.remaining_amount)}.`,
    }
  }

  // Return soft limit warning if found
  if (softLimitBudget) {
    return {
      allowed: true,
      budget: softLimitBudget.budget,
      message: `⚠️ Cảnh báo: Giao dịch này sẽ vượt quá hạn mức cho hạng mục này. Đã chi: ${formatCurrency(softLimitBudget.budgetWithSpending.spent_amount)}/${formatCurrency(softLimitBudget.budget.amount)}. Số tiền còn lại: ${formatCurrency(softLimitBudget.budgetWithSpending.remaining_amount)}.`,
    }
  }

  return { allowed: true, budget: null, message: '' }
}

