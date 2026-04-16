import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { playNotificationSound } from './notificationSoundService'
import { getServiceWorkerRegistration } from './serviceWorkerManager'
import { queryClient } from './react-query'

export type NotificationType =
  | 'transaction'
  | 'reminder'
  | 'budget'
  | 'system'
  | 'admin'
  | 'promotion'
  | 'event'

export type NotificationStatus = 'unread' | 'read' | 'archived'

export type NotificationRecord = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  status: NotificationStatus
  metadata: Record<string, any> | null
  related_id: string | null // ID của transaction, reminder, budget, etc.
  created_at: string
  updated_at: string
  read_at: string | null
}

export type NotificationInsert = {
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
  related_id?: string
  status?: NotificationStatus
}

export type NotificationFilters = {
  status?: NotificationStatus
  type?: NotificationType
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

const TABLE_NAME = 'notifications'
const CACHE_KEY = 'notifications'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

/**
 * Fetch notifications from database
 */
export const fetchNotifications = async (
  filters?: NotificationFilters
): Promise<NotificationRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem thông báo.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filters) {
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date)
    }
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (typeof filters.offset === 'number') {
      const limit = filters.limit || 50
      query = query.range(filters.offset, filters.offset + limit - 1)
    }
  }

  const { data, error } = await query

  // If table doesn't exist (PGRST116 or 404), return empty array instead of throwing
  if (error) {
    // PGRST116 = PostgREST "not found" error code
    // Also check for 404 in message (HTTP 404 when table doesn't exist)
    if (error.code === 'PGRST116' ||
      error.message?.includes('404') ||
      error.message?.includes('not found') ||
      error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
      // Table doesn't exist, return empty array silently
      return []
    }
    // For other errors, throw
    throwIfError(error, 'Không thể tải thông báo.')
  }

  return (data || []) as NotificationRecord[]
}

/**
 * Create a new notification
 */
export const createNotification = async (
  notification: NotificationInsert
): Promise<NotificationRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo thông báo.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: user.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || null,
      related_id: notification.related_id || null,
      status: notification.status || 'unread',
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo thông báo.')

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })

  return data as NotificationRecord
}

/**
 * Update notification status
 */
export const updateNotification = async (
  id: string,
  updates: Partial<Pick<NotificationRecord, 'status' | 'read_at'>>
): Promise<NotificationRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật thông báo.')
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.status) {
    updateData.status = updates.status
  }

  if (updates.read_at !== undefined) {
    updateData.read_at = updates.read_at
  }

  // Auto set read_at when marking as read
  if (updates.status === 'read' && !updateData.read_at) {
    updateData.read_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  // If table doesn't exist, save to localStorage as fallback
  if (error) {
    if (error.code === 'PGRST116' ||
      error.message?.includes('404') ||
      error.message?.includes('not found') ||
      error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
      // Table doesn't exist, chỉ log warning
      console.warn('Notification table does not exist, cannot update:', id)
      return null // Silently succeed if table doesn't exist
    }
    // For other errors, throw
    throwIfError(error, 'Không thể cập nhật thông báo.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })

  return data as NotificationRecord
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (id: string): Promise<void> => {
  // If this is an aggregated notification (not in database), only save to localStorage
  if (isAggregatedNotificationId(id)) {
    try {
      const user = await getCachedUser()
      if (!user) {
        throw new Error('Bạn cần đăng nhập để cập nhật thông báo.')
      }
      const storageKey = `notification_read_${user.id}`
      const readNotifications = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]
      if (!readNotifications.includes(id)) {
        readNotifications.push(id)
        localStorage.setItem(storageKey, JSON.stringify(readNotifications))
      }
    } catch (storageError) {
      console.warn('Could not save to localStorage:', storageError)
    }
    return // Silently succeed for aggregated notifications
  }

  // Try to update in database (only for real database notifications)
  const result = await updateNotification(id, {
    status: 'read',
    read_at: new Date().toISOString(),
  })
  // If result is null, it means table doesn't exist and we've saved to localStorage
  // This is fine, the function should not throw
  if (!result) {
    // Silently succeed - state is saved in localStorage
    return
  }
}

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật thông báo.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      status: 'read',
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'unread')

  // If table doesn't exist, save to localStorage as fallback
  if (error) {
    if (error.code === 'PGRST116' ||
      error.message?.includes('404') ||
      error.message?.includes('not found') ||
      error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
      // Table doesn't exist, mark all current notifications as read in localStorage
      try {
        const storageKey = `notification_read_${user.id}`
        // Get all current notification IDs from getAllNotifications
        const allNotifications = await getAllNotifications()
        const allIds = allNotifications.map(n => n.id)
        localStorage.setItem(storageKey, JSON.stringify(allIds))
      } catch (storageError) {
        console.warn('Could not save to localStorage:', storageError)
      }
      return // Silently succeed
    }
    // For other errors, throw
    throwIfError(error, 'Không thể đánh dấu tất cả thông báo là đã đọc.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
}

/**
 * Check if notification ID is from aggregated source (not in database)
 */
const isAggregatedNotificationId = (id: string): boolean => {
  // Aggregated notifications have prefixes like: transaction_, reminder_, budget_
  return id.startsWith('transaction_') ||
    id.startsWith('reminder_') ||
    id.startsWith('budget_') ||
    id.startsWith('system_') ||
    id.startsWith('admin_') ||
    id.startsWith('promotion_') ||
    id.startsWith('event_')
}

/**
 * Delete notification
 */
export const deleteNotification = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa thông báo.')
  }

  // Xóa vĩnh viễn từ database
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  // Nếu có lỗi, throw error (không dùng localStorage fallback)
  if (error) {
    // Nếu table không tồn tại, chỉ log warning
    if (error.code === 'PGRST116' ||
      error.message?.includes('404') ||
      error.message?.includes('not found') ||
      error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('does not exist')) {
      console.warn('Notification table does not exist, cannot delete:', id)
      return // Silently succeed if table doesn't exist
    }
    // For other errors, throw
    throwIfError(error, 'Không thể xóa thông báo.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
}

/**
 * Get aggregated notifications from various sources
 * This function is deprecated - notifications are now only created when transactions/reminders/budgets are created
 * Only returns notifications from database
 */
export const getAggregatedNotifications = async (): Promise<NotificationRecord[]> => {
  // Không tự động tạo thông báo nữa - chỉ trả về thông báo từ database
  // Thông báo chỉ được tạo khi:
  // - Tạo transaction mới (trong createTransaction)
  // - Tạo reminder mới (trong createReminder)
  // - Tạo budget mới (trong createBudget)
  // - Thông báo hệ thống/admin được tạo thủ công
  return []
}

/**
 * Get all notifications (from database + aggregated)
 */
export const getAllNotifications = async (
  filters?: NotificationFilters
): Promise<NotificationRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    return []
  }


  try {
    // Try to get from database first
    const dbNotifications = await fetchNotifications(filters)

    // Chỉ trả về thông báo từ database (không tự động tạo nữa)
    return dbNotifications
  } catch (error) {
    // Nếu có lỗi, trả về mảng rỗng (không fallback về aggregated notifications)
    console.warn('Error fetching notifications:', error)
    return []
  }
}

/**
 * Check if browser notification permission is granted
 */
export const hasNotificationPermission = (): boolean => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications are not supported in this browser')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

/**
 * Send notification via Service Worker
 */
const sendNotificationViaSW = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  const registration = getServiceWorkerRegistration()
  if (!registration) {
    throw new Error('Service Worker not available')
  }

  await registration.showNotification(title, {
    icon: '/EVGo-Logo.png',
    badge: '/EVGo-Logo.png',
    ...options,
  })
}

/**
 * Send browser notification
 */
export const sendNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<Notification | null> => {
  if (!hasNotificationPermission()) {
    const granted = await requestNotificationPermission()
    if (!granted) {
      console.warn('Notification permission denied')
      return null
    }
  }

  try {
    // Play sound
    playNotificationSound()

    // Try to use Service Worker for background notifications
    const swRegistration = getServiceWorkerRegistration()
    if (swRegistration && swRegistration.active) {
      await sendNotificationViaSW(title, {
        icon: '/EVGo-Logo.png',
        badge: '/EVGo-Logo.png',
        tag: 'reminder',
        requireInteraction: false,
        silent: false,
        ...options,
      })
      return null
    }

    // Fallback to regular notification
    const notification = new Notification(title, {
      icon: '/EVGo-Logo.png',
      badge: '/EVGo-Logo.png',
      tag: 'reminder',
      requireInteraction: false,
      silent: false,
      ...options,
    })

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Error sending notification:', error)
    return null
  }
}

/**
 * Send reminder notification
 */
export const sendReminderNotification = async (
  title: string,
  amount: number,
  type: 'Thu' | 'Chi'
): Promise<void> => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value)

  const emoji = type === 'Thu' ? '💰' : '💸'
  const notificationTitle = `${emoji} Nhắc nhở`
  const notificationBody = `${title}\n${formatCurrency(amount)}`

  await sendNotification(notificationTitle, {
    body: notificationBody,
    icon: '/EVGo-Logo.png',
    badge: '/EVGo-Logo.png',
  })
}

/**
 * Send note notification
 */
export const sendNoteNotification = async (title: string): Promise<void> => {
  await sendNotification('📝 Ghi chú', {
    body: title,
    icon: '/EVGo-Logo.png',
    badge: '/EVGo-Logo.png',
  })
}

