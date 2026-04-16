import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

const TABLE_NAME = 'system_settings'

export type SettingCategory = 'branding' | 'quick_actions' | 'content' | 'menu' | 'logic' | 'notifications' | 'ui' | 'data' | 'other'
export type SettingType = 'text' | 'image' | 'json' | 'boolean' | 'number' | 'url' | 'color'

export type SystemSettingRecord = {
  id: string
  setting_key: string
  setting_value: string | null
  setting_type: SettingType
  category: SettingCategory
  label: string
  description: string | null
  is_active: boolean
  is_public: boolean
  metadata: Record<string, any> | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type SystemSettingInsert = {
  setting_key: string
  setting_value?: string | null
  setting_type?: SettingType
  category?: SettingCategory
  label: string
  description?: string | null
  is_active?: boolean
  is_public?: boolean
  metadata?: Record<string, any> | null
}

export type SystemSettingUpdate = Partial<Omit<SystemSettingInsert, 'setting_key'>> & {
  updated_by?: string | null
}

const throwIfError = (error: PostgrestError | null, message: string): void => {
  if (error) {
    console.error(message, error)
    throw new Error(`${message}: ${error.message}`)
  }
}

/**
 * Get all settings (with caching)
 */
export const fetchSettings = async (options?: {
  category?: SettingCategory
  is_active?: boolean
  is_public?: boolean
}): Promise<SystemSettingRecord[]> => {
  const supabase = getSupabaseClient()
  let query = supabase.from(TABLE_NAME).select('*')

  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.is_active !== undefined) {
    query = query.eq('is_active', options.is_active)
  }
  if (options?.is_public !== undefined) {
    query = query.eq('is_public', options.is_public)
  }

  query = query.order('category', { ascending: true }).order('label', { ascending: true })

  const { data, error } = await query

  throwIfError(error, 'Không thể tải cài đặt hệ thống')

  return data || []
}

/**
 * Get a single setting by key
 */
export const getSettingByKey = async (key: string): Promise<SystemSettingRecord | null> => {
  // Use queryClient.ensureQueryData to leverage React Query cache
  return queryClient.ensureQueryData({
    queryKey: ['setting', key],
    queryFn: async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('setting_key', key)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throwIfError(error, `Không thể tải cài đặt: ${key}`)
      }

      return data
    },
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  })
}

/**
 * Get setting value by key (returns just the value)
 */
export const getSettingValue = async (key: string): Promise<string | null> => {
  const setting = await getSettingByKey(key)
  return setting?.setting_value || null
}

/**
 * Get multiple settings by keys
 */
export const getSettingsByKeys = async (keys: string[]): Promise<Record<string, SystemSettingRecord>> => {
  // Fetch all settings to filter locally, or could optimize to fetch specific keys
  // For now, fetching all is simpler and likely performant enough given low volume of settings
  const settings = await queryClient.ensureQueryData({
    queryKey: ['settings'],
    queryFn: () => fetchSettings(),
    staleTime: 5 * 60 * 1000
  })

  const result: Record<string, SystemSettingRecord> = {}

  keys.forEach(key => {
    const setting = settings.find(s => s.setting_key === key)
    if (setting) {
      result[key] = setting
    }
  })

  return result
}

/**
 * Create a new setting
 */
export const createSetting = async (payload: SystemSettingInsert): Promise<SystemSettingRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo cài đặt.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo cài đặt.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu cài đặt sau khi tạo.')
  }

  await queryClient.invalidateQueries({ queryKey: ['settings'] })
  await queryClient.invalidateQueries({ queryKey: ['setting', payload.setting_key] })

  return data
}

/**
 * Update a setting
 */
export const updateSetting = async (
  key: string,
  payload: SystemSettingUpdate
): Promise<SystemSettingRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật cài đặt.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      ...payload,
      updated_by: user.id,
    })
    .eq('setting_key', key)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật cài đặt.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu cài đặt sau khi cập nhật.')
  }

  await queryClient.invalidateQueries({ queryKey: ['settings'] })
  await queryClient.invalidateQueries({ queryKey: ['setting', key] })

  return data
}

/**
 * Update setting value by key (quick update)
 */
export const updateSettingValue = async (
  key: string,
  value: string | null,
  metadata?: Record<string, any>
): Promise<SystemSettingRecord> => {
  const user = await getCachedUser()

  return updateSetting(key, {
    setting_value: value,
    metadata: metadata || undefined,
    updated_by: user?.id || null,
  })
}

/**
 * Delete a setting
 */
export const deleteSetting = async (key: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa cài đặt.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('setting_key', key)

  throwIfError(error, 'Không thể xóa cài đặt.')

  await queryClient.invalidateQueries({ queryKey: ['settings'] })
  await queryClient.invalidateQueries({ queryKey: ['setting', key] })
}

/**
 * Get public settings (for unauthenticated access)
 */
export const getPublicSettings = async (): Promise<Record<string, string | null>> => {
  const settings = await fetchSettings({ is_public: true, is_active: true })
  const result: Record<string, string | null> = {}

  settings.forEach(setting => {
    result[setting.setting_key] = setting.setting_value
  })

  return result
}

