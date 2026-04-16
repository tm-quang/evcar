import { useEffect } from 'react'
import { FaCalendar, FaChartLine, FaExclamationTriangle, FaCheckSquare, FaSquare, FaCheck, FaEdit, FaTrash, FaClock } from 'react-icons/fa'
import HeaderBar from '../layout/HeaderBar'
import type { TaskRecord } from '../../lib/taskService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'

type TaskDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  task: TaskRecord | null
  onEdit: (task: TaskRecord) => void
  onUpdate: (taskId: string, updates: Partial<TaskRecord>) => void
  onDelete: (task: TaskRecord) => void
  onComplete: (task: TaskRecord) => void
  disableRipple?: boolean
  onToggleRipple?: () => void
}

export const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onUpdate, onDelete, onComplete, disableRipple = false, onToggleRipple }: TaskDetailModalProps) => {

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen || !task) return null

  const formatDeadline = (deadline: string | null): string => {
    if (!deadline) return ''
    try {
      const date = new Date(deadline + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return deadline
    }
  }

  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return ''
    }
  }

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      const time = formatTime(dateStr)
      return `${components.day}/${components.month}/${components.year} ${time}`
    } catch {
      return dateStr
    }
  }

  const isDeadlineApproaching = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  }

  const isDeadlineOverdue = (deadline: string | null): boolean => {
    if (!deadline) return false
    const now = new Date()
    const deadlineDate = new Date(deadline + 'T00:00:00+07:00')
    return deadlineDate.getTime() < now.getTime() && deadlineDate.getDate() !== now.getDate()
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-300'
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-700 border-amber-300'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành'
      case 'in_progress':
        return 'Đang làm'
      case 'cancelled':
        return 'Đã hủy'
      case 'pending':
      default:
        return 'Chờ'
    }
  }

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'Khẩn cấp'
      case 'high':
        return 'Cao'
      case 'medium':
        return 'Trung bình'
      case 'low':
        return 'Thấp'
      default:
        return 'Trung bình'
    }
  }

  const handleSubtaskToggle = (subtaskId: string) => {
    if (!task.subtasks) return

    const updatedSubtasks = task.subtasks.map(s =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )

    const completedCount = updatedSubtasks.filter(s => s.completed).length
    const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100)

    let newStatus = task.status
    if (newProgress === 100) newStatus = 'completed'
    else if (newProgress > 0) newStatus = 'in_progress'
    else newStatus = 'pending'

    onUpdate(task.id, {
      subtasks: updatedSubtasks,
      progress: newProgress,
      status: newStatus
    })
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-50 flex flex-col bg-[#F7F9FC] rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <HeaderBar
          variant="page"
          title="CHI TIẾT CÔNG VIỆC"
          onBack={onClose}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-4 pb-4 sm:pb-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className={`text-xl font-bold text-slate-900 mb-2 ${task.status === 'completed' ? 'line-through text-slate-500' : ''
                  }`}>
                  {task.title}
                </h3>
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Mô tả</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {/* Status and Priority */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
                {onToggleRipple && (
                  <button
                    type="button"
                    onClick={onToggleRipple}
                    className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      disableRipple
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}
                    title={disableRipple ? 'Bật hiệu ứng sóng' : 'Tắt hiệu ứng sóng'}
                  >
                    {disableRipple ? '⚡ Tắt sóng' : '🌊 Đang sóng'}
                  </button>
                )}
              </div>

              {/* Deadline */}
              {task.deadline && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <FaCalendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Hạn chót</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${isDeadlineOverdue(task.deadline) ? 'text-red-600' :
                        isDeadlineApproaching(task.deadline) ? 'text-orange-600' :
                          'text-slate-700'
                        }`}>
                        {formatDeadline(task.deadline)}
                      </p>
                      <FaClock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{formatTime(task.deadline)}</span>
                      {isDeadlineOverdue(task.deadline) && (
                        <FaExclamationTriangle className="h-4 w-4 text-red-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Created and Updated dates */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                {task.created_at && (
                  <div>
                    <p className="mb-1">Ngày tạo</p>
                    <p className="font-medium text-slate-700">{formatDateTime(task.created_at)}</p>
                  </div>
                )}
                {task.updated_at && (
                  <div>
                    <p className="mb-1">Cập nhật</p>
                    <p className="font-medium text-slate-700">{formatDateTime(task.updated_at)}</p>
                  </div>
                )}
                {task.completed_at && (
                  <div className="col-span-2">
                    <p className="mb-1">Hoàn thành</p>
                    <p className="font-medium text-green-600">{formatDateTime(task.completed_at)}</p>
                  </div>
                )}
              </div>

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Công việc phụ
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} hoàn thành
                    </span>
                  </div>
                  <div className="space-y-2">
                    {task.subtasks.map((subtask) => (
                      <button
                        key={subtask.id}
                        onClick={() => handleSubtaskToggle(subtask.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
                      >
                        <div className={`flex-shrink-0 transition-colors ${subtask.completed ? 'text-green-600' : 'text-slate-300'}`}>
                          {subtask.completed ? <FaCheckSquare className="h-5 w-5" /> : <FaSquare className="h-5 w-5" />}
                        </div>
                        <span className={`flex-1 text-left text-sm font-medium ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {subtask.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">
                  Không có công việc phụ
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FaChartLine className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Tiến độ</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{task.progress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Thẻ</h4>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer with CTA buttons */}
        <div className="flex shrink-0 gap-3 border-t border-slate-200 bg-[#F7F9FC] px-4 py-4 shadow-lg sm:px-6">
          <div className="mx-auto flex w-full max-w-md gap-3">
            {task.status !== 'completed' && (
              <button
                type="button"
                onClick={() => {
                  onComplete(task)
                  onClose()
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-green-700 disabled:opacity-50 sm:py-3 sm:text-base"
              >
                <FaCheck className="h-4 w-4" />
                Hoàn tất
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onEdit(task)
                onClose()
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
            >
              <FaEdit className="h-4 w-4" />
              Sửa
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(task)
                onClose()
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50 sm:py-3 sm:text-base"
            >
              <FaTrash className="h-4 w-4" />
              Xóa
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


