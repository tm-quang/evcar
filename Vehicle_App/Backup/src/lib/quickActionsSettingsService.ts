import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'

export type QuickActionSetting = {
    id: string
    label: string
    enabled: boolean
}

/**
 * Lưu cài đặt tiện ích vào Supabase
 * @param settings - Mảng cài đặt tiện ích
 */
export const saveQuickActionsSettings = async (settings: QuickActionSetting[]): Promise<void> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
        throw new Error('Bạn cần đăng nhập để lưu cài đặt.')
    }

    // Chuyển đổi mảng thành object để lưu vào JSON
    const settingsMap: Record<string, boolean> = {}
    settings.forEach((setting) => {
        settingsMap[setting.id] = setting.enabled
    })

    // Cập nhật cột quick_actions_settings trong bảng profiles
    const { error } = await supabase
        .from('profiles')
        .update({ quick_actions_settings: settingsMap })
        .eq('id', user.id)

    if (error) {
        console.error('Error saving quick actions settings:', error)
        throw new Error('Không thể lưu cài đặt tiện ích.')
    }
}

/**
 * Lấy cài đặt tiện ích từ Supabase
 * @returns Mảng cài đặt tiện ích hoặc null nếu chưa có
 */
export const getQuickActionsSettings = async (): Promise<Record<string, boolean> | null> => {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
        return null
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('quick_actions_settings')
        .eq('id', user.id)
        .single()

    if (error) {
        console.error('Error loading quick actions settings:', error)
        return null
    }

    return data?.quick_actions_settings || null
}

