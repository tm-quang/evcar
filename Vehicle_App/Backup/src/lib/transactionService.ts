import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { formatDateUTC7, getNowUTC7 } from '../utils/dateUtils'
import { queryClient } from './react-query'
import { applyArchiveFilter } from '../store/useArchiveStore'

export type TransactionType = 'Thu' | 'Chi'

export type TransactionRecord = {
  id: string
  user_id: string
  wallet_id: string
  category_id: string
  type: TransactionType
  amount: number
  jar_id?: string | null
  description: string | null
  transaction_date: string
  notes: string | null
  tags: string[] | null
  image_urls: string[] | null
  location: string | null
  recipient_name: string | null
  is_borrowed: boolean
  lender_name: string | null
  lender_phone: string | null
  borrow_date: string | null
  exclude_from_reports: boolean
  created_at: string
  updated_at: string
}

export type TransactionInsert = {
  wallet_id: string
  category_id: string
  type: TransactionType
  amount: number
  jar_id?: string | null
  description?: string
  transaction_date?: string
  notes?: string
  tags?: string[]
  image_urls?: string[]
  location?: string | null
  recipient_name?: string | null
  is_borrowed?: boolean
  lender_name?: string | null
  lender_phone?: string | null
  borrow_date?: string | null
  exclude_from_reports?: boolean
}

export type TransactionUpdate = Partial<
  Omit<TransactionInsert, 'wallet_id' | 'category_id' | 'type'>
> & {
  wallet_id?: string
  category_id?: string
  type?: TransactionType
  jar_id?: string | null
}

export type TransactionFilters = {
  wallet_id?: string
  category_id?: string
  type?: TransactionType
  start_date?: string
  end_date?: string
  tags?: string[]
  limit?: number
  offset?: number
  exclude_from_reports?: boolean // If true, only get excluded transactions. If false, only get included transactions. If undefined, get all.
}

const TABLE_NAME = 'transactions'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy tất cả giao dịch với filters
export const fetchTransactions = async (
  filters?: TransactionFilters
): Promise<TransactionRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'transaction_date')

  query = query
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters) {
    if (filters.wallet_id) {
      query = query.eq('wallet_id', filters.wallet_id)
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id)
    }
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.start_date) {
      query = query.gte('transaction_date', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('transaction_date', filters.end_date)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    if (typeof filters.exclude_from_reports === 'boolean') {
      query = query.eq('exclude_from_reports', filters.exclude_from_reports)
    }
    if (typeof filters.limit === 'number') {
      query = query.limit(filters.limit)
    }
    if (typeof filters.offset === 'number') {
      const limit = filters.limit || 50
      query = query.range(filters.offset, filters.offset + limit - 1)
    }
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách giao dịch.')

  return data ?? []
}

// Lấy một giao dịch theo ID
export const getTransactionById = async (id: string): Promise<TransactionRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem giao dịch.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin giao dịch.')

  return data
}

// Tạo giao dịch mới
// Returns: { transaction: TransactionRecord, budgetWarning?: string }
export const createTransaction = async (
  payload: TransactionInsert
): Promise<{ transaction: TransactionRecord; budgetWarning?: string }> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo giao dịch.')
  }

  let budgetWarning: string | undefined

  // Check budget limits before creating transaction (only for expense transactions)
  if (payload.type === 'Chi') {
    const { checkBudgetLimit } = await import('./budgetService')
    const budgetCheck = await checkBudgetLimit({
      category_id: payload.category_id,
      wallet_id: payload.wallet_id,
      amount: payload.amount,
      transaction_date: payload.transaction_date || formatDateUTC7(getNowUTC7()),
      type: payload.type,
      exclude_from_reports: payload.exclude_from_reports || false,
    })

    // Hard limit: Reject transaction
    if (!budgetCheck.allowed) {
      throw new Error(budgetCheck.message)
    }

    // Soft limit: Store warning message to return to caller
    if (budgetCheck.message) {
      budgetWarning = budgetCheck.message
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      transaction_date: payload.transaction_date || formatDateUTC7(getNowUTC7()),
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo giao dịch mới.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu giao dịch sau khi tạo.')
  }

  // Lưu ý: Số dư ví được tự động cập nhật bởi database trigger (update_wallet_balance)
  // Không cần gọi syncWalletBalanceFromTransactions vì sẽ gây xung đột và tính 2 lần

  // Tạo thông báo cho giao dịch mới (chạy trong background)
  try {
    const { createNotification } = await import('./notificationService')
    await createNotification({
      type: 'transaction',
      title: `Giao dịch ${payload.type === 'Thu' ? 'thu nhập' : 'chi tiêu'}`,
      message: `${payload.description || 'Giao dịch'} - ${new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(payload.amount)}`,
      metadata: {
        transaction_id: data.id,
        amount: payload.amount,
        type: payload.type,
      },
      related_id: data.id,
      status: 'unread',
    })
  } catch (error) {
    // Silently continue if notification creation fails
    console.warn('Could not create notification for transaction:', error)
  }

  await queryClient.invalidateQueries({ queryKey: ['transactions'] })
  await queryClient.invalidateQueries({ queryKey: ['getTransactionStats'] })
  // Invalidate wallet cache vì balance đã được trigger cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getDefaultWallet'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })
  // Invalidate wallet cash flow stats cache vì có giao dịch mới
  await queryClient.invalidateQueries({ queryKey: ['getWalletCashFlowStats'] })
  // Invalidate budgets vì có thể đã thay đổi spending
  await queryClient.invalidateQueries({ queryKey: ['budgets'] })

  // Check và gửi budget alerts sau khi tạo transaction (chạy trong background)
  if (payload.type === 'Chi') {
    try {
      const { checkAndSendBudgetAlerts } = await import('./budgetAlertService')
      // Chạy async, không cần đợi
      checkAndSendBudgetAlerts().catch((error) => {
        console.warn('Error checking budget alerts:', error)
      })
    } catch (error) {
      // Silently continue if budget alert check fails
      console.warn('Could not check budget alerts:', error)
    }
  }

  // Return transaction with optional budget warning
  return { transaction: data, budgetWarning }
}

// Cập nhật giao dịch
export const updateTransaction = async (
  id: string,
  updates: TransactionUpdate
): Promise<TransactionRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật giao dịch.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật giao dịch.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu giao dịch sau khi cập nhật.')
  }

  // Lưu ý: Số dư ví được tự động cập nhật bởi database trigger (update_wallet_balance)
  // Trigger tự động xử lý cả wallet cũ (nếu wallet_id thay đổi) và wallet mới
  // Không cần gọi syncWalletBalanceFromTransactions vì sẽ gây xung đột và tính 2 lần

  await queryClient.invalidateQueries({ queryKey: ['transactions'] })
  await queryClient.invalidateQueries({ queryKey: ['getTransactionStats'] })
  // Invalidate wallet cache vì balance đã được trigger cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getDefaultWallet'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })
  // Invalidate wallet cash flow stats cache vì có giao dịch được cập nhật
  await queryClient.invalidateQueries({ queryKey: ['getWalletCashFlowStats'] })

  return data
}

// Xóa giao dịch
export const deleteTransaction = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa giao dịch.')
  }

  // Lấy wallet_id trước khi xóa (để trigger có thể hoàn tác số dư)
  await supabase
    .from(TABLE_NAME)
    .select('wallet_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa giao dịch.')

  // Lưu ý: Số dư ví được tự động cập nhật bởi database trigger (update_wallet_balance)
  // Trigger tự động hoàn tác số dư khi xóa giao dịch
  // Không cần gọi syncWalletBalanceFromTransactions vì sẽ gây xung đột và tính 2 lần

  await queryClient.invalidateQueries({ queryKey: ['transactions'] })
  await queryClient.invalidateQueries({ queryKey: ['getTransactionStats'] })
  // Invalidate wallet cache vì balance đã được trigger cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getDefaultWallet'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })
  // Invalidate wallet cash flow stats cache vì có giao dịch bị xóa
  await queryClient.invalidateQueries({ queryKey: ['getWalletCashFlowStats'] })
}

// Lấy thống kê giao dịch
export const getTransactionStats = async (
  startDate?: string,
  endDate?: string,
  walletId?: string
): Promise<{
  total_income: number
  total_expense: number
  net_balance: number
  transaction_count: number
}> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem thống kê.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('type, amount')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'transaction_date')

  if (walletId) {
    query = query.eq('wallet_id', walletId)
  }
  if (startDate) {
    query = query.gte('transaction_date', startDate)
  }
  if (endDate) {
    query = query.lte('transaction_date', endDate)
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải thống kê giao dịch.')

  const transactions = data ?? []
  const total_income = transactions
    .filter((t) => t.type === 'Thu')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const total_expense = transactions
    .filter((t) => t.type === 'Chi')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    total_income,
    total_expense,
    net_balance: total_income - total_expense,
    transaction_count: transactions.length,
  }
}

