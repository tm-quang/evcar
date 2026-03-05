import { fetchTransactions } from './transactionService'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import type { WalletRecord } from './walletService'
import { createBalanceHistory } from './walletBalanceHistoryService'

/**
 * Tính số dư ví từ giao dịch
 * Công thức: Số dư ban đầu (initial_balance) + Tổng Thu - Tổng Chi
 * 
 * Lưu ý: wallet.initial_balance là số dư ban đầu cố định (không đổi).
 * wallet.balance là số dư hiện tại (có thể thay đổi).
 * Số dư hiện tại được tính động từ initial_balance + giao dịch.
 */
export const calculateWalletBalanceFromTransactions = async (
  walletId: string,
  initialBalance: number = 0
): Promise<number> => {
  try {
    // Only get transactions that are included in reports (exclude_from_reports = false)
    const transactions = await fetchTransactions({ wallet_id: walletId, exclude_from_reports: false })

    const totalIncome = transactions
      .filter((t) => t.type === 'Thu')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpense = transactions
      .filter((t) => t.type === 'Chi')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Số dư hiện tại = Số dư ban đầu (initial_balance) + Thu - Chi
    return initialBalance + totalIncome - totalExpense
  } catch (error) {
    console.error('Error calculating wallet balance:', error)
    return initialBalance
  }
}

/**
 * Thống kê chi tiết luồng tiền cho một ví
 */
export type WalletCashFlowStats = {
  // Số dư
  currentBalance: number
  initialBalance: number

  // Thu nhập
  totalIncome: number
  incomeCount: number
  averageIncome: number
  largestIncome: number
  smallestIncome: number

  // Chi tiêu
  totalExpense: number
  expenseCount: number
  averageExpense: number
  largestExpense: number
  smallestExpense: number

  // Tỷ lệ phần trăm
  incomePercentage: number // Thu so với số dư (%)
  expensePercentage: number // Chi so với số dư (%)
  expenseToIncomeRatio: number // Tỷ lệ Chi/Thu (%)

  // Phân tích nâng cao
  netFlow: number // Thu - Chi
  savingsRate: number // Tỷ lệ tiết kiệm: (Thu - Chi) / Thu * 100
  expenseRate: number // Tỷ lệ chi tiêu: Chi / Thu * 100

  // Thống kê theo thời gian
  dailyAverageIncome: number
  dailyAverageExpense: number
  monthlyProjectedIncome: number
  monthlyProjectedExpense: number
}

/**
 * Lấy thống kê chi tiết luồng tiền cho một ví
 */
export const getWalletCashFlowStats = async (
  wallet: WalletRecord,
  startDate?: string,
  endDate?: string
): Promise<WalletCashFlowStats> => {
  try {
    const filters: { wallet_id: string; start_date?: string; end_date?: string; exclude_from_reports?: boolean } = {
      wallet_id: wallet.id,
      exclude_from_reports: false, // Only get transactions included in reports
    }

    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    const transactions = await fetchTransactions(filters)

    const incomeTransactions = transactions.filter((t) => t.type === 'Thu')
    const expenseTransactions = transactions.filter((t) => t.type === 'Chi')

    // Tính toán Thu nhập
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const incomeCount = incomeTransactions.length
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0
    const incomeAmounts = incomeTransactions.map((t) => Number(t.amount))
    const largestIncome = incomeAmounts.length > 0 ? Math.max(...incomeAmounts) : 0
    const smallestIncome = incomeAmounts.length > 0 ? Math.min(...incomeAmounts) : 0

    // Tính toán Chi tiêu
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const expenseCount = expenseTransactions.length
    const averageExpense = expenseCount > 0 ? totalExpense / expenseCount : 0
    const expenseAmounts = expenseTransactions.map((t) => Number(t.amount))
    const largestExpense = expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0
    const smallestExpense = expenseAmounts.length > 0 ? Math.min(...expenseAmounts) : 0

    // Tính số dư hiện tại
    // Sử dụng initial_balance làm mốc (không đổi), không dùng balance (có thể đã bị cập nhật)
    const initialBalance = wallet.initial_balance ?? wallet.balance ?? 0
    const currentBalance = await calculateWalletBalanceFromTransactions(wallet.id, initialBalance)

    // Tính tỷ lệ phần trăm
    const incomePercentage = currentBalance > 0 ? (totalIncome / currentBalance) * 100 : 0
    const expensePercentage = currentBalance > 0 ? (totalExpense / currentBalance) * 100 : 0
    const expenseToIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0

    // Phân tích nâng cao
    const netFlow = totalIncome - totalExpense
    const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100) : 0
    const expenseRate = totalIncome > 0 ? ((totalExpense / totalIncome) * 100) : 0

    // Thống kê theo thời gian
    let days = 1
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    } else if (startDate) {
      const start = new Date(startDate)
      const now = new Date()
      days = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    }

    const dailyAverageIncome = days > 0 ? totalIncome / days : 0
    const dailyAverageExpense = days > 0 ? totalExpense / days : 0
    const monthlyProjectedIncome = dailyAverageIncome * 30
    const monthlyProjectedExpense = dailyAverageExpense * 30

    const stats: WalletCashFlowStats = {
      currentBalance,
      initialBalance,
      totalIncome,
      incomeCount,
      averageIncome,
      largestIncome,
      smallestIncome,
      totalExpense,
      expenseCount,
      averageExpense,
      largestExpense,
      smallestExpense,
      incomePercentage,
      expensePercentage,
      expenseToIncomeRatio,
      netFlow,
      savingsRate,
      expenseRate,
      dailyAverageIncome,
      dailyAverageExpense,
      monthlyProjectedIncome,
      monthlyProjectedExpense,
    }

    return stats
  } catch (error) {
    console.error('Error getting wallet cash flow stats:', error)
    // Return default stats
    return {
      currentBalance: wallet.balance,
      initialBalance: wallet.balance,
      totalIncome: 0,
      incomeCount: 0,
      averageIncome: 0,
      largestIncome: 0,
      smallestIncome: 0,
      totalExpense: 0,
      expenseCount: 0,
      averageExpense: 0,
      largestExpense: 0,
      smallestExpense: 0,
      incomePercentage: 0,
      expensePercentage: 0,
      expenseToIncomeRatio: 0,
      netFlow: 0,
      savingsRate: 0,
      expenseRate: 0,
      dailyAverageIncome: 0,
      dailyAverageExpense: 0,
      monthlyProjectedIncome: 0,
      monthlyProjectedExpense: 0,
    }
  }
}

/**
 * Tự động cập nhật số dư ví từ giao dịch
 * 
 * Logic:
 * - Sử dụng wallet.initial_balance làm mốc (số dư ban đầu, không đổi)
 * - Tính số dư hiện tại: currentBalance = initial_balance + totalIncome - totalExpense
 * - Cập nhật wallet.balance = currentBalance (số dư hiện tại)
 * - KHÔNG đụng wallet.initial_balance (luôn giữ nguyên)
 * 
 * Điều này đảm bảo:
 * - Số dư ban đầu luôn giữ nguyên để làm mốc tính toán
 * - Số dư hiện tại được cập nhật chính xác từ giao dịch
 * - Không bị trừ chi tiêu 2 lần như trước
 */
export const syncWalletBalanceFromTransactions = async (
  walletId: string
): Promise<WalletRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật số dư ví.')
  }

  // Lấy ví hiện tại
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', walletId)
    .eq('user_id', user.id)
    .single()

  if (walletError || !wallet) {
    throw new Error('Không tìm thấy ví.')
  }

  // Lưu số dư cũ để lưu vào lịch sử
  const oldBalance = wallet.balance

  // Lấy tất cả giao dịch để tính số dư (chỉ lấy những giao dịch không bị exclude)
  const transactions = await fetchTransactions({ wallet_id: walletId, exclude_from_reports: false })

  const totalIncome = transactions
    .filter((t) => t.type === 'Thu')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'Chi')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  // Tính số dư hiện tại từ giao dịch
  // Sử dụng initial_balance làm mốc (không đổi), không dùng balance (có thể đã bị cập nhật)
  // Số dư hiện tại = Số dư ban đầu (initial_balance) + Tổng Thu - Tổng Chi
  const initialBalance = wallet.initial_balance ?? wallet.balance ?? 0
  const calculatedBalance = initialBalance + totalIncome - totalExpense

  // Cập nhật số dư hiện tại trong database
  // Lưu ý: Chỉ cập nhật balance (số dư hiện tại), KHÔNG đụng initial_balance (số dư ban đầu)
  // initial_balance luôn giữ nguyên để làm mốc tính toán
  const { data: updatedWallet, error: updateError } = await supabase
    .from('wallets')
    .update({ balance: calculatedBalance })
    .eq('id', walletId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    throw new Error('Không thể cập nhật số dư ví.')
  }

  // Lưu lịch sử thay đổi số dư
  try {
    await createBalanceHistory({
      wallet_id: walletId,
      old_balance: oldBalance,
      new_balance: calculatedBalance,
      change_type: 'sync',
      description: `Đồng bộ số dư từ giao dịch. Số dư cũ: ${oldBalance.toLocaleString('vi-VN')} ₫, Số dư mới: ${calculatedBalance.toLocaleString('vi-VN')} ₫`,
    })
  } catch (historyError) {
    // Log warning thay vì error để không làm nhiễu console
    // Lỗi RLS không ảnh hưởng đến chức năng chính
    console.warn('Không thể lưu lịch sử số dư (có thể do RLS policy chưa được cấu hình):', historyError)
  }

  return updatedWallet
}

/**
 * Cập nhật số dư tất cả ví từ giao dịch
 */
export const syncAllWalletBalances = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhật để cập nhật số dư ví.')
  }

  // Lấy tất cả ví
  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error || !wallets) {
    throw new Error('Không thể tải danh sách ví.')
  }

  // Cập nhật số dư cho từng ví
  await Promise.all(wallets.map((wallet) => syncWalletBalanceFromTransactions(wallet.id)))

}

