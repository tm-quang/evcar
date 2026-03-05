import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'
import { applyArchiveFilter } from '../store/useArchiveStore'

export type ReminderType = 'Thu' | 'Chi'
export type ReminderStatus = 'pending' | 'completed' | 'skipped'
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type ReminderRecord = {
  id: string
  user_id: string
  title: string
  type: ReminderType
  amount: number | null
  category_id: string | null
  wallet_id: string | null
  icon_id: string | null // Icon được chọn từ thư viện
  reminder_date: string
  reminder_time: string | null
  repeat_type: RepeatType
  repeat_until: string | null
  status?: ReminderStatus // Optional: computed from completed_at and notes, not stored in DB
  completed_at: string | null
  notes: string | null
  color: string | null
  enable_notification: boolean
  created_at: string
  updated_at: string
  is_active?: boolean // Optional: computed from completed_at, not stored in DB
}

export type ReminderInsert = {
  title: string
  type: ReminderType
  amount?: number
  category_id?: string
  wallet_id?: string
  icon_id?: string // Icon được chọn từ thư viện
  reminder_date: string
  reminder_time?: string
  repeat_type?: RepeatType
  repeat_until?: string
  notes?: string
  color?: string
  enable_notification?: boolean
}

export type ReminderUpdate = Partial<Omit<ReminderInsert, 'type'>> & {
  type?: ReminderType
  completed_at?: string | null
  // Note: status is computed from completed_at and notes, not stored in DB
}

export type ReminderFilters = {
  status?: ReminderStatus
  type?: ReminderType
  start_date?: string
  end_date?: string
  is_active?: boolean
}

/**
 * Helper function to compute reminder status from completed_at and notes
 * Status column doesn't exist in database schema
 */
const computeReminderStatus = (reminder: { completed_at: string | null; notes: string | null }): ReminderStatus => {
  if (!reminder.completed_at) {
    return 'pending'
  }
  if (reminder.notes?.includes('[SKIPPED]')) {
    return 'skipped'
  }
  return 'completed'
}

/**
 * Fetch reminders
 */
export const fetchReminders = async (filters?: ReminderFilters): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'reminder_date')

  query = query
    .order('reminder_date', { ascending: true })
    .order('reminder_time', { ascending: true, nullsFirst: false })

  if (filters) {
    // Note: status and is_active columns don't exist in database schema
    // These filters are handled client-side after fetching data
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.start_date) {
      query = query.gte('reminder_date', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('reminder_date', filters.end_date)
    }
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let results = (data || []) as ReminderRecord[]

  // Compute status for each reminder (status column doesn't exist in DB)
  results = results.map((r) => ({
    ...r,
    status: computeReminderStatus(r),
    is_active: !r.completed_at,
  }))

  // Client-side filtering for status and is_active (columns don't exist in DB)
  if (filters) {
    if (filters.status) {
      results = results.filter((r) => r.status === filters.status)
    }

    if (filters.is_active !== undefined) {
      // is_active = true means reminder is pending (not completed)
      if (filters.is_active) {
        results = results.filter((r) => !r.completed_at)
      } else {
        results = results.filter((r) => !!r.completed_at)
      }
    }
  }

  return results
}

/**
 * Get reminder by ID
 */
export const getReminderById = async (id: string): Promise<ReminderRecord | null> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  // Compute status (column doesn't exist in DB)
  const reminder = data as ReminderRecord
  return {
    ...reminder,
    status: computeReminderStatus(reminder),
    is_active: !reminder.completed_at,
  }
}

/**
 * Create a new reminder
 */
export const createReminder = async (reminder: ReminderInsert): Promise<ReminderRecord> => {
  try {
    const user = await getCachedUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const supabase = getSupabaseClient()

    // Build insert object, only including fields that have values
    // This prevents sending undefined/null values that might cause schema errors
    // Ensure type is valid enum value ('Thu' or 'Chi')
    const reminderType = reminder.type === 'Thu' || reminder.type === 'Chi' ? reminder.type : 'Chi'
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      title: reminder.title.trim(),
      type: reminderType,
      reminder_date: reminder.reminder_date,
      repeat_type: reminder.repeat_type || 'none',
    }

    // Only add amount if it's provided and > 0
    if (reminder.amount !== undefined && reminder.amount !== null && reminder.amount > 0) {
      insertData.amount = reminder.amount
    }

    // Only add optional fields if they have values
    if (reminder.category_id) {
      insertData.category_id = reminder.category_id
    }

    if (reminder.wallet_id) {
      insertData.wallet_id = reminder.wallet_id
    }

    if (reminder.reminder_time) {
      insertData.reminder_time = reminder.reminder_time
    }

    if (reminder.repeat_until) {
      insertData.repeat_until = reminder.repeat_until
    }

    if (reminder.notes) {
      insertData.notes = reminder.notes.trim()
    }

    if (reminder.color) {
      insertData.color = reminder.color
    }

    if (reminder.icon_id) {
      insertData.icon_id = reminder.icon_id
    }

    // enable_notification defaults to true if not provided
    insertData.enable_notification = reminder.enable_notification !== undefined ? reminder.enable_notification : true

    const { data, error } = await supabase
      .from('reminders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating reminder:', error)

      // Provide more user-friendly error messages
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        throw new Error('Không thể tạo nhắc nhở. Vui lòng thử lại.')
      } else if (error.message.includes('column') && error.message.includes('not found')) {
        // Schema error - column doesn't exist
        throw new Error('Lỗi cấu hình database. Vui lòng liên hệ quản trị viên để cập nhật schema.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại')
      } else if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Nhắc nhở này đã tồn tại. Vui lòng kiểm tra lại.')
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại hạng mục hoặc ví đã chọn.')
      } else if (error.message.includes('enum_reminder_type') || error.message.includes('invalid input value')) {
        // Enum type error - database enum doesn't match expected values
        throw new Error('Lỗi cấu hình database. Vui lòng chạy script SQL để cập nhật enum_reminder_type.')
      }
      throw new Error(error.message || 'Không thể tạo nhắc nhở')
    }

    if (!data) {
      throw new Error('Không thể tạo nhắc nhở. Không nhận được dữ liệu từ server.')
    }

    // Invalidate cache
    await queryClient.invalidateQueries({ queryKey: ['reminders'] })

    // Compute status (column doesn't exist in DB)
    const reminderRecord = data as ReminderRecord
    return {
      ...reminderRecord,
      status: computeReminderStatus(reminderRecord),
      is_active: !reminderRecord.completed_at,
    }
  } catch (err) {
    // Re-throw with better error message if it's not already an Error
    if (err instanceof Error) {
      throw err
    }
    throw new Error('Đã xảy ra lỗi không mong muốn khi tạo nhắc nhở')
  }
}

/**
 * Update a reminder
 */
export const updateReminder = async (
  id: string,
  updates: ReminderUpdate
): Promise<ReminderRecord> => {
  try {
    const user = await getCachedUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const supabase = getSupabaseClient()

    // Build update object, only including fields that are explicitly provided
    // Remove status from updates (column doesn't exist in DB)
    const { status, ...updateFields } = updates as any
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Only include fields that are explicitly provided in updates
    if (updateFields.title !== undefined) {
      updateData.title = typeof updateFields.title === 'string' ? updateFields.title.trim() : updateFields.title
    }

    if (updateFields.type !== undefined) {
      // Ensure type is valid enum value ('Thu' or 'Chi')
      updateData.type = updateFields.type === 'Thu' || updateFields.type === 'Chi' ? updateFields.type : 'Chi'
    }

    // Only add amount if it's explicitly provided (including 0 or null)
    if ('amount' in updateFields) {
      if (updateFields.amount !== undefined && updateFields.amount !== null && updateFields.amount > 0) {
        updateData.amount = updateFields.amount
      } else if (updateFields.amount === null) {
        updateData.amount = null
      }
    }

    if (updateFields.category_id !== undefined) {
      updateData.category_id = updateFields.category_id || null
    }

    if (updateFields.wallet_id !== undefined) {
      updateData.wallet_id = updateFields.wallet_id || null
    }

    if (updateFields.reminder_date !== undefined) {
      updateData.reminder_date = updateFields.reminder_date
    }

    if (updateFields.reminder_time !== undefined) {
      updateData.reminder_time = updateFields.reminder_time || null
    }

    if (updateFields.repeat_type !== undefined) {
      updateData.repeat_type = updateFields.repeat_type
    }

    if (updateFields.repeat_until !== undefined) {
      updateData.repeat_until = updateFields.repeat_until || null
    }

    if (updateFields.completed_at !== undefined) {
      updateData.completed_at = updateFields.completed_at
    }

    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes ? updateFields.notes.trim() : null
    }

    if (updateFields.color !== undefined) {
      updateData.color = updateFields.color || null
    }

    if (updateFields.enable_notification !== undefined) {
      updateData.enable_notification = updateFields.enable_notification
    }

    const { data, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating reminder:', error)

      // Provide more user-friendly error messages
      if (error.code === 'PGRST116' || error.message.includes('not found')) {
        throw new Error('Không thể cập nhật nhắc nhở. Vui lòng thử lại.')
      } else if (error.message.includes('column') && error.message.includes('not found')) {
        // Schema error - column doesn't exist
        throw new Error('Lỗi cấu hình database. Vui lòng liên hệ quản trị viên để cập nhật schema.')
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại')
      } else if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Nhắc nhở này đã tồn tại. Vui lòng kiểm tra lại.')
      } else if (error.code === '23503') {
        // Foreign key constraint violation
        throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại hạng mục hoặc ví đã chọn.')
      }
      throw error
    }

    if (!data) {
      throw new Error('Không thể cập nhật nhắc nhở. Không nhận được dữ liệu từ server.')
    }

    // Invalidate cache
    await queryClient.invalidateQueries({ queryKey: ['reminders'] })

    // Compute status (column doesn't exist in DB)
    const reminder = data as ReminderRecord
    return {
      ...reminder,
      status: computeReminderStatus(reminder),
      is_active: !reminder.completed_at,
    }
  } catch (err) {
    // Re-throw with better error message if it's not already an Error
    if (err instanceof Error) {
      throw err
    }
    throw new Error('Đã xảy ra lỗi không mong muốn khi cập nhật nhắc nhở')
  }
}

/**
 * Delete a reminder (hard delete since is_active column doesn't exist)
 */
export const deleteReminder = async (id: string): Promise<void> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw error
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['reminders'] })
}

/**
 * Mark reminder as completed
 * Note: status column doesn't exist in DB, we use completed_at instead
 */
export const completeReminder = async (id: string): Promise<ReminderRecord> => {
  return updateReminder(id, {
    completed_at: new Date().toISOString(),
  })
}

/**
 * Mark reminder as skipped
 * Note: status column doesn't exist in DB, we store in notes field
 */
export const skipReminder = async (id: string): Promise<ReminderRecord> => {
  const reminder = await getReminderById(id)
  if (!reminder) {
    throw new Error('Không tìm thấy nhắc nhở.')
  }
  const existingNotes = reminder.notes || ''
  const notes = existingNotes ? `${existingNotes}\n[SKIPPED]` : '[SKIPPED]'
  return updateReminder(id, {
    notes,
    completed_at: new Date().toISOString(),
  })
}

/**
 * Get reminders for today
 */
export const getTodayReminders = async (): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = new Date().toISOString().split('T')[0]
  const allReminders = await fetchReminders({
    is_active: true,
  })
  return allReminders.filter((r) => r.reminder_date === today)
}

/**
 * Get upcoming reminders
 */
export const getUpcomingReminders = async (days: number = 7): Promise<ReminderRecord[]> => {
  const user = await getCachedUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  return fetchReminders({
    start_date: today,
    end_date: futureDateStr,
    is_active: true,
  })
}

