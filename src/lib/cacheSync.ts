/**
 * Cache Sync Service
 * Đồng bộ cache giữa các browser tabs/windows
 * Sử dụng BroadcastChannel (modern) và StorageEvent (fallback)
 */

type CacheSyncEvent =
  | { type: 'CACHE_INVALIDATE'; pattern: string }
  | { type: 'CACHE_CLEAR' }
  | { type: 'CACHE_SET'; key: string }
  | { type: 'CACHE_REFRESH'; key: string }

class CacheSyncService {
  private channel: BroadcastChannel | null = null
  private listeners: Set<(event: CacheSyncEvent) => void> = new Set()
  private isSupported: boolean

  constructor() {
    // Check if BroadcastChannel is supported
    this.isSupported = typeof BroadcastChannel !== 'undefined'

    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel('bofin_cache_sync')
        this.channel.onmessage = (event) => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        console.warn('BroadcastChannel not available, using StorageEvent fallback:', error)
        this.isSupported = false
      }
    }

    // Fallback to StorageEvent for older browsers or when BroadcastChannel fails
    if (!this.isSupported) {
      window.addEventListener('storage', this.handleStorageEvent.bind(this))
    }
  }

  /**
   * Handle BroadcastChannel message
   */
  private handleMessage(event: CacheSyncEvent): void {
    // Don't handle events from same window
    if (event.type === 'CACHE_INVALIDATE' || event.type === 'CACHE_CLEAR' || event.type === 'CACHE_SET' || event.type === 'CACHE_REFRESH') {
      this.notifyListeners(event)
    }
  }

  /**
   * Handle StorageEvent (fallback)
   */
  private handleStorageEvent(event: StorageEvent): void {
    // Only handle events from other windows
    if (event.key && event.key.startsWith('bofin_cache_sync_')) {
      try {
        const syncEvent: CacheSyncEvent = JSON.parse(event.newValue || '{}')
        this.notifyListeners(syncEvent)
      } catch (error) {
        console.warn('Error parsing cache sync event:', error)
      }
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: CacheSyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.warn('Error in cache sync listener:', error)
      }
    })
  }

  /**
   * Broadcast cache invalidate event
   */
  broadcastInvalidate(pattern: string): void {
    const event: CacheSyncEvent = { type: 'CACHE_INVALIDATE', pattern }
    this.broadcast(event)
  }

  /**
   * Broadcast cache clear event
   */
  broadcastClear(): void {
    const event: CacheSyncEvent = { type: 'CACHE_CLEAR' }
    this.broadcast(event)
  }

  /**
   * Broadcast cache set event
   */
  broadcastSet(key: string): void {
    const event: CacheSyncEvent = { type: 'CACHE_SET', key }
    this.broadcast(event)
  }

  /**
   * Broadcast cache refresh event
   */
  broadcastRefresh(key: string): void {
    const event: CacheSyncEvent = { type: 'CACHE_REFRESH', key }
    this.broadcast(event)
  }

  /**
   * Broadcast event to all tabs
   */
  private broadcast(event: CacheSyncEvent): void {
    if (this.isSupported && this.channel) {
      try {
        this.channel.postMessage(event)
      } catch (error) {
        console.warn('Error broadcasting cache sync event:', error)
      }
    } else {
      // Fallback to localStorage
      try {
        const key = `bofin_cache_sync_${Date.now()}`
        localStorage.setItem(key, JSON.stringify(event))
        // Clean up after a short delay
        setTimeout(() => {
          try {
            localStorage.removeItem(key)
          } catch {
            // Ignore cleanup errors
          }
        }, 100)
      } catch (error) {
        console.warn('Error broadcasting cache sync event via localStorage:', error)
      }
    }
  }

  /**
   * Subscribe to cache sync events
   */
  subscribe(listener: (event: CacheSyncEvent) => void): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    window.removeEventListener('storage', this.handleStorageEvent.bind(this))
    this.listeners.clear()
  }
}

// Singleton instance
export const cacheSyncService = new CacheSyncService()


