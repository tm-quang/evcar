type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

import { getCachedUserId } from './userCache'
import { cacheSyncService } from './cacheSync'

export type CacheKey = string

const STORAGE_PREFIX = 'bofin_cache_'
const STORAGE_KEY_MAP = 'bofin_cache_keys'

/**
 * Get user-specific cache prefix
 * Cache được lưu theo user_id để tránh conflict giữa các user
 * Sử dụng cached user để tránh fetch lại nhiều lần
 */
const getUserCachePrefix = async (): Promise<string> => {
  try {
    const userId = await getCachedUserId()
    
    if (userId) {
      return `user_${userId}_`
    }
  } catch (error) {
    console.warn('Error getting user cache prefix:', error)
  }
  return ''
}

class CacheManager {
  private cache: Map<CacheKey, CacheEntry<unknown>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default
  private storageEnabled: boolean = false
  private syncUnsubscribe: (() => void) | null = null
  private isInitialized: boolean = false

  constructor() {
    // Check if localStorage is available
    try {
      const testKey = '__cache_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      this.storageEnabled = true
      // Load cache from localStorage on initialization (async, không block)
      // Sẽ được gọi lại sau khi user đăng nhập trong useDataPreloader
      this.loadFromStorage().catch(console.error)
    } catch (error) {
      console.warn('localStorage not available, using in-memory cache only', error)
      this.storageEnabled = false
    }

    // Subscribe to cache sync events from other tabs
    this.syncUnsubscribe = cacheSyncService.subscribe((event) => {
      this.handleSyncEvent(event)
    })
  }

  /**
   * Initialize cache - load from storage and set up sync
   * Should be called when app starts and user is available
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Load cache from localStorage for current user
      await this.loadFromStorage()
      this.isInitialized = true
      console.log('[Cache] Initialized and loaded from storage')
    } catch (error) {
      console.warn('[Cache] Error initializing cache:', error)
    }
  }

  /**
   * Handle cache sync events from other tabs
   */
  private async handleSyncEvent(event: { type: string; pattern?: string; key?: string }): Promise<void> {
    try {
      switch (event.type) {
        case 'CACHE_INVALIDATE':
          if (event.pattern) {
            // Invalidate matching cache entries
            const keysToRemove: string[] = []
            const userPrefix = await getUserCachePrefix()
            const patternWithPrefix = userPrefix ? `${userPrefix}${event.pattern}` : event.pattern
            
            for (const key of this.cache.keys()) {
              if (key === event.pattern || key.startsWith(event.pattern + ':') || 
                  key === patternWithPrefix || key.startsWith(patternWithPrefix + ':')) {
                keysToRemove.push(key)
              }
            }
            
            // Remove from memory and storage
            for (const key of keysToRemove) {
              this.cache.delete(key)
              await this.removeFromStorage(key)
            }
            
            console.log(`[Cache Sync] Invalidated ${keysToRemove.length} entries matching pattern: ${event.pattern}`)
          }
          break
          
        case 'CACHE_CLEAR':
          // Clear all cache (only for current user)
          this.cache.clear()
          if (this.storageEnabled) {
            const userPrefix = await getUserCachePrefix()
            const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
            if (keysJson) {
              const allKeys: string[] = JSON.parse(keysJson)
              for (const storageKey of allKeys) {
                if (userPrefix && storageKey.includes(userPrefix)) {
                  localStorage.removeItem(storageKey)
                }
              }
            }
          }
          console.log('[Cache Sync] Cleared all cache')
          break
          
        case 'CACHE_SET':
        case 'CACHE_REFRESH':
          // Optionally refresh specific cache entry
          // For now, we just log it - the next fetch will get fresh data
          if (event.key) {
            // Remove from memory so next fetch will get fresh data
            this.cache.delete(event.key)
            console.log(`[Cache Sync] Marked for refresh: ${event.key}`)
          }
          break
      }
    } catch (error) {
      console.warn('[Cache Sync] Error handling sync event:', error)
    }
  }

  /**
   * Cleanup - unsubscribe from sync events
   */
  destroy(): void {
    if (this.syncUnsubscribe) {
      this.syncUnsubscribe()
      this.syncUnsubscribe = null
    }
  }

  /**
   * Load cache from localStorage
   * Load cache cho user hiện tại (async vì cần user prefix)
   */
  async loadFromStorage(): Promise<void> {
    if (!this.storageEnabled) return

    try {
      const userPrefix = await getUserCachePrefix()
      if (!userPrefix) return // Chưa có user, không load cache

      // Load tất cả keys có user prefix
      const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
      if (!keysJson) return

      const allKeys: string[] = JSON.parse(keysJson)
      const now = Date.now()

      for (const storageKey of allKeys) {
        // Chỉ load keys có user prefix của user hiện tại
        if (!storageKey.includes(userPrefix)) continue
        
        const entryJson = localStorage.getItem(storageKey)
        if (!entryJson) continue

        const entry: CacheEntry<unknown> = JSON.parse(entryJson)
        const age = now - entry.timestamp

        // Extract key without prefix
        const key = storageKey.replace(STORAGE_PREFIX + userPrefix, '')

        // Only load non-expired entries
        if (age <= entry.ttl) {
          this.cache.set(key, entry)
        } else {
          // Remove expired entry
          localStorage.removeItem(storageKey)
        }
      }

      // Update keys list after cleanup
      this.saveKeysToStorage().catch(console.error)
    } catch (e) {
      console.warn('Error loading cache from localStorage:', e)
    }
  }

  /**
   * Save cache keys list to localStorage
   * Lưu với user prefix để persistent theo user
   */
  private async saveKeysToStorage(): Promise<void> {
    if (!this.storageEnabled) return

    try {
      const userPrefix = await getUserCachePrefix()
      const keys = Array.from(this.cache.keys())
      // Lưu keys với user prefix
      const keysWithPrefix = keys.map(key => STORAGE_PREFIX + userPrefix + key)
      localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(keysWithPrefix))
    } catch (e) {
      console.warn('Error saving cache keys to localStorage:', e)
    }
  }

  /**
   * Save entry to localStorage
   * Lưu với user prefix để persistent theo user
   */
  private async saveToStorage<T>(key: CacheKey, entry: CacheEntry<T>): Promise<void> {
    if (!this.storageEnabled) return

    try {
      // Thêm user prefix vào storage key để persistent theo user
      const userPrefix = await getUserCachePrefix()
      const storageKey = STORAGE_PREFIX + userPrefix + key
      localStorage.setItem(storageKey, JSON.stringify(entry))
      this.saveKeysToStorage()
    } catch (e) {
      // If storage is full, try to clean up old entries
      if (e instanceof DOMException && e.code === 22) {
        this.cleanupOldEntries()
        try {
          const userPrefix = await getUserCachePrefix()
          const storageKey = STORAGE_PREFIX + userPrefix + key
          localStorage.setItem(storageKey, JSON.stringify(entry))
          this.saveKeysToStorage()
        } catch (e2) {
          console.warn('Error saving to localStorage after cleanup:', e2)
        }
      } else {
        console.warn('Error saving to localStorage:', e)
      }
    }
  }

  /**
   * Remove entry from localStorage
   */
  private async removeFromStorage(key: CacheKey): Promise<void> {
    if (!this.storageEnabled) return

    try {
      const userPrefix = await getUserCachePrefix()
      const storageKey = STORAGE_PREFIX + userPrefix + key
      localStorage.removeItem(storageKey)
      this.saveKeysToStorage()
    } catch (e) {
      console.warn('Error removing from localStorage:', e)
    }
  }

  /**
   * Clean up old entries when storage is full
   */
  private cleanupOldEntries(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      // Remove entries older than 50% of their TTL
      if (age > entry.ttl * 0.5) {
        keysToRemove.push(key)
      }
    }

    // Sort by age (oldest first) and remove half
    keysToRemove.sort((a, b) => {
      const entryA = this.cache.get(a)!
      const entryB = this.cache.get(b)!
      return entryA.timestamp - entryB.timestamp
    })

    const toRemove = keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2))
    for (const key of toRemove) {
      this.cache.delete(key)
      this.removeFromStorage(key)
    }
  }

  /**
   * Get default TTL
   */
  getDefaultTTL(): number {
    return this.defaultTTL
  }

  /**
   * Generate cache key from function name and parameters
   * Tự động thêm user_id vào key nếu có user đăng nhập
   */
  async generateKey(functionName: string, params?: Record<string, unknown>): Promise<CacheKey> {
    // Lấy user_id nếu có
    const userPrefix = await getUserCachePrefix()
    
    let baseKey = functionName
    if (params && Object.keys(params).length > 0) {
      const paramString = JSON.stringify(params, Object.keys(params).sort())
      baseKey = `${functionName}:${paramString}`
    }
    
    return userPrefix ? `${userPrefix}${baseKey}` : baseKey
  }

  /**
   * Get data from cache if valid
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    // Try in-memory cache first
    const entry = this.cache.get(key)
    if (entry) {
      const now = Date.now()
      const age = now - entry.timestamp

      if (age > entry.ttl) {
        // Cache expired
        this.cache.delete(key)
        await this.removeFromStorage(key)
        return null
      }

      return entry.data as T
    }

    // Try localStorage if not in memory
    if (this.storageEnabled) {
      try {
        const userPrefix = await getUserCachePrefix()
        const storageKey = STORAGE_PREFIX + userPrefix + key
        const entryJson = localStorage.getItem(storageKey)
        if (!entryJson) return null

        const entry: CacheEntry<T> = JSON.parse(entryJson)
        const now = Date.now()
        const age = now - entry.timestamp

        if (age > entry.ttl) {
          // Cache expired
          await this.removeFromStorage(key)
          return null
        }

        // Restore to memory cache
        this.cache.set(key, entry)
        return entry.data
      } catch (e) {
        console.warn('Error reading from localStorage:', e)
        return null
      }
    }

    return null
  }

  /**
   * Set data in cache
   */
  async set<T>(key: CacheKey, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }

    // Save to memory
    this.cache.set(key, entry)

    // Save to localStorage (async)
    await this.saveToStorage(key, entry)

    // Broadcast set to other tabs (for cache sync)
    cacheSyncService.broadcastSet(key)
  }

  /**
   * Invalidate cache by key pattern
   */
  async invalidate(pattern: string | RegExp): Promise<void> {
    const keysToRemove: string[] = []

    if (typeof pattern === 'string') {
      // Exact match or prefix match - cần match cả với và không có user prefix
      const userPrefix = await getUserCachePrefix()
      const patternWithPrefix = userPrefix ? `${userPrefix}${pattern}` : pattern
      
      for (const key of this.cache.keys()) {
        // Match với pattern (có thể có hoặc không có user prefix)
        if (key === pattern || key.startsWith(pattern + ':') || 
            key === patternWithPrefix || key.startsWith(patternWithPrefix + ':')) {
          keysToRemove.push(key)
        }
      }
      
      // Also check localStorage for keys with user prefix
      if (this.storageEnabled) {
        try {
          const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
          if (keysJson) {
            const allKeys: string[] = JSON.parse(keysJson)
            for (const storageKey of allKeys) {
              // Extract key without prefix
              const keyWithoutPrefix = storageKey.replace(STORAGE_PREFIX, '').replace(userPrefix, '')
              if (keyWithoutPrefix === pattern || keyWithoutPrefix.startsWith(pattern + ':')) {
                // Extract original key from storage key
                const originalKey = storageKey.replace(STORAGE_PREFIX + userPrefix, '')
                if (!keysToRemove.includes(originalKey)) {
                  keysToRemove.push(originalKey)
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error reading cache keys for invalidation:', e)
        }
      }

      // Broadcast invalidation to other tabs
      cacheSyncService.broadcastInvalidate(pattern)
    } else {
      // Regex match
      const userPrefix = await getUserCachePrefix()
      
      // Match trong memory cache
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          keysToRemove.push(key)
        }
      }
      
      // Also check localStorage for keys with user prefix
      if (this.storageEnabled && userPrefix) {
        try {
          const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
          if (keysJson) {
            const allKeys: string[] = JSON.parse(keysJson)
            for (const storageKey of allKeys) {
              // Extract key without storage prefix
              const keyWithoutStoragePrefix = storageKey.replace(STORAGE_PREFIX, '')
              // Test với cả key có và không có user prefix
              if (pattern.test(keyWithoutStoragePrefix) || pattern.test(keyWithoutStoragePrefix.replace(userPrefix, ''))) {
                // Extract original key from storage key
                const originalKey = storageKey.replace(STORAGE_PREFIX + userPrefix, '')
                if (!keysToRemove.includes(originalKey)) {
                  keysToRemove.push(originalKey)
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error reading cache keys for regex invalidation:', e)
        }
      }
    }

    // Remove from both memory and storage
    for (const key of keysToRemove) {
      this.cache.delete(key)
      await this.removeFromStorage(key)
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    // Clear memory
    this.cache.clear()

    // Clear localStorage cho user hiện tại
    if (this.storageEnabled) {
      try {
        const userPrefix = await getUserCachePrefix()
        const keysJson = localStorage.getItem(STORAGE_KEY_MAP)
        if (keysJson) {
          const allKeys: string[] = JSON.parse(keysJson)
          // Chỉ xóa keys của user hiện tại
          for (const storageKey of allKeys) {
            if (userPrefix && storageKey.includes(userPrefix)) {
              localStorage.removeItem(storageKey)
            }
          }
        }
        // Không xóa STORAGE_KEY_MAP vì có thể có keys của user khác
      } catch (e) {
        console.warn('Error clearing localStorage cache:', e)
      }
    }

    // Broadcast clear to other tabs
    cacheSyncService.broadcastClear()
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl
  }

  /**
   * Check if cache entry is stale (but not expired)
   * @param key - Cache key
   * @param staleThreshold - Consider stale after this time (in ms). Default: 50% of TTL
   * @returns true if stale, false if fresh or expired
   */
  isStale(key: CacheKey, staleThreshold?: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    const age = now - entry.timestamp

    // If expired, it's not stale (it's invalid)
    if (age > entry.ttl) return false

    const threshold = staleThreshold || (entry.ttl * 0.5)
    return age > threshold
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

/**
 * Cache decorator for async functions
 */
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    ttl?: number
    keyGenerator?: (args: Parameters<T>) => string
    invalidateOn?: string[] // Function names that should invalidate this cache
  }
): T {
  const functionName = fn.name || 'anonymous'
  const ttl = options?.ttl || cacheManager.getDefaultTTL()

  return (async (...args: Parameters<T>) => {
    const keyGenerator = options?.keyGenerator || (async (args: Parameters<T>) => {
      const params: Record<string, unknown> = {}
      args.forEach((arg, index) => {
        if (arg !== null && arg !== undefined) {
          params[`arg${index}`] = arg
        }
      })
      return await cacheManager.generateKey(functionName, params)
    })

    const cacheKey = await keyGenerator(args)
    const cached = await cacheManager.get<ReturnType<T>>(cacheKey)

    if (cached !== null) {
      return cached
    }

    const result = await fn(...args)
    await cacheManager.set(cacheKey, result, ttl)

    return result
  }) as T
}

/**
 * Invalidate cache for specific service
 */
export async function invalidateCache(serviceName: string): Promise<void> {
  await cacheManager.invalidate(serviceName)
}

/**
 * Invalidate all cache
 */
export async function clearAllCache(): Promise<void> {
  await cacheManager.clear()
}

/**
 * Cache-first with background refresh
 * Returns cached data immediately if available, then refreshes in background
 * @param key - Cache key
 * @param fetchFn - Function to fetch fresh data
 * @param ttl - Time to live in milliseconds
 * @param staleThreshold - Consider cache stale after this time (in ms). If cache is stale, fetch in background but still return cached data
 * @returns Promise that resolves with cached data immediately, then updates cache in background
 */
export async function cacheFirstWithRefresh<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number,
  staleThreshold?: number
): Promise<T> {
  // Get cached data (async)
  const cached = await cacheManager.get<T>(key)
  
  // If we have valid cached data
  if (cached !== null) {
    // Debug: Log cache hit
    console.log(`[Cache HIT] ${key.substring(0, 50)}...`)
    
    // Check if cache is stale (but not expired)
    if (cacheManager.isStale(key, staleThreshold)) {
      // Refresh in background (don't await)
      fetchFn()
        .then((freshData) => {
          cacheManager.set(key, freshData, ttl).catch(console.error)
        })
        .catch((error) => {
          console.warn('Background cache refresh failed:', error)
          // Keep using cached data even if refresh fails
        })
    }
    
    // Return cached data immediately
    return cached
  }
  
  // Debug: Log cache miss
  console.log(`[Cache MISS] ${key.substring(0, 50)}... - Fetching fresh data`)
  
  // No cache, fetch fresh data
  const freshData = await fetchFn()
  await cacheManager.set(key, freshData, ttl)
  return freshData
}

/**
 * Real-time cache update - immediately invalidates and refreshes cache
 * Use this when you know data has changed and want immediate updates
 * @param pattern - Cache key pattern to invalidate
 * @param fetchFn - Function to fetch fresh data (optional)
 */
export async function realTimeCacheUpdate<T>(
  pattern: string | RegExp,
  fetchFn?: (key: string) => Promise<T>
): Promise<void> {
  // Invalidate matching caches
  cacheManager.invalidate(pattern)
  
  // If fetch function provided, refresh immediately
  if (fetchFn) {
    // Get all matching keys (we need to track them)
    // For now, just invalidate - the next fetch will get fresh data
    // This is a simplified version - in production you might want to track keys
  }
}


