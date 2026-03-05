import { useEffect } from 'react'
import { FaTimes, FaCheckCircle, FaCalendar, FaListUl, FaStickyNote, FaTasks, FaClipboardList } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import type { ReminderRecord } from '../../lib/reminderService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'
import { formatVNDDisplay } from '../../utils/currencyInput'

type PlanDayModalProps = {
  isOpen: boolean
  onClose: () => void
  tasks: TaskRecord[]
  reminders: ReminderRecord[]
  date: string
  onTaskClick?: (task: TaskRecord) => void
  onReminderClick?: (reminder: ReminderRecord) => void
  onCreateNote?: (date: string) => void
  onCreateTask?: (date: string) => void
  onCreatePlan?: (date: string) => void
  anchorPosition?: { top: number; left: number } // Position of the date button that triggered this modal
}

export const PlanDayModal = ({
  isOpen,
  onClose,
  tasks,
  reminders,
  date,
  onTaskClick,
  onReminderClick,
  onCreateNote,
  onCreateTask,
  onCreatePlan,
  anchorPosition
}: PlanDayModalProps) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return dateStr
    }
  }

  const getTaskStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'in_progress':
        return 'text-blue-600'
      case 'cancelled':
        return 'text-slate-400'
      default:
        return 'text-amber-600'
    }
  }

  const getTaskStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành'
      case 'in_progress':
        return 'Đang làm'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return 'Chờ'
    }
  }

  const getReminderColor = (reminder: ReminderRecord) => {
    if (reminder.color) return reminder.color
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    return isNote ? 'amber' : reminder.type === 'Thu' ? 'green' : 'red'
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; gradient: string }> = {
      amber: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', border: 'border-amber-200/60', icon: 'bg-gradient-to-br from-amber-400 to-amber-500', gradient: 'from-amber-400 to-amber-500' },
      green: { bg: 'bg-gradient-to-br from-green-50 to-green-50', border: 'border-green-200/60', icon: 'bg-gradient-to-br from-green-400 to-green-500', gradient: 'from-green-400 to-green-500' },
      red: { bg: 'bg-gradient-to-br from-red-50 to-pink-50', border: 'border-red-200/60', icon: 'bg-gradient-to-br from-red-400 to-red-500', gradient: 'from-red-400 to-red-500' },
      sky: { bg: 'bg-gradient-to-br from-sky-50 to-blue-50', border: 'border-sky-200/60', icon: 'bg-gradient-to-br from-sky-400 to-sky-500', gradient: 'from-sky-400 to-sky-500' },
      blue: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', border: 'border-blue-200/60', icon: 'bg-gradient-to-br from-blue-400 to-blue-500', gradient: 'from-blue-400 to-blue-500' },
      purple: { bg: 'bg-gradient-to-br from-purple-50 to-violet-50', border: 'border-purple-200/60', icon: 'bg-gradient-to-br from-purple-400 to-purple-500', gradient: 'from-purple-400 to-purple-500' },
      indigo: { bg: 'bg-gradient-to-br from-indigo-50 to-blue-50', border: 'border-indigo-200/60', icon: 'bg-gradient-to-br from-indigo-400 to-indigo-500', gradient: 'from-indigo-400 to-indigo-500' },
      pink: { bg: 'bg-gradient-to-br from-pink-50 to-red-50', border: 'border-pink-200/60', icon: 'bg-gradient-to-br from-pink-400 to-pink-500', gradient: 'from-pink-400 to-pink-500' },
      orange: { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-200/60', icon: 'bg-gradient-to-br from-orange-400 to-orange-500', gradient: 'from-orange-400 to-orange-500' },
      teal: { bg: 'bg-gradient-to-br from-teal-50 to-cyan-50', border: 'border-teal-200/60', icon: 'bg-gradient-to-br from-teal-400 to-teal-500', gradient: 'from-teal-400 to-teal-500' },
    }
    return colorMap[color] || colorMap.amber
  }

  const totalItems = tasks.length + reminders.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal with arrow indicator */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-start justify-center p-0 sm:p-4 pointer-events-none" style={{ paddingTop: anchorPosition ? `${anchorPosition.top}px` : '10%' }}>
        {/* Arrow pointing up */}
        {anchorPosition && (
          <div
            className="hidden sm:block absolute z-[60] pointer-events-none"
            style={{
              left: `${anchorPosition.left}px`,
              top: `${anchorPosition.top - 12}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent border-b-white drop-shadow-lg" />
          </div>
        )}

        <div
          className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200 border border-slate-200/50 safe-area-bottom mt-12 sm:mt-0"
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: anchorPosition ? '8px' : '0' }}
        >
          {/* Mobile Handle */}
          <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          {/* Header with gradient */}
          <div className="relative flex items-center justify-between p-5 bg-gradient-to-r from-sky-500 to-blue-600 sm:rounded-t-3xl border-b border-sky-400">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white drop-shadow-sm">
                {formatDate(date)}
              </h3>
              <p className="text-xs text-white/90 mt-1 font-medium">
                {totalItems} {totalItems === 1 ? 'mục' : 'mục'} • {tasks.length} công việc • {reminders.length} nhắc nhở
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors ml-3 shrink-0"
              aria-label="Đóng"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Create Buttons */}
          <div className="px-4 pt-4 pb-2 border-b border-slate-200">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onCreateNote) {
                    onCreateNote(date)
                  }
                  onClose()
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 transition-all active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                  <FaStickyNote className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-amber-700">Ghi chú</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCreateTask) {
                    onCreateTask(date)
                  }
                  onClose()
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-300 transition-all active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white">
                  <FaTasks className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-indigo-700">Công việc</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCreatePlan) {
                    onCreatePlan(date)
                  }
                  onClose()
                }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 transition-all active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white">
                  <FaClipboardList className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-purple-700">Kế hoạch</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4">
            {totalItems === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <FaCalendar className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">
                  Chưa có kế hoạch, ghi chú, thu chi
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tasks Section */}
                {tasks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                      <FaListUl className="h-3 w-3" />
                      Công việc ({tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            if (onTaskClick) {
                              onTaskClick(task)
                            }
                            onClose()
                          }}
                          className="w-full text-left p-3.5 rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 hover:from-indigo-100 hover:via-purple-100 hover:to-indigo-100 hover:border-indigo-300 hover:shadow-lg transition-all active:scale-[0.98] group"
                        >
                          <div className="flex items-start gap-2">
                            {task.status === 'completed' && (
                              <FaCheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                                }`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTaskStatusColor(task.status)} bg-white/80`}>
                                  {getTaskStatusText(task.status)}
                                </span>
                                {task.priority === 'urgent' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                    Khẩn
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reminders Section */}
                {reminders.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                      <FaCalendar className="h-3 w-3" />
                      Nhắc nhở ({reminders.length})
                    </h4>
                    <div className="space-y-2">
                      {reminders.map((reminder) => {
                        const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                        const reminderColor = getReminderColor(reminder)
                        const colorClasses = getColorClasses(reminderColor)

                        return (
                          <button
                            key={reminder.id}
                            type="button"
                            onClick={() => {
                              if (onReminderClick) {
                                onReminderClick(reminder)
                              }
                              onClose()
                            }}
                            className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all hover:shadow-lg active:scale-[0.98] group ${colorClasses.bg} ${colorClasses.border} hover:border-opacity-100`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {reminder.title}
                                  </p>
                                  {isNote && (
                                    <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-600">
                                      Ghi chú
                                    </span>
                                  )}
                                </div>
                                {reminder.amount && (
                                  <p className="text-sm font-bold text-slate-900 mt-1">
                                    {formatVNDDisplay(reminder.amount)}
                                  </p>
                                )}
                                {reminder.reminder_time && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {reminder.reminder_time}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}


