import { useState, useEffect, useMemo, useRef } from 'react'
import { FaChevronLeft, FaChevronRight, FaCalendarAlt, FaCalendarWeek, FaCog } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import type { ReminderRecord } from '../../lib/reminderService'
import { createDateUTC7, formatDateUTC7, getDateComponentsUTC7, getNowUTC7, getDayOfWeekUTC7 } from '../../utils/dateUtils'
import { getLunarDate } from '../../utils/lunarCalendar'

type PlanCalendarProps = {
  tasks: TaskRecord[]
  reminders: ReminderRecord[]
  onDateClick: (date: string) => void
  selectedDate?: string
  onMonthChange?: (year: number, month: number) => void
  disableRipple?: boolean
  onDateWithItemsClick?: (date: string, position?: { top: number; left: number }) => void
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

const STORAGE_KEY = 'planCalendar_defaultViewMode'

export const PlanCalendar = ({
  tasks,
  reminders,
  onDateClick,
  selectedDate,
  onMonthChange,
  disableRipple = false,
  onDateWithItemsClick,
}: PlanCalendarProps) => {
  // Load default view mode from localStorage
  const getDefaultViewMode = (): 'month' | 'week' => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'week' || stored === 'month') {
        return stored
      }
    } catch (error) {
      console.error('Error loading calendar view mode:', error)
    }
    return 'month' // Default to month
  }

  const [viewMode, setViewMode] = useState<'month' | 'week'>(getDefaultViewMode)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = getNowUTC7()
    return now
  })
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<{ date: string; hasItems: boolean } | null>(null)
  const longPressActivatedRef = useRef<boolean>(false)

  // Save view mode to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, viewMode)
    } catch (error) {
      console.error('Error saving calendar view mode:', error)
    }
  }, [viewMode])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Notify parent when month changes (initial load)
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(year, month + 1)
    }
  }, [year, month, onMonthChange])

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  // Get items (tasks + reminders) with colors for each date
  const itemsByDate = useMemo(() => {
    const map: Record<string, {
      tasks: TaskRecord[]
      reminders: ReminderRecord[]
      taskCount: number
      reminderCount: number
      totalCount: number
      primaryColor: string | null
      hasUrgent: boolean
    }> = {}

    // Process tasks
    tasks.forEach((task) => {
      if (task.status !== 'completed' && task.deadline) {
        const date = task.deadline.split('T')[0]
        if (!map[date]) {
          map[date] = {
            tasks: [],
            reminders: [],
            taskCount: 0,
            reminderCount: 0,
            totalCount: 0,
            primaryColor: null,
            hasUrgent: false
          }
        }
        map[date].tasks.push(task)
        map[date].taskCount += 1
        map[date].totalCount += 1

        // Check for urgent/high priority
        if (task.priority === 'urgent' || task.priority === 'high') {
          map[date].hasUrgent = true
        }

        // Set primary color for tasks (indigo/purple)
        if (!map[date].primaryColor) {
          map[date].primaryColor = '#6366f1' // indigo-500
        }
      }
    })

    // Process reminders
    reminders.forEach((reminder) => {
      if (!reminder.completed_at) {
        const date = reminder.reminder_date
        if (!map[date]) {
          map[date] = {
            tasks: [],
            reminders: [],
            taskCount: 0,
            reminderCount: 0,
            totalCount: 0,
            primaryColor: null,
            hasUrgent: false
          }
        }
        map[date].reminders.push(reminder)
        map[date].reminderCount += 1
        map[date].totalCount += 1

        // Set primary color for reminders based on type/color
        if (!map[date].primaryColor) {
          const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
          const isIncome = reminder.type === 'Thu'

          if (reminder.color) {
            // Use reminder's custom color
            const colorMap: Record<string, string> = {
              amber: '#f59e0b',
              green: '#10b981',
              red: '#f43f5e',
              sky: '#0ea5e9',
              blue: '#3b82f6',
              purple: '#a855f7',
              indigo: '#6366f1',
              pink: '#ec4899',
              orange: '#f97316',
              teal: '#14b8a6',
            }
            map[date].primaryColor = colorMap[reminder.color] || colorMap.amber
          } else {
            // Default colors
            if (isNote) {
              map[date].primaryColor = '#f59e0b' // amber-500
            } else if (isIncome) {
              map[date].primaryColor = '#10b981' // green-500
            } else {
              map[date].primaryColor = '#f43f5e' // red-500
            }
          }
        }
      }
    })

    return map
  }, [tasks, reminders])

  const goToPrevious = () => {
    const newDate = new Date(currentDate.getTime())
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate.getTime())
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    const today = getNowUTC7()
    setCurrentDate(today)
    if (onDateClick) {
      const components = getDateComponentsUTC7(today)
      onDateClick(formatDateUTC7(createDateUTC7(components.year, components.month, components.day, 0, 0, 0, 0)))
    }
  }

  // Generate days to display
  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []

    if (viewMode === 'month') {
      // Use fixed UTC+7 components
      const components = getDateComponentsUTC7(currentDate)
      const yr = components.year
      const mn = components.month

      const firstDayOfMonth = createDateUTC7(yr, mn, 1)
      const lastDayOfMonth = new Date(yr, mn, 0) // This is fine for getting days count as it depends on month length only
      const daysInMonth = lastDayOfMonth.getDate()

      const vnDayOfWeek = getDayOfWeekUTC7(firstDayOfMonth)

      // Convert to Monday-first week (0=Sunday becomes 6, 1=Monday becomes 0, etc.)
      const mondayFirstDayOfWeek = vnDayOfWeek === 0 ? 6 : vnDayOfWeek - 1

      // Empty slots before first day of month (starting from Monday)
      for (let i = 0; i < mondayFirstDayOfWeek; i++) days.push(null)
      // Days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i))
      }
    } else {
      // Week view - start from Monday
      // Week view - start from Monday
      const currentDay = getDayOfWeekUTC7(currentDate) // 0-6 (0 = Sunday)
      // Convert to Monday-first: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1

      const startOfWeekTime = currentDate.getTime() - daysFromMonday * 24 * 60 * 60 * 1000

      for (let i = 0; i < 7; i++) {
        const dayTime = startOfWeekTime + i * 24 * 60 * 60 * 1000
        const dayDate = new Date(dayTime)
        const components = getDateComponentsUTC7(dayDate)
        const day = createDateUTC7(components.year, components.month, components.day)
        days.push(day)
      }
    }
    return days
  }, [viewMode, year, month, currentDate])

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const isToday = (date: Date) => {
    const today = getNowUTC7()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-800 truncate whitespace-nowrap">
            {viewMode === 'month'
              ? `${MONTHS[month]} ${year}`
              : `Tuần ${getDateComponentsUTC7(currentDate).day}/${getDateComponentsUTC7(currentDate).month}`
            }
          </h3>
          <button
            onClick={() => setViewMode(v => v === 'month' ? 'week' : 'month')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
            title={viewMode === 'month' ? 'Chuyển sang chế độ tuần' : 'Chuyển sang chế độ tháng'}
          >
            {viewMode === 'month' ? <FaCalendarWeek className="w-3.5 h-3.5" /> : <FaCalendarAlt className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
            title="Cài đặt hiển thị"
          >
            <FaCog className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={goToPrevious}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goToToday}
            className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            Hôm nay
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1">
        {calendarDays.map((date, idx) => {
          if (!date) return <div key={idx} />

          const dateStr = formatDateStr(date)
          const data = itemsByDate[dateStr]
          const isSelected = selectedDate === dateStr
          const isCurrentDay = isToday(date)

          // Determine background color
          let bgColor: string | undefined = undefined
          let textColor = 'text-slate-700'

          // If there's data with color, always apply it (even when selected)
          if (data && data.primaryColor) {
            bgColor = data.primaryColor
            textColor = 'text-white'
          }

          const handleDateClick = (e: React.MouseEvent | React.TouchEvent) => {
            // Only handle normal click if long press was not activated
            if (!longPressActivatedRef.current) {
              onDateClick(dateStr)

              if (onDateWithItemsClick) {
                const button = e.currentTarget as HTMLElement
                const rect = button.getBoundingClientRect()
                const position = {
                  top: rect.top + rect.height / 2,
                  left: rect.left + rect.width / 2
                }
                onDateWithItemsClick(dateStr, position)
              }
            }
            // Reset flag after click
            longPressActivatedRef.current = false
          }

          const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent) => {
            // Enable long press for all dates (not just those with items)
            longPressActivatedRef.current = false
            longPressTargetRef.current = { date: dateStr, hasItems: !!(data && data.totalCount > 0) }

            // Get button position for arrow indicator
            const button = e.currentTarget as HTMLElement
            const rect = button.getBoundingClientRect()
            const position = {
              top: rect.top + rect.height / 2,
              left: rect.left + rect.width / 2
            }

            // Set timer for long press (500ms) to open detail modal
            longPressTimerRef.current = window.setTimeout(() => {
              if (longPressTargetRef.current && onDateWithItemsClick) {
                longPressActivatedRef.current = true
                onDateWithItemsClick(longPressTargetRef.current.date, position)
              }
            }, 500)
          }

          const handleLongPressEnd = () => {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            // If long press was activated, prevent normal click
            if (longPressActivatedRef.current) {
              // Reset after a short delay to allow click handler to check the flag
              setTimeout(() => {
                longPressActivatedRef.current = false
              }, 100)
            }
            longPressTargetRef.current = null
          }

          const handleLongPressCancel = () => {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }
            longPressActivatedRef.current = false
            longPressTargetRef.current = null
          }

          // Build base className without selection
          let baseClassName = ''
          if (isCurrentDay && !data) {
            baseClassName = 'font-semibold border-2 border-black hover:border-black hover:shadow-md'
          } else if (isCurrentDay && data) {
            baseClassName = 'font-semibold border-2 border-black shadow-md hover:border-black hover:shadow-lg hover:scale-105'
          } else if (data) {
            baseClassName = 'font-semibold shadow-md hover:shadow-lg hover:scale-105 border-2 border-transparent hover:border-black'
          } else {
            baseClassName = 'border-2 border-slate-100 hover:border-black hover:bg-slate-50 hover:shadow-sm'
          }

          // If selected, only change border to black, keep everything else
          const finalClassName = isSelected
            ? baseClassName.replace(/border-2 border-[^\s]+/g, 'border-2 border-black').replace(/hover:border-[^\s]+/g, 'hover:border-black')
            : baseClassName

          return (
            <button
              key={idx}
              onClick={handleDateClick}
              onMouseDown={handleLongPressStart}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressCancel}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressCancel}
              className={`
                relative flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl transition-all duration-200
                ${finalClassName}
                ${textColor}
              `}
              style={bgColor ? {
                backgroundColor: bgColor,
                boxShadow: data
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  : undefined
              } : {}}
            >
              <div className="flex flex-col items-center justify-center relative z-10 gap-0.5">
                <span className="text-sm font-medium leading-none">{date.getDate()}</span>
                <span className={`text-[9px] leading-tight ${isSelected ? (data ? 'text-white/90' : 'text-slate-500') : isCurrentDay && !data ? 'text-slate-500' : data ? 'text-white/90' : 'text-slate-500'}`}>
                  {getLunarDate(date)}
                </span>
              </div>

              {/* Ripple Effect for Urgent/High Priority */}
              {data?.hasUrgent && !isSelected && !disableRipple && (
                <span className="absolute inset-0 z-0 rounded-xl overflow-hidden">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-red-400 opacity-20"></span>
                </span>
              )}

              {/* Badge with count - nổi bật trên màu nền */}
              {data && data.totalCount > 0 && (
                <span
                  className={`
                    absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-lg z-20
                    ${isSelected
                      ? 'bg-white text-blue-600 ring-2 ring-blue-300'
                      : 'bg-white'
                    }
                  `}
                  style={!isSelected && data.primaryColor ? {
                    backgroundColor: 'white',
                    color: data.primaryColor,
                    border: `2px solid ${data.primaryColor}`,
                    boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 2px rgba(255, 255, 255, 0.5)`
                  } : {}}
                >
                  {data.totalCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full pointer-events-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">
                  Cài đặt hiển thị
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  aria-label="Đóng"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Chế độ hiển thị mặc định
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('month')
                      setIsSettingsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${viewMode === 'month'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                        <FaCalendarAlt className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Tháng</p>
                        <p className="text-xs text-slate-500">Hiển thị toàn bộ tháng</p>
                      </div>
                    </div>
                    {viewMode === 'month' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('week')
                      setIsSettingsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${viewMode === 'week'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                        <FaCalendarWeek className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Tuần</p>
                        <p className="text-xs text-slate-500">Hiển thị 7 ngày trong tuần</p>
                      </div>
                    </div>
                    {viewMode === 'week' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


