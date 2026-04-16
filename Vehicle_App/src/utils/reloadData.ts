/**
 * Reload Data Utility
 * Xóa toàn bộ cache, reset trạng thái và tải lại dữ liệu mới nhất
 */


import { clearUserCache } from '../lib/userCache'

import { resetSupabaseClient } from '../lib/supabaseClient'

/**
 * Clear tất cả cache và reset trạng thái
 * Bao gồm:
 * - Cache manager (memory + localStorage)
 * - User cache (session storage) - CHỈ khi shouldClearUserCache = true
 * - Preload timestamp
 * - Supabase client (nếu shouldResetClient = true)
 * 
 * @param shouldClearUserCache - Nếu true, sẽ clear user cache. Mặc định false để tránh lỗi khi login
 * @param shouldResetClient - Nếu true, sẽ reset Supabase client. Mặc định false để tránh mất session khi login
 */
export const clearAllCacheAndState = async (
  shouldClearUserCache: boolean = false,
  shouldResetClient: boolean = false
): Promise<void> => {
  try {
    // 1. Clear tất cả cache từ cache manager - REPLACED with React Query
    const { queryClient } = await import('../lib/react-query')
    queryClient.clear()

    // 2. Clear user cache (session storage) - CHỈ khi được yêu cầu (thường là khi logout)
    if (shouldClearUserCache) {
      clearUserCache()
    }



    // 4. Reset Supabase client - CHỈ khi được yêu cầu (thường là khi logout hoặc debug)
    if (shouldResetClient) {
      resetSupabaseClient()
    }

    // 5. Clear các localStorage keys khác nếu có
    try {
      // Clear favorite categories từ localStorage (fallback)
      const favoriteKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('bofin_favorite_categories_')
      )
      favoriteKeys.forEach(key => localStorage.removeItem(key))

      // Clear default wallet từ localStorage (fallback)
      localStorage.removeItem('bofin_default_wallet_id')
      localStorage.removeItem('bofin_total_balance_wallet_ids')

      // Clear notification preferences từ localStorage (fallback)
      localStorage.removeItem('bofin_notification_sound_enabled')
    } catch (error) {
      console.warn('Error clearing additional localStorage keys:', error)
    }

    console.log('✅ All cache and state cleared successfully')
  } catch (error) {
    console.error('Error clearing cache and state:', error)
    throw error
  }
}

/**
 * Reload toàn bộ dữ liệu sau khi clear cache
 * Hàm này sẽ được gọi sau khi clearAllCacheAndState
 */
export const reloadAllData = async (): Promise<void> => {
  try {
    // Force reload bằng cách trigger window reload nếu cần
    // Hoặc có thể gọi các hàm fetch lại dữ liệu
    // Tùy thuộc vào implementation, có thể cần reload page
    console.log('🔄 Reloading all data...')
  } catch (error) {
    console.error('Error reloading data:', error)
    throw error
  }
}


