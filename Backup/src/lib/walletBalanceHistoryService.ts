import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'

const TABLE_NAME = 'wallet_balance_history'

export type BalanceChangeType = 'sync' | 'manual' | 'undo' | 'transfer'

export type WalletBalanceHistoryRecord = {
  id: string
  wallet_id: string
  user_id: string
  old_balance: number
  new_balance: number
  change_type: BalanceChangeType
  description: string | null
  created_at: string
}

export type WalletBalanceHistoryInsert = {
  wallet_id: string
  old_balance: number
  new_balance: number
  change_type: BalanceChangeType
  description?: string | null
}

/**
 * Lưu lịch sử thay đổi số dư vào database
 */
export const createBalanceHistory = async (
  payload: WalletBalanceHistoryInsert
): Promise<WalletBalanceHistoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để lưu lịch sử số dư.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating balance history:', error)
    throw new Error('Không thể lưu lịch sử số dư.')
  }

  if (!data) {
    throw new Error('Không nhận được dữ liệu lịch sử sau khi tạo.')
  }

  return data
}

/**
 * Lấy lịch sử thay đổi số dư của một ví
 */
export const getWalletBalanceHistory = async (
  walletId: string,
  limit: number = 50
): Promise<WalletBalanceHistoryRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem lịch sử số dư.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('wallet_id', walletId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching balance history:', error)
    throw new Error('Không thể tải lịch sử số dư.')
  }

  return data || []
}

/**
 * Lấy bản ghi lịch sử gần nhất của một ví
 */
export const getLatestBalanceHistory = async (
  walletId: string
): Promise<WalletBalanceHistoryRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem lịch sử số dư.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('wallet_id', walletId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('Error fetching latest balance history:', error)
    throw new Error('Không thể tải lịch sử số dư.')
  }

  return data
}


