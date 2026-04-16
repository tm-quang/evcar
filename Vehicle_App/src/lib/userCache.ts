/**
 * User Cache - Cache user object để tránh fetch lại nhiều lần
 * User object được cache trong memory và session storage
 */

import { getSupabaseClient } from './supabaseClient'
import type { User } from '@supabase/supabase-js'

type CachedUser = {
  user: User | null
  timestamp: number
  ttl: number // 5 phút
}

let cachedUser: CachedUser | null = null
const USER_CACHE_TTL = 5 * 60 * 1000 // 5 phút
const SESSION_STORAGE_KEY = 'bofin_cached_user'

/**
 * Get cached user hoặc fetch từ Supabase
 * Cache trong memory và session storage
 * Có retry mechanism để đảm bảo user được fetch nếu cache trống
 */
export const getCachedUser = async (retryCount = 0): Promise<User | null> => {
  const now = Date.now()
  const MAX_RETRIES = 2
  const RETRY_DELAY = 100 // 100ms

  // Kiểm tra memory cache trước
  if (cachedUser && (now - cachedUser.timestamp) < cachedUser.ttl) {
    return cachedUser.user
  }

  // Kiểm tra session storage
  try {
    const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (sessionData) {
      const parsed: CachedUser = JSON.parse(sessionData)
      if ((now - parsed.timestamp) < parsed.ttl) {
        // Restore to memory cache
        cachedUser = parsed
        return parsed.user
      }
    }
  } catch (e) {
    console.warn('Error reading user from session storage:', e)
  }

  // Fetch từ Supabase
  const supabase = getSupabaseClient()
  let user: User | null = null
  
  try {
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }
    
    user = data.user
  } catch (error) {
    // Nếu lỗi và chưa retry hết, thử lại sau một chút
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)))
      return getCachedUser(retryCount + 1)
    }
    
    console.warn('Error fetching user from Supabase:', error)
    return null
  }

  // Cache kết quả
  if (user) {
    cachedUser = {
      user,
      timestamp: now,
      ttl: USER_CACHE_TTL,
    }

    // Lưu vào session storage
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cachedUser))
    } catch (e) {
      console.warn('Error saving user to session storage:', e)
    }
  }

  return user
}

/**
 * Get user ID từ cache (nhanh hơn)
 */
export const getCachedUserId = async (): Promise<string | null> => {
  const user = await getCachedUser()
  return user?.id || null
}

/**
 * Invalidate user cache (khi logout hoặc user thay đổi)
 */
export const invalidateUserCache = (): void => {
  cachedUser = null
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (e) {
    console.warn('Error removing user from session storage:', e)
  }
}

/**
 * Clear user cache khi logout
 */
export const clearUserCache = invalidateUserCache

/**
 * Set user cache trực tiếp (dùng khi SIGNED_IN để populate ngay lập tức)
 */
export const setCachedUser = (user: User | null): void => {
  const now = Date.now()
  cachedUser = {
    user,
    timestamp: now,
    ttl: USER_CACHE_TTL,
  }
  
  // Lưu vào session storage
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cachedUser))
  } catch (e) {
    console.warn('Error saving user to session storage:', e)
  }
}


