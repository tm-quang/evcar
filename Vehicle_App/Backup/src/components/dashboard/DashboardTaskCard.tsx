import { useState, useRef } from 'react'
import { FaChevronDown, FaChevronUp, FaCalendar, FaClock, FaCheckSquare, FaExclamationTriangle, FaCheck, FaCheckCircle } from 'react-icons/fa'
import type { TaskRecord } from '../../lib/taskService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'

type DashboardTaskCardProps = {
  task: TaskRecord
  onClick?: () => void
  onLongPressStart: (task: TaskRecord) => void
  onLongPressEnd: () => void
  onLongPressCancel: () => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskRecord>) => Promise<void>
}

// Circular Progress Ring Component
const CircularProgress = ({ progress, size = 60, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  // Get progress color
  const getProgressColor = () => {
    if (progress === 100) return '#10B981' // green
    if (progress === 0) return '#EF4444' // red
    if (progress > 0 && progress <= 25) return '#F59E0B' // amber
    if (progress > 25 && progress <= 50) return '#60A5FA' // light blue
    if (progress > 50 && progress <= 75) return '#3B82F6' // blue
    if (progress > 75 && progress < 100) return '#3B82F6' // blue
    return '#F59E0B'
  }

  const progressColor = getProgressColor()

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color: progressColor }}>
          {progress}%
        </span>
      </div>
    </div>
  )
}

export const DashboardTaskCard = ({ 
  task, 
  onClick,
  onLongPressStart,
  onLongPressEnd,
  onLongPressCancel,
  onTaskUpdate
}: DashboardTaskCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const longPressTimerRef = useRef<number | null>(null)
  const wasLongPressRef = useRef(false)

  // Format date to DD/MM/YYYY
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return ''
    }
  }

  // Format time HH:MM
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+07:00')
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return ''
    }
  }

  // Format datetime to DD/MM/YYYY HH:MM
  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = formatDate(dateStr)
    const time = formatTime(dateStr)
    return date && time ? `${date} ${time}` : date || time
  }

  // Get status text and color with enhanced styling
  const getStatusInfo = () => {
    switch (task.status) {
      case 'completed':
        return { 
          text: 'Hoàn thành', 
          color: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30',
          icon: <FaCheckCircle className="h-3 w-3" />
        }
      case 'in_progress':
        return { 
          text: 'Đang làm', 
          color: 'bg-gradient-to-r from-blue-500 to-sky-600 text-white shadow-lg shadow-blue-500/30',
          icon: null
        }
      case 'cancelled':
        return { 
          text: 'Đã hủy', 
          color: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-md',
          icon: null
        }
      default:
        return { 
          text: 'Chờ', 
          color: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30',
          icon: null
        }
    }
  }

  const statusInfo = getStatusInfo()
  
  // Get progress color based on progress level
  const getProgressColor = () => {
    if (task.status === 'completed') return '#10B981' // green
    const progress = task.progress
    if (progress === 0) return '#EF4444' // red (0%)
    if (progress > 0 && progress <= 25) return '#F59E0B' // yellow/amber (1-25%)
    if (progress > 25 && progress <= 50) return '#60A5FA' // light blue (26-50%)
    if (progress > 50 && progress <= 75) return '#3B82F6' // blue (51-75%)
    if (progress > 75 && progress < 100) return '#3B82F6' // blue (76-99%)
    if (progress === 100) return '#10B981' // green (100%)
    return '#F59E0B' // default amber
  }

  const progressColor = getProgressColor()

  // Calculate subtask info
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const totalSubtasks = subtasks.length

  // Check if deadline is approaching or overdue
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

  const isApproaching = isDeadlineApproaching(task.deadline)
  const isOverdue = isDeadlineOverdue(task.deadline)

  // Get border style with enhanced colors
  const getBorderStyle = () => {
    if (task.status === 'completed') {
      return { 
        borderColor: '#10B981', 
        borderWidth: '2px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
      }
    }
    if (isOverdue) {
      return { 
        borderColor: '#EF4444', 
        borderWidth: '3px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
      }
    }
    if (isApproaching) {
      return { 
        borderColor: '#F59E0B', 
        borderWidth: '2px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
      }
    }
    if (task.color) {
      return { 
        borderColor: task.color, 
        borderWidth: '2px',
        boxShadow: `0 4px 12px ${task.color}30`
      }
    }
    return { 
      borderColor: '#cbd5e1', 
      borderWidth: '1px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
    }
  }

  const borderStyle = getBorderStyle()

  // Handle complete task
  const handleCompleteTask = async () => {
    if (!onTaskUpdate || isUpdating) return
    
    setIsUpdating(true)
    try {
      await onTaskUpdate(task.id, {
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error completing task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle toggle subtask
  const handleToggleSubtask = async (subtaskId: string) => {
    if (!onTaskUpdate || isUpdating) return

    const updatedSubtasks = subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    
    const newCompletedCount = updatedSubtasks.filter(s => s.completed).length
    const newProgress = totalSubtasks > 0 
      ? Math.round((newCompletedCount / totalSubtasks) * 100)
      : task.progress

    setIsUpdating(true)
    try {
      await onTaskUpdate(task.id, {
        subtasks: updatedSubtasks,
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : task.status === 'completed' ? 'in_progress' : task.status
      })
    } catch (error) {
      console.error('Error updating subtask:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Long press handlers
  const handleTouchStart = () => {
    wasLongPressRef.current = false
    onLongPressStart(task)
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    onLongPressEnd()
    wasLongPressRef.current = false
  }

  const handleMouseDown = () => {
    wasLongPressRef.current = false
    onLongPressStart(task)
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    onLongPressEnd()
    wasLongPressRef.current = false
  }

  return (
    <div
      className="rounded-2xl bg-white border-2 transition-all hover:shadow-xl cursor-pointer select-none"
      style={borderStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={onLongPressCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={onLongPressCancel}
    >
      {/* Collapsed View */}
      <div
        onClick={() => {
          if (!wasLongPressRef.current) {
            setIsExpanded(!isExpanded)
          }
        }}
        className="p-4 flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Circular Progress Ring */}
          <div className="shrink-0">
            <CircularProgress progress={task.progress} size={56} strokeWidth={5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {task.color && task.status !== 'completed' && (
                <div 
                  className="h-5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.color }}
                />
              )}
              <h4 className={`text-base font-bold text-slate-900 truncate ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                {task.title}
              </h4>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1.5 rounded-3xl text-xs font-bold flex items-center gap-1.5 shadow-md ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.text}
              </span>
              {task.deadline && (
                <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                  <FaCalendar className="text-slate-400" />
                  <span className="font-medium">{formatDate(task.deadline)}</span>
                  {(isOverdue || isApproaching) && (
                    <FaExclamationTriangle className={`${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className="ml-2 p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        >
          {isExpanded ? (
            <FaChevronUp className="text-slate-400" />
          ) : (
            <FaChevronDown className="text-slate-400" />
          )}
        </button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl px-3 py-2">{task.description}</p>
          )}

          {/* Information Grid */}
          <div className="space-y-2">
            {/* Deadline - Highlighted */}
            {task.deadline && (
              <div className={`flex items-center gap-2 text-sm rounded-2xl px-3 py-2.5 ${
                isOverdue 
                  ? 'bg-red-50 border-2 border-red-300' 
                  : isApproaching 
                    ? 'bg-orange-50 border-2 border-orange-300'
                    : 'bg-blue-50 border-2 border-blue-200'
              }`}>
                <FaCalendar className={`shrink-0 ${isOverdue ? 'text-red-600' : isApproaching ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`font-semibold ${isOverdue ? 'text-red-700' : isApproaching ? 'text-orange-700' : 'text-blue-700'}`}>Hạn chót:</span>
                <span className={`font-bold ${isOverdue ? 'text-red-600' : isApproaching ? 'text-orange-600' : 'text-blue-700'}`}>
                  {formatDate(task.deadline)} {formatTime(task.deadline)}
                </span>
                {(isOverdue || isApproaching) && (
                  <FaExclamationTriangle className={`ml-auto shrink-0 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                )}
              </div>
            )}

            {/* Created Date */}
            {task.created_at && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                <FaClock className="text-slate-400 shrink-0" />
                <span>Tạo:</span>
                <span className="font-medium text-slate-900">{formatDateTime(task.created_at)}</span>
              </div>
            )}

            {/* Subtasks - Enhanced */}
            {totalSubtasks > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-green-50 border-2 border-green-200 rounded-2xl px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FaCheckSquare className="text-green-600 shrink-0" />
                    <span className="text-green-700 font-bold">Công việc phụ:</span>
                  </div>
                  <span className="font-bold text-green-700 bg-white px-2 py-1 rounded-lg">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {subtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleSubtask(subtask.id)
                      }}
                      disabled={isUpdating}
                      className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-all ${
                        subtask.completed
                          ? 'bg-green-100 text-green-800 line-through'
                          : 'bg-white hover:bg-green-100 text-slate-700'
                      } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
                        subtask.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-green-400'
                      }`}>
                        {subtask.completed && <FaCheck className="text-white text-xs" />}
                      </div>
                      <span className="text-sm font-medium flex-1">{subtask.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress Section - Enhanced */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Tiến độ tổng thể</span>
              <span className="text-sm font-bold px-2 py-1 rounded-lg bg-slate-100" style={{ color: progressColor }}>
                {task.progress}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: progressColor,
                  boxShadow: `0 2px 8px ${progressColor}40`
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {/* Complete Task Button */}
            {task.status !== 'completed' && onTaskUpdate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCompleteTask()
                }}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold shadow-lg shadow-green-500/30 transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheckCircle className="h-4 w-4" />
                <span>Hoàn tất công việc</span>
              </button>
            )}

            {/* View Details Button */}
            {onClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClick()
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-md transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg active:scale-95"
              >
                Xem chi tiết
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

