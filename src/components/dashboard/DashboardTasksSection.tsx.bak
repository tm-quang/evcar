import { useEffect, useState, useMemo } from 'react'
import { FaCog } from 'react-icons/fa'
import { fetchTasks, updateTask, type TaskRecord } from '../../lib/taskService'
import { getTaskViewPeriod, type TaskViewPeriod } from '../../lib/userPreferencesService'
import { getDateComponentsUTC7, formatDateUTC7, createDateUTC7, getNowUTC7, getFirstDayOfMonthUTC7, getLastDayOfMonthUTC7 } from '../../utils/dateUtils'
import { DashboardTaskCard } from './DashboardTaskCard'
import { TaskSettingsModal } from './TaskSettingsModal'

type DashboardTasksSectionProps = {
  onTaskClick?: (task: TaskRecord) => void
  onLongPressStart?: (task: TaskRecord) => void
  onLongPressEnd?: () => void
  onLongPressCancel?: () => void
  refreshTrigger?: number
}

export const DashboardTasksSection = ({
  onTaskClick,
  onLongPressStart,
  onLongPressEnd,
  onLongPressCancel,
  refreshTrigger = 0
}: DashboardTasksSectionProps) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewPeriod, setViewPeriod] = useState<TaskViewPeriod>('week')
  const [customStartDate, setCustomStartDate] = useState<string | null>(null)
  const [customEndDate, setCustomEndDate] = useState<string | null>(null)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Try to load from database
        const period = await getTaskViewPeriod()
        setViewPeriod(period)

        // Load custom dates from database (via getUserPreferences)
        const { getUserPreferences } = await import('../../lib/userPreferencesService')
        const preferences = await getUserPreferences()
        if (preferences) {
          if (preferences.task_custom_start_date) {
            setCustomStartDate(preferences.task_custom_start_date)
          }
          if (preferences.task_custom_end_date) {
            setCustomEndDate(preferences.task_custom_end_date)
          }
        }
      } catch (error) {
        console.error('Error loading task preferences:', error)
        // Fallback to localStorage
        const stored = localStorage.getItem('dashboard_task_view_period')
        if (stored && (stored === 'week' || stored === 'month' || stored === 'custom')) {
          setViewPeriod(stored as TaskViewPeriod)
        }
        const storedStart = localStorage.getItem('dashboard_task_custom_start')
        const storedEnd = localStorage.getItem('dashboard_task_custom_end')
        if (storedStart) setCustomStartDate(storedStart)
        if (storedEnd) setCustomEndDate(storedEnd)
      }
    }
    loadPreferences()
  }, [])

  // Calculate date range based on view period
  const dateRange = useMemo(() => {
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)

    if (viewPeriod === 'week') {
      // Get Monday of current week
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday is 1
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      return {
        start: formatDateUTC7(createDateUTC7(
          monday.getFullYear(),
          monday.getMonth() + 1,
          monday.getDate(),
          0, 0, 0, 0
        )),
        end: formatDateUTC7(createDateUTC7(
          sunday.getFullYear(),
          sunday.getMonth() + 1,
          sunday.getDate(),
          23, 59, 59, 999
        ))
      }
    } else if (viewPeriod === 'month') {
      // First and last day of current month
      const firstDay = getFirstDayOfMonthUTC7(components.year, components.month)
      const lastDay = getLastDayOfMonthUTC7(components.year, components.month)

      return {
        start: formatDateUTC7(firstDay),
        end: formatDateUTC7(lastDay)
      }
    } else {
      // Custom range
      if (customStartDate && customEndDate) {
        return {
          start: customStartDate,
          end: customEndDate
        }
      }
      // Fallback to current week if custom dates not set
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      monday.setHours(0, 0, 0, 0)

      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      return {
        start: formatDateUTC7(createDateUTC7(
          monday.getFullYear(),
          monday.getMonth() + 1,
          monday.getDate(),
          0, 0, 0, 0
        )),
        end: formatDateUTC7(createDateUTC7(
          sunday.getFullYear(),
          sunday.getMonth() + 1,
          sunday.getDate(),
          23, 59, 59, 999
        ))
      }
    }
  }, [viewPeriod, customStartDate, customEndDate])

  // Load tasks based on date range (exclude completed tasks, include tasks without deadline)
  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true)
      try {
        const allTasks = await fetchTasks()
        // Filter out completed and cancelled tasks, allow tasks in date range OR without deadline
        const activeTasks = allTasks.filter(task => {
          if (task.status === 'completed' || task.status === 'cancelled') return false
          if (!task.deadline) return true

          const taskDateStr = task.deadline.split('T')[0]
          return taskDateStr >= dateRange.start && taskDateStr <= dateRange.end
        })
        setTasks(activeTasks)
      } catch (error) {
        console.error('Error loading tasks:', error)
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }
    loadTasks()
  }, [dateRange, viewPeriod, refreshTrigger])

  // Handle task update
  const handleTaskUpdate = async (taskId: string, updates: Partial<TaskRecord>) => {
    try {
      await updateTask(taskId, updates)
      // Reload tasks to reflect changes (exclude completed tasks)
      const allTasks = await fetchTasks()
      // Filter out completed and cancelled tasks, allow tasks in date range OR without deadline
      const activeTasks = allTasks.filter(task => {
        if (task.status === 'completed' || task.status === 'cancelled') return false
        if (!task.deadline) return true

        const taskDateStr = task.deadline.split('T')[0]
        return taskDateStr >= dateRange.start && taskDateStr <= dateRange.end
      })
      setTasks(activeTasks)
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  // Handle save from settings modal
  const handleSettingsSave = (period: TaskViewPeriod, startDate: string | null, endDate: string | null) => {
    setViewPeriod(period)
    setCustomStartDate(startDate)
    setCustomEndDate(endDate)

    // Update localStorage
    localStorage.setItem('dashboard_task_view_period', period)
    if (startDate) {
      localStorage.setItem('dashboard_task_custom_start', startDate)
    } else {
      localStorage.removeItem('dashboard_task_custom_start')
    }
    if (endDate) {
      localStorage.setItem('dashboard_task_custom_end', endDate)
    } else {
      localStorage.removeItem('dashboard_task_custom_end')
    }
  }

  const formatDateDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-lg border border-slate-100">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-md font-bold uppercase tracking-wider text-slate-700">Công việc</h3>
            <p className="mt-1 text-xs text-slate-500">Danh sách công việc đang thực hiện</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
          >
            <FaCog className="h-3.5 w-3.5" />
            <span>Cài đặt</span>
          </button>
        </div>

        {/* Tab Selection - Display only */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold ${viewPeriod === 'week'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600'
              }`}
          >
            Tuần
          </div>
          <div
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold ${viewPeriod === 'month'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600'
              }`}
          >
            Tháng
          </div>
          {viewPeriod === 'custom' && (
            <div className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow-md">
              Tùy chỉnh
            </div>
          )}
        </div>

        {/* Date Range Display */}
        <div className="text-xs text-slate-500">
          {viewPeriod === 'week' && 'Tuần này'}
          {viewPeriod === 'month' && 'Tháng này'}
          {viewPeriod === 'custom' && customStartDate && customEndDate && (
            `${formatDateDisplay(customStartDate)} - ${formatDateDisplay(customEndDate)}`
          )}
        </div>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">
          Không có công việc trong khoảng thời gian này
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <DashboardTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
              onLongPressStart={(task) => onLongPressStart?.(task)}
              onLongPressEnd={() => onLongPressEnd?.()}
              onLongPressCancel={() => onLongPressCancel?.()}
              onTaskUpdate={handleTaskUpdate}
            />
          ))}
        </div>
      )}

      {/* Settings Modal */}
      <TaskSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialViewPeriod={viewPeriod}
        initialCustomStartDate={customStartDate}
        initialCustomEndDate={customEndDate}
        onSave={handleSettingsSave}
      />
    </div>
  )
}

