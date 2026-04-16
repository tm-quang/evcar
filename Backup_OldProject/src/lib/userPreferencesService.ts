import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

export type ChartPeriodType = 'day' | 'week' | 'month'
export type TaskViewPeriod = 'week' | 'month' | 'custom'

export type UserPreferencesRecord = {
  id: string
  user_id: string
  chart_period_type: ChartPeriodType
  chart_show_advanced: boolean
  task_view_period?: TaskViewPeriod | null
  task_custom_start_date?: string | null
  task_custom_end_date?: string | null
  created_at: string
  updated_at: string
}

export type UserPreferencesUpdate = {
  chart_period_type?: ChartPeriodType
  chart_show_advanced?: boolean
  task_view_period?: TaskViewPeriod | null
  task_custom_start_date?: string | null
  task_custom_end_date?: string | null
}

const TABLE_NAME = 'user_preferences'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Get user preferences
export const getUserPreferences = async (): Promise<UserPreferencesRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    // If preferences don't exist, return null (will create on first update)
    if (error.code === 'PGRST116') {
      return null
    }
    // If table doesn't exist, return null (will create on first update)
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('User preferences table may not exist:', error.message)
      return null
    }
    // Log error for debugging but don't throw for 400 errors (might be schema issue)
    if (error.code === 'PGRST116' || error.message?.includes('400')) {
      console.warn('Error fetching user preferences (non-critical):', error.message)
      return null
    }
    throwIfError(error, 'Không thể tải cài đặt người dùng.')
  }

  return data
}

// Update or create user preferences
export const updateUserPreferences = async (
  updates: UserPreferencesUpdate
): Promise<UserPreferencesRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật cài đặt.')
  }

  // First, try to get existing preferences
  // Use queryClient to get from cache if available, or fetch
  const existing = await queryClient.ensureQueryData({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences
  })

  // Prepare data for upsert
  const preferencesData = {
    user_id: user.id,
    chart_period_type: updates.chart_period_type || existing?.chart_period_type || 'month',
    chart_show_advanced: updates.chart_show_advanced ?? existing?.chart_show_advanced ?? false,
    task_view_period: updates.task_view_period !== undefined ? updates.task_view_period : existing?.task_view_period,
    task_custom_start_date: updates.task_custom_start_date !== undefined ? updates.task_custom_start_date : existing?.task_custom_start_date,
    task_custom_end_date: updates.task_custom_end_date !== undefined ? updates.task_custom_end_date : existing?.task_custom_end_date,
  }

  // Use insert or update based on whether record exists
  let data: UserPreferencesRecord | null = null
  let error: any = null

  if (existing) {
    // Update existing record
    const { data: updateData, error: updateError } = await supabase
      .from(TABLE_NAME)
      .update(preferencesData)
      .eq('user_id', user.id)
      .select()
      .single()

    data = updateData
    error = updateError
  } else {
    // Insert new record
    const { data: insertData, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(preferencesData)
      .select()
      .single()

    data = insertData
    error = insertError
  }

  if (error) {
    // If table doesn't exist or schema error, log and throw
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('User preferences table may not exist:', error.message)
      throw new Error('Bảng cài đặt người dùng chưa được tạo. Vui lòng chạy SQL migration.')
    }
    // Handle ON CONFLICT error specifically
    if (error.message?.includes('ON CONFLICT') || error.message?.includes('constraint')) {
      console.warn('ON CONFLICT error, trying alternative approach:', error.message)
      // Try to update by user_id directly
      const { data: updateData, error: updateError } = await supabase
        .from(TABLE_NAME)
        .update(preferencesData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        throwIfError(updateError, 'Không thể cập nhật cài đặt người dùng.')
      }
      data = updateData
    } else {
      throwIfError(error, 'Không thể cập nhật cài đặt người dùng.')
    }
  }

  if (!data) {
    throw new Error('Không nhận được dữ liệu sau khi cập nhật cài đặt.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['userPreferences'] })

  return data
}

// Get chart period type preference
export const getChartPeriodType = async (): Promise<ChartPeriodType> => {
  const preferences = await queryClient.ensureQueryData({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences
  })
  return preferences?.chart_period_type || 'day'
}

// Get chart show advanced preference
export const getChartShowAdvanced = async (): Promise<boolean> => {
  const preferences = await queryClient.ensureQueryData({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences
  })
  return preferences?.chart_show_advanced ?? false
}

// Update chart preferences
export const updateChartPreferences = async (
  periodType: ChartPeriodType,
  showAdvanced: boolean
): Promise<void> => {
  await updateUserPreferences({
    chart_period_type: periodType,
    chart_show_advanced: showAdvanced,
  })
}

// Get task view period preference
export const getTaskViewPeriod = async (): Promise<TaskViewPeriod> => {
  const preferences = await queryClient.ensureQueryData({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences
  })
  return (preferences?.task_view_period as TaskViewPeriod) || 'week'
}

// Update task view preferences
export const updateTaskViewPreferences = async (
  viewPeriod: TaskViewPeriod,
  customStartDate?: string | null,
  customEndDate?: string | null
): Promise<void> => {
  await updateUserPreferences({
    task_view_period: viewPeriod,
    task_custom_start_date: customStartDate,
    task_custom_end_date: customEndDate,
  })
}

