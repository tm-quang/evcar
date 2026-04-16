import { getSupabaseClient } from '../supabaseClient'
import { getCachedUser } from '../userCache'
import { queryClient } from '../react-query'

export type VehicleNotificationType = 
  | 'vehicle_info'    // Add/Update/Delete vehicle
  | 'maintenance'     // Maintenance logs
  | 'expense'         // General expenses
  | 'charging'        // Fuel/Charging logs
  | 'alert'           // Expiry/Maintenance reminders

export type VehicleNotificationStatus = 'unread' | 'read'

export interface VehicleNotificationRecord {
    id: string
    user_id: string
    type: VehicleNotificationType
    title: string
    message: string
    status: VehicleNotificationStatus
    metadata: Record<string, any> | null
    related_id: string | null
    created_at: string
    updated_at: string
    read_at: string | null
}

const TABLE_NAME = 'vehicle_notifications'
const CACHE_KEY = 'vehicle_notifications'

/**
 * Fetch vehicle-specific notifications
 */
export const fetchVehicleNotifications = async (): Promise<VehicleNotificationRecord[]> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) return []

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        // Fallback for when table doesn't exist yet
        if (
            error.code === 'PGRST116' || 
            error.code === '42P01' ||
            error.message?.includes('not found') || 
            error.message?.includes('404') ||
            error.message?.toLowerCase().includes('relation')
        ) {
            console.warn('vehicle_notifications table not found. Please run the SQL migration.')
            return []
        }
        throw error
    }

    return (data || []) as VehicleNotificationRecord[]
}

/**
 * Create a new vehicle notification
 */
export const createVehicleNotification = async (notif: {
    type: VehicleNotificationType;
    title: string;
    message: string;
    related_id?: string;
    metadata?: any;
}): Promise<void> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) return

    const { error } = await supabase
        .from(TABLE_NAME)
        .insert({
            user_id: user.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            related_id: notif.related_id || null,
            metadata: notif.metadata || null,
            status: 'unread'
        })

    if (error) {
         if (
            error.code === 'PGRST116' || 
            error.code === '42P01' ||
            error.message?.includes('not found') || 
            error.message?.includes('404') ||
            error.message?.toLowerCase().includes('relation')
        ) {
            console.warn('Cannot create notification: vehicle_notifications table not found.')
            return
        }
        console.error('Error creating vehicle notification:', error)
    } else {
        await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
    }
}

/**
 * Mark notification as read
 */
export const markVehicleNotificationRead = async (id: string): Promise<void> => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 
            status: 'read', 
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
}

/**
 * Mark all as read
 */
export const markAllVehicleNotificationsRead = async (): Promise<void> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()
    if (!user) return

    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ 
            status: 'read', 
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'unread')

    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
}

/**
 * Delete a notification
 */
export const deleteVehicleNotification = async (id: string): Promise<void> => {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id)

    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: [CACHE_KEY] })
}
