import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

export type WalletType = 'Tiền mặt' | 'Ngân hàng' | 'Tiết kiệm' | 'Tín dụng' | 'Đầu tư' | 'Khác'

export type WalletRecord = {
  id: string
  user_id: string
  name: string
  type: WalletType
  balance: number
  initial_balance?: number // Số dư ban đầu (không đổi, dùng làm mốc tính toán) - optional vì không có trong database schema
  currency: string
  icon: string | null
  color: string | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export type WalletInsert = {
  name: string
  type: WalletType
  balance?: number
  currency?: string
  icon?: string
  color?: string
  description?: string
}

export type WalletUpdate = Partial<Omit<WalletInsert, 'type'>> & {
  is_active?: boolean
  balance?: number
}

const TABLE_NAME = 'wallets'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy tất cả ví của user hiện tại
export const fetchWallets = async (includeInactive = false): Promise<WalletRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ví.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách ví.')

  return data ?? []
}

// Lấy một ví theo ID
export const getWalletById = async (id: string): Promise<WalletRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem ví.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin ví.')

  return data
}

// Tạo ví mới
export const createWallet = async (payload: WalletInsert): Promise<WalletRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo ví.')
  }

  const initialBalance = payload.balance ?? 0
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      balance: initialBalance,
      currency: payload.currency ?? 'VND',
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo ví mới.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ví sau khi tạo.')
  }

  // Invalidate cache để đảm bảo danh sách ví được cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getNetAssets'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalance'] })
  await queryClient.invalidateQueries({ queryKey: ['getBalanceStats'] })

  return data
}

// Cập nhật ví
export const updateWallet = async (id: string, updates: WalletUpdate): Promise<WalletRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật ví.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật ví.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu ví sau khi cập nhật.')
  }

  // Invalidate cache để đảm bảo danh sách ví được cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getNetAssets'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalance'] })
  await queryClient.invalidateQueries({ queryKey: ['getBalanceStats'] })

  return data
}

// Xóa ví (soft delete bằng cách set is_active = false)
export const deleteWallet = async (id: string, hardDelete = false): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa ví.')
  }

  if (hardDelete) {
    const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id).eq('user_id', user.id)
    throwIfError(error, 'Không thể xóa ví.')
  } else {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user.id)
    throwIfError(error, 'Không thể vô hiệu hóa ví.')
  }

  // Invalidate cache để đảm bảo danh sách ví được cập nhật
  await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  await queryClient.invalidateQueries({ queryKey: ['getNetAssets'] })
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalance'] })
  await queryClient.invalidateQueries({ queryKey: ['getBalanceStats'] })

  // Also invalidate transaction stats since wallet balance changed
  await queryClient.invalidateQueries({ queryKey: ['getTransactionStats'] })
}

// Cập nhật số dư ví
export const updateWalletBalance = async (id: string, newBalance: number): Promise<WalletRecord> => {
  return updateWallet(id, { balance: newBalance })
}

/**
 * Lấy tài sản ròng (Net Assets)
 * Chỉ tính từ các ví "Tiền mặt" và "Ngân hàng"
 * Đây là số tiền thực tế có thể sử dụng để chi tiêu và nhận thu nhập
 * Dùng để tính toán thu nhập và chi tiêu
 */
export const getNetAssets = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets
    .filter((wallet) => wallet.type === 'Tiền mặt' || wallet.type === 'Ngân hàng')
    .reduce((total, wallet) => total + wallet.balance, 0)
}

/**
 * Lấy tổng số dư tất cả ví (bao gồm tất cả loại)
 * Lưu ý: Hàm này cộng tất cả các loại ví lại, bao gồm cả Tín dụng, Đầu tư, Tiết kiệm
 * Để tính tài sản ròng (chỉ Tiền mặt + Ngân hàng), sử dụng getNetAssets()
 */
export const getTotalBalance = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets.reduce((total, wallet) => total + wallet.balance, 0)
}

/**
 * Lấy tổng số dư tín dụng
 * Tính riêng cho các ví loại "Tín dụng"
 * Logic: Số dư nợ (thường là số âm) hoặc hạn mức còn lại
 */
export const getCreditBalance = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets
    .filter((wallet) => wallet.type === 'Tín dụng')
    .reduce((total, wallet) => total + wallet.balance, 0)
}

/**
 * Lấy tổng giá trị đầu tư
 * Tính riêng cho các ví loại "Đầu tư"
 * Logic: Giá trị đầu tư hiện tại (có thể thay đổi theo thị trường)
 */
export const getInvestmentBalance = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets
    .filter((wallet) => wallet.type === 'Đầu tư')
    .reduce((total, wallet) => total + wallet.balance, 0)
}

/**
 * Lấy tổng tiết kiệm
 * Tính riêng cho các ví loại "Tiết kiệm"
 * Logic: Số tiền tiết kiệm (không dùng để chi tiêu hàng ngày)
 */
export const getSavingsBalance = async (): Promise<number> => {
  const wallets = await fetchWallets()
  return wallets
    .filter((wallet) => wallet.type === 'Tiết kiệm')
    .reduce((total, wallet) => total + wallet.balance, 0)
}

/**
 * Lấy thống kê số dư theo từng loại ví
 * Trả về object chứa các thông tin:
 * - netAssets: Tài sản ròng (Tiền mặt + Ngân hàng)
 * - credit: Tổng tín dụng
 * - investment: Tổng đầu tư
 * - savings: Tổng tiết kiệm
 * - other: Các loại khác
 * - total: Tổng tất cả
 */
export const getBalanceStats = async (): Promise<{
  netAssets: number
  credit: number
  investment: number
  savings: number
  other: number
  total: number
}> => {
  const wallets = await fetchWallets()

  const netAssets = wallets
    .filter((w) => w.type === 'Tiền mặt' || w.type === 'Ngân hàng')
    .reduce((sum, w) => sum + w.balance, 0)

  const credit = wallets
    .filter((w) => w.type === 'Tín dụng')
    .reduce((sum, w) => sum + w.balance, 0)

  const investment = wallets
    .filter((w) => w.type === 'Đầu tư')
    .reduce((sum, w) => sum + w.balance, 0)

  const savings = wallets
    .filter((w) => w.type === 'Tiết kiệm')
    .reduce((sum, w) => sum + w.balance, 0)

  const other = wallets
    .filter((w) => w.type === 'Khác')
    .reduce((sum, w) => sum + w.balance, 0)

  const total = wallets.reduce((sum, w) => sum + w.balance, 0)

  return {
    netAssets,
    credit,
    investment,
    savings,
    other,
    total,
  }
}

// Lưu ví mặc định vào database
export const setDefaultWallet = async (walletId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đặt ví mặc định.')
  }

  // Kiểm tra xem ví có thuộc về user không
  const wallet = await getWalletById(walletId)
  if (!wallet) {
    throw new Error('Ví không tồn tại.')
  }

  // Lưu vào bảng user_preferences
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        key: 'default_wallet_id',
        value: walletId,
      },
      {
        onConflict: 'user_id,key',
      }
    )

  if (error) {
    // Nếu bảng user_preferences không tồn tại, fallback về localStorage
    if (!error.message?.includes('schema cache') && !error.message?.includes('does not exist')) {
      console.warn('Không thể lưu ví mặc định vào database:', error.message)
    }
    try {
      localStorage.setItem('bofin_default_wallet_id', walletId)
    } catch (e) {
      console.error('Không thể lưu vào localStorage:', e)
    }
  } else {
    // Invalidate cache để đảm bảo dữ liệu mới nhất
    await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  }

  // Also invalidate related caches
  await queryClient.invalidateQueries({ queryKey: ['getDefaultWallet'] })
}

// Lấy ví mặc định từ database
export const getDefaultWallet = async (): Promise<string | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return null
  }

  // Fetch từ database
  const { data, error } = await supabase
    .from('user_preferences')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'default_wallet_id')
    .maybeSingle()

  let result: string | null = null

  if (error) {
    // Nếu lỗi không phải là "not found" hoặc "schema cache", log và fallback
    if (error.code !== 'PGRST116' &&
      !error.message?.includes('schema cache') &&
      !error.message?.includes('does not exist')) {
      console.warn('Error fetching default_wallet_id:', error.message)
    }
  }

  if (error || !data) {
    // Fallback về localStorage
    try {
      result = localStorage.getItem('bofin_default_wallet_id')
    } catch {
      result = null
    }
  } else {
    result = data.value as string
  }

  return result
}

/**
 * Lấy danh sách ID các ví được chọn để tính vào tổng số dư
 * Mặc định: Tất cả ví "Tiền mặt" và "Ngân hàng"
 */
export const getTotalBalanceWalletIds = async (): Promise<string[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return []
  }

  // Fetch từ database
  const { data, error } = await supabase
    .from('user_preferences')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'total_balance_wallet_ids')
    .maybeSingle()

  let result: string[] = []

  if (error) {
    // Nếu lỗi không phải là "not found", log và fallback
    if (error.code !== 'PGRST116') {
      console.warn('⚠️ Error fetching total_balance_wallet_ids:', {
        error: error.message,
        code: error.code,
        details: error.details,
      })
    }
  }

  if (error || !data) {
    // Nếu không có trong database, mặc định lấy tất cả ví Tiền mặt + Ngân hàng
    try {
      const wallets = await fetchWallets()
      result = wallets
        .filter((w) => w.type === 'Tiền mặt' || w.type === 'Ngân hàng')
        .map((w) => w.id)
    } catch {
      // Fallback về localStorage
      try {
        const stored = localStorage.getItem('bofin_total_balance_wallet_ids')
        if (stored) {
          result = JSON.parse(stored)
        }
      } catch {
        result = []
      }
    }
  } else {
    try {
      result = JSON.parse(data.value as string)
    } catch (parseError) {
      console.error('❌ Error parsing value from database:', parseError)
      result = []
    }
  }

  return result
}

/**
 * Lưu danh sách ID các ví được chọn để tính vào tổng số dư
 */
export const setTotalBalanceWalletIds = async (walletIds: string[]): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật cài đặt.')
  }

  // Kiểm tra tất cả ví có tồn tại không (optional, but good for consistency)
  // Note: We don't strictly enforce it here to avoid extra fetch if not needed, 
  // but the original code did check. Let's keep it simple and trust the input or check if critical.
  // Original code checked ownership. Let's keep that check.
  const wallets = await fetchWallets()
  const validWalletIds = walletIds.filter((id) => wallets.some((w) => w.id === id))

  if (validWalletIds.length !== walletIds.length) {
    throw new Error('Một số ví không tồn tại hoặc không thuộc về bạn.')
  }

  // Lưu vào database
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        key: 'total_balance_wallet_ids',
        value: JSON.stringify(validWalletIds),
      },
      {
        onConflict: 'user_id,key',
      }
    )
    .select()

  if (error) {
    console.error('❌ Error saving to database:', error)

    // Fallback về localStorage
    try {
      localStorage.setItem('bofin_total_balance_wallet_ids', JSON.stringify(validWalletIds))
    } catch (e) {
      console.error('❌ Cannot save to localStorage:', e)
      throw new Error('Không thể lưu cài đặt. Vui lòng thử lại.')
    }
  } else {
    // Invalidate cache
    await queryClient.invalidateQueries({ queryKey: ['fetchWallets'] })
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })
}

