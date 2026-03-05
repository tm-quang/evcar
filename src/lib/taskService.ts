import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { formatDateUTC7, getNowUTC7, getDateComponentsUTC7, createDateUTC7 } from '../utils/dateUtils'
import { queryClient } from './react-query'
import { applyArchiveFilter } from '../store/useArchiveStore'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type Subtask = {
  id: string
  title: string
  completed: boolean
}

export type TaskRecord = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  progress: number
  week_start_date: string | null
  tags: string[] | null
  color: string | null
  subtasks: Subtask[] | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type TaskInsert = {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  deadline?: string | null
  progress?: number
  week_start_date?: string | null
  tags?: string[] | null
  color?: string | null
  subtasks?: Subtask[] | null
}

export type TaskUpdate = Partial<Omit<TaskInsert, 'title'>> & {
  title?: string
  completed_at?: string | null
}

export type TaskFilters = {
  status?: TaskStatus
  priority?: TaskPriority
  deadline_from?: string
  deadline_to?: string
  week_start_date?: string
  tags?: string[]
  limit?: number
  offset?: number
}

const TABLE_NAME = 'tasks'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Get Monday of a given date (for weekly view)
const getMonday = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(d)
  monday.setDate(diff)
  return monday
}

// Calculate week start date (Monday) in UTC+7
const getWeekStartDateUTC7 = (date: Date): string => {
  const components = getDateComponentsUTC7(date)
  const dateObj = new Date(components.year, components.month - 1, components.day)
  const monday = getMonday(dateObj)
  const mondayComponents = getDateComponentsUTC7(monday)
  return formatDateUTC7(createDateUTC7(mondayComponents.year, mondayComponents.month, mondayComponents.day, 0, 0, 0, 0))
}

// Fetch all tasks with filters
export const fetchTasks = async (filters?: TaskFilters): Promise<TaskRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem công việc.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'created_at')

  query = query
    .order('deadline', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters) {
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters.deadline_from) {
      query = query.gte('deadline', filters.deadline_from)
    }
    if (filters.deadline_to) {
      query = query.lte('deadline', filters.deadline_to)
    }
    if (filters.week_start_date) {
      query = query.eq('week_start_date', filters.week_start_date)
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1)
    }
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách công việc.')

  return data || []
}

// Get task by ID
export const getTaskById = async (taskId: string): Promise<TaskRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem công việc.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  throwIfError(error, 'Không thể tải thông tin công việc.')

  return data
}

// Create new task
export const createTask = async (payload: TaskInsert): Promise<TaskRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo công việc.')
  }

  // Calculate week_start_date if deadline is provided
  let weekStartDate = payload.week_start_date
  if (payload.deadline && !weekStartDate) {
    const deadlineDate = new Date(payload.deadline + 'T00:00:00+07:00')
    weekStartDate = getWeekStartDateUTC7(deadlineDate)
  } else if (!weekStartDate) {
    // If no deadline, use current week
    const now = getNowUTC7()
    weekStartDate = getWeekStartDateUTC7(now)
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      user_id: user.id,
      week_start_date: weekStartDate,
      status: payload.status || 'pending',
      priority: payload.priority || 'medium',
      progress: payload.progress || 0,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo công việc mới.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu công việc sau khi tạo.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['tasks'] })

  return data
}

// Update task
export const updateTask = async (taskId: string, payload: TaskUpdate): Promise<TaskRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật công việc.')
  }

  // Recalculate week_start_date if deadline is updated
  const updatePayload: any = { ...payload }
  if (payload.deadline !== undefined) {
    if (payload.deadline) {
      const deadlineDate = new Date(payload.deadline + 'T00:00:00+07:00')
      updatePayload.week_start_date = getWeekStartDateUTC7(deadlineDate)
    } else {
      updatePayload.week_start_date = null
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updatePayload)
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật công việc.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu công việc sau khi cập nhật.')
  }

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['tasks'] })

  return data
}

// Delete task
export const deleteTask = async (taskId: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa công việc.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa công việc.')

  // Invalidate cache
  await queryClient.invalidateQueries({ queryKey: ['tasks'] })
}

// Get tasks approaching deadline (within next 3 days)
export const getTasksApproachingDeadline = async (days: number = 3): Promise<TaskRecord[]> => {
  const now = getNowUTC7()
  const components = getDateComponentsUTC7(now)
  const today = formatDateUTC7(now)

  // Calculate future date
  const futureDate = new Date(components.year, components.month - 1, components.day)
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = formatDateUTC7(futureDate)

  return fetchTasks({
    deadline_from: today,
    deadline_to: futureDateStr,
    status: 'pending' as TaskStatus, // Only pending and in_progress tasks
  }).then(tasks =>
    tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  )
}

// Get tasks for a specific week
export const getTasksForWeek = async (weekStartDate: string): Promise<TaskRecord[]> => {
  return fetchTasks({
    week_start_date: weekStartDate,
  })
}

// Get tasks for a specific month
export const getTasksForMonth = async (year: number, month: number): Promise<TaskRecord[]> => {
  // Calculate first and last day of month
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0) // Last day of month

  const firstDayStr = formatDateUTC7(firstDay)
  const lastDayStr = formatDateUTC7(lastDay)

  return fetchTasks({
    deadline_from: firstDayStr,
    deadline_to: lastDayStr,
  })
}

