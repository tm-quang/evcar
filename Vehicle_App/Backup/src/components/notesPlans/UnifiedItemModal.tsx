import { useEffect, useState } from 'react'
import { FaTimes, FaArrowLeft, FaCalendar, FaClock, FaChevronDown, FaArrowDown, FaArrowUp, FaCheckSquare, FaSquare, FaPlus, FaTrash, FaChartLine, FaMicrophone } from 'react-icons/fa'
import { CustomSelect } from '../ui/CustomSelect'
import { NumberPadModal } from '../ui/NumberPadModal'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import { IconPicker } from '../categories/IconPicker'
import { createTask, updateTask, type TaskRecord, type TaskInsert, type TaskStatus, type TaskPriority, type Subtask } from '../../lib/taskService'
import { createReminder, updateReminder, type ReminderRecord, type ReminderInsert, type ReminderType, type RepeatType } from '../../lib/reminderService'
import { fetchCategories, type CategoryRecord } from '../../lib/categoryService'
import { fetchWallets, getDefaultWallet, type WalletRecord } from '../../lib/walletService'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import { formatDateUTC7, getNowUTC7 } from '../../utils/dateUtils'
import { getIconNode } from '../../utils/iconLoader'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { useVoiceInput } from '../../hooks/useVoiceInput'

type ItemType = 'task' | 'reminder' | 'note'
type EditingItem = {
  type: ItemType
  task?: TaskRecord
  reminder?: ReminderRecord
}

type UnifiedItemModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editingItem?: EditingItem | null
  defaultDate?: string
  categories?: CategoryRecord[]
  wallets?: WalletRecord[]
  categoryIcons?: Record<string, React.ReactNode>
}

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none', label: 'Không lặp lại' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
  { value: 'yearly', label: 'Hàng năm' },
]

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // green
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
]

// Map hex colors to reminder color names
const HEX_TO_REMINDER_COLOR: Record<string, string> = {
  '#3B82F6': 'sky',
  '#EF4444': 'red',
  '#F59E0B': 'amber',
  '#10B981': 'green',
  '#8B5CF6': 'purple',
  '#EC4899': 'pink',
  '#6366F1': 'indigo',
  '#14B8A6': 'teal',
}

// Map reminder color names to hex
const REMINDER_COLOR_TO_HEX: Record<string, string> = {
  'blue': '#3B82F6',
  'sky': '#3B82F6',
  'red': '#EF4444',
  'amber': '#F59E0B',
  'orange': '#F59E0B',
  'green': '#10B981',
  'purple': '#8B5CF6',
  'violet': '#8B5CF6',
  'pink': '#EC4899',
  'indigo': '#6366F1',
  'teal': '#14B8A6',
  'cyan': '#14B8A6',
}

export const UnifiedItemModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingItem,
  defaultDate,
  categories: propsCategories = [],
  wallets: propsWallets = [],
  categoryIcons: propsCategoryIcons = {},
}: UnifiedItemModalProps) => {
  const { success, error: showError } = useNotification()

  // Determine current item type from editingItem or default to 'task'
  const [itemType, setItemType] = useState<ItemType>(() => {
    if (editingItem) return editingItem.type
    return 'task'
  })

  const [wallets, setWallets] = useState<WalletRecord[]>(propsWallets)
  const [categories, setCategories] = useState<CategoryRecord[]>(propsCategories)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>(propsCategoryIcons)
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskDeadline, setTaskDeadline] = useState<string | null>(null)
  const [taskProgress, setTaskProgress] = useState(0)
  const [taskColor, setTaskColor] = useState<string>('#3B82F6')
  const [taskTags, setTaskTags] = useState<string[]>([])
  const [taskTagInput, setTaskTagInput] = useState('')
  const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([])
  const [taskSubtaskInput, setTaskSubtaskInput] = useState('')

  // Voice input hook - Quản lý tất cả voice recognition
  const voiceInput = useVoiceInput({
    fields: [
      {
        id: 'taskTitle',
        onResult: (text) => setTaskTitle(text),
      },
      {
        id: 'taskDescription',
        onResult: (text) => setTaskDescription(text),
      },
      {
        id: 'taskSubtask',
        onResult: (text) => setTaskSubtaskInput(text),
      },
      {
        id: 'reminderTitle',
        onResult: (text) => setReminderTitle(text),
      },
      {
        id: 'reminderNotes',
        onResult: (text) => setReminderNotes(text),
      },
    ],
    onError: (error) => showError(error),
  })

  // Reminder/Note form state
  const [reminderType, setReminderType] = useState<ReminderType>('Chi')
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderAmount, setReminderAmount] = useState('')
  const [reminderCategoryId, setReminderCategoryId] = useState('')
  const [reminderWalletId, setReminderWalletId] = useState('')
  const [reminderIconId, setReminderIconId] = useState('')
  const [reminderDate, setReminderDate] = useState(formatDateUTC7(getNowUTC7()))
  const [reminderTime, setReminderTime] = useState('')
  const [reminderRepeatType, setReminderRepeatType] = useState<RepeatType>('none')
  const [reminderNotes, setReminderNotes] = useState('')
  const [reminderColor, setReminderColor] = useState('red')
  const [reminderEnableNotification, setReminderEnableNotification] = useState(true)
  const [selectedIcon, setSelectedIcon] = useState<React.ReactNode | null>(null)

  // Modal states
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [isTaskDateTimePickerOpen, setIsTaskDateTimePickerOpen] = useState(false)

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        let walletsData = propsWallets
        let categoriesData = propsCategories
        let defaultId: string | null = null

        if (walletsData.length === 0) {
          try {
            walletsData = await fetchWallets(false)
            setWallets(walletsData)
          } catch (err) {
            console.error('Error loading wallets:', err)
          }
        }

        if (categoriesData.length === 0) {
          try {
            categoriesData = await fetchCategories()
            setCategories(categoriesData)
          } catch (err) {
            console.error('Error loading categories:', err)
          }
        }

        try {
          defaultId = await getDefaultWallet()
          setDefaultWalletId(defaultId)
        } catch (err) {
          console.error('Error loading default wallet:', err)
        }

        // Load category icons if needed
        if (categoriesData.length > 0 && Object.keys(propsCategoryIcons).length === 0) {
          const iconsMap: Record<string, React.ReactNode> = {}
          const iconPromises = categoriesData.map(async (category) => {
            try {
              const iconNode = await getIconNode(category.icon_id)
              if (iconNode) {
                return {
                  categoryId: category.id,
                  iconNode: (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                      {iconNode}
                    </span>
                  )
                }
              } else {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  return { categoryId: category.id, iconNode: <IconComponent className="h-5 w-5" /> }
                }
              }
            } catch {
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                return { categoryId: category.id, iconNode: <IconComponent className="h-5 w-5" /> }
              }
            }
            return null
          })

          const results = await Promise.allSettled(iconPromises)
          results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              iconsMap[result.value.categoryId] = result.value.iconNode
            }
          })
          setCategoryIcons(iconsMap)
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen, propsWallets, propsCategories, propsCategoryIcons])

  // Populate form based on editingItem
  useEffect(() => {
    if (isOpen && editingItem) {
      setItemType(editingItem.type)

      if (editingItem.type === 'task' && editingItem.task) {
        const task = editingItem.task
        setTaskTitle(task.title)
        setTaskDescription(task.description || '')
        setTaskStatus(task.status)
        setTaskPriority(task.priority)
        setTaskDeadline(task.deadline)
        setTaskProgress(task.progress)
        setTaskTags(task.tags || [])
        setTaskColor(task.color || '#3B82F6')
        setTaskSubtasks(task.subtasks || [])
        // Reset voice recognition states
        voiceInput.reset()
      } else if ((editingItem.type === 'reminder' || editingItem.type === 'note') && editingItem.reminder) {
        const reminder = editingItem.reminder
        setReminderType(reminder.type)
        setReminderTitle(reminder.title)
        setReminderAmount(reminder.amount ? formatVNDInput(reminder.amount.toString()) : '')
        setReminderCategoryId(reminder.category_id || '')
        setReminderWalletId(reminder.wallet_id || '')
        setReminderIconId(reminder.icon_id || '')
        setReminderDate(reminder.reminder_date)
        setReminderTime(reminder.reminder_time || '')
        setReminderRepeatType(reminder.repeat_type || 'none')
        setReminderNotes(reminder.notes || '')
        setReminderColor(reminder.color || (reminder.type === 'Thu' ? 'green' : 'red'))
        setReminderEnableNotification(reminder.enable_notification !== undefined ? reminder.enable_notification : true)
      }
    } else if (isOpen && !editingItem) {
      // Reset form for new item
      setItemType('task')
      setTaskTitle('')
      setTaskDescription('')
      setTaskStatus('pending')
      setTaskPriority('medium')
      setTaskDeadline(defaultDate || null)
      setTaskProgress(0)
      setTaskTags([])
      setTaskTagInput('')
      setTaskColor('#3B82F6')
      setTaskSubtasks([])
      setTaskSubtaskInput('')
      // Reset voice recognition states
      voiceInput.reset()

      setReminderType('Chi')
      setReminderTitle('')
      setReminderAmount('')
      setReminderCategoryId('')
      setReminderWalletId(defaultWalletId || '')
      setReminderIconId('')
      if (defaultDate) {
        setTaskDeadline(`${defaultDate}T00:00:00+07:00`)
        setReminderDate(defaultDate)
      } else {
        const today = getNowUTC7()
        const todayStr = formatDateUTC7(today)
        setReminderDate(todayStr)
        setTaskDeadline(`${todayStr}T00:00:00+07:00`)
      }
      setReminderTime('')
      setReminderRepeatType('none')
      setReminderNotes('')
      setReminderColor('red')
      setReminderEnableNotification(true)
      setSelectedIcon(null)
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingItem, defaultDate, defaultWalletId])

  // Load icon when icon_id changes
  useEffect(() => {
    const loadIcon = async () => {
      if (!reminderIconId || !isOpen) {
        setSelectedIcon(null)
        return
      }

      try {
        const { getIconById } = await import('../../lib/iconService')
        const icon = await getIconById(reminderIconId)

        if (!icon) {
          setSelectedIcon(null)
          return
        }

        if (icon.image_url) {
          setSelectedIcon(
            <img
              src={icon.image_url}
              alt={icon.label || 'Icon'}
              className="h-full w-full object-contain"
              onError={() => setSelectedIcon(null)}
            />
          )
        } else if (icon.icon_type === 'react-icon' && icon.react_icon_name && icon.react_icon_library) {
          try {
            const { getCachedIconLibrary } = await import('../../utils/iconLoader')
            const library = await getCachedIconLibrary(icon.react_icon_library)
            if (library && library[icon.react_icon_name]) {
              const IconComponent = library[icon.react_icon_name]
              setSelectedIcon(<IconComponent className="h-full w-full" />)
            } else {
              setSelectedIcon(null)
            }
          } catch {
            setSelectedIcon(null)
          }
        } else {
          setSelectedIcon(null)
        }
      } catch (error) {
        if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
          console.error('Error loading icon:', error)
        }
        setSelectedIcon(null)
      }
    }

    loadIcon()
  }, [reminderIconId, isOpen])

  // Auto-calculate progress for tasks
  useEffect(() => {
    if (itemType === 'task' && taskSubtasks.length > 0) {
      const completedCount = taskSubtasks.filter(s => s.completed).length
      const newProgress = Math.round((completedCount / taskSubtasks.length) * 100)
      setTaskProgress(newProgress)

      if (newProgress === 100) setTaskStatus('completed')
      else if (newProgress > 0) setTaskStatus('in_progress')
      else setTaskStatus('pending')
    }
  }, [taskSubtasks, itemType])

  // Filter categories by type
  const filteredCategories = categories.filter((cat) => {
    const categoryType = cat.type === 'Chi tiêu' ? 'Chi tiêu' : 'Thu nhập'
    return reminderType === 'Chi' ? categoryType === 'Chi tiêu' : categoryType === 'Thu nhập'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (itemType === 'task') {
      if (!taskTitle.trim()) {
        setError('Vui lòng nhập tiêu đề công việc')
        return
      }

      setIsSubmitting(true)
      try {
        const taskData: TaskInsert = {
          title: taskTitle.trim(),
          description: taskDescription.trim() || undefined,
          status: taskStatus,
          priority: taskPriority,
          deadline: taskDeadline,
          progress: taskProgress,
          tags: taskTags.length > 0 ? taskTags : undefined,
          color: taskColor,
          subtasks: taskSubtasks.length > 0 ? taskSubtasks : undefined,
        }

        if (editingItem?.task) {
          await updateTask(editingItem.task.id, taskData)
          success('Đã cập nhật công việc thành công!')
        } else {
          await createTask(taskData)
          success('Đã tạo công việc thành công!')
        }

        onSuccess?.()
        onClose()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể lưu công việc'
        setError(message)
        showError(message)
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Reminder or Note
      if (!reminderTitle.trim()) {
        setError(itemType === 'note' ? 'Vui lòng nhập tiêu đề ghi chú' : 'Vui lòng nhập mô tả nhắc nhở')
        return
      }
      if (!reminderDate) {
        setError('Vui lòng chọn ngày')
        return
      }

      setIsSubmitting(true)
      try {
        const reminderData: ReminderInsert = {
          type: itemType === 'note' ? 'Chi' : reminderType,
          title: reminderTitle.trim(),
          reminder_date: reminderDate,
          repeat_type: reminderRepeatType,
        }

        if (reminderAmount) {
          try {
            const amount = parseVNDInput(reminderAmount)
            if (amount > 0) {
              reminderData.amount = amount
            }
          } catch {
            // Continue without amount
          }
        }

        if (reminderCategoryId) {
          reminderData.category_id = reminderCategoryId
        }

        if (reminderWalletId) {
          reminderData.wallet_id = reminderWalletId
        }

        if (reminderIconId) {
          reminderData.icon_id = reminderIconId
        }

        if (reminderTime) {
          reminderData.reminder_time = reminderTime
        }

        if (reminderNotes.trim()) {
          reminderData.notes = reminderNotes.trim()
        }

        reminderData.color = reminderColor
        reminderData.enable_notification = reminderEnableNotification

        if (editingItem?.reminder) {
          await updateReminder(editingItem.reminder.id, reminderData)
          success(itemType === 'note' ? 'Đã cập nhật ghi chú thành công!' : 'Đã cập nhật nhắc nhở thành công!')
        } else {
          await createReminder(reminderData)
          success(itemType === 'note' ? 'Đã tạo ghi chú thành công!' : 'Đã tạo nhắc nhở thành công!')
        }

        onSuccess?.()
        onClose()
      } catch (err) {
        const message = err instanceof Error ? err.message : `Không thể lưu ${itemType === 'note' ? 'ghi chú' : 'nhắc nhở'}`
        setError(message)
        showError(message)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const isEditMode = !!editingItem
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

  const handleTagAdd = () => {
    const value = taskTagInput.trim()
    if (value && !taskTags.includes(value)) {
      setTaskTags([...taskTags, value])
      setTaskTagInput('')
    }
  }

  const handleSubtaskAdd = () => {
    const value = taskSubtaskInput.trim()
    if (value) {
      const newSubtask: Subtask = {
        id: generateId(),
        title: value,
        completed: false
      }
      setTaskSubtasks([...taskSubtasks, newSubtask])
      setTaskSubtaskInput('')
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-[60] flex flex-col bg-[#F7F9FC] rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none safe-area-bottom pointer-events-auto">
      {/* Mobile Handle */}
      <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-10 w-full mb-1">
        <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
      </div>

      {/* Enhanced Header with gradient */}
      <header className="pointer-events-none relative z-10 flex-shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/50 shadow-sm">
        <div className="relative px-1 py-2">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
              aria-label="Đóng"
            >
              <FaArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <p className="flex-1 px-4 text-center text-base font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
              {isEditMode ? 'Sửa' : 'Thêm'} {itemType === 'task' ? 'công việc' : itemType === 'note' ? 'ghi chú' : 'kế hoạch'}
            </p>
            <div className="flex items-center justify-center">
              <button
                type="submit"
                form="unified-item-form"
                disabled={isSubmitting}
                className={`rounded-3xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all whitespace-nowrap min-w-fit disabled:opacity-50 disabled:cursor-not-allowed ${itemType === 'task'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:scale-105 active:scale-95'
                  : itemType === 'note'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 hover:shadow-xl hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
              >
                {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Tabs with gradients */}
      {!isEditMode && (
        <div className="flex p-1.5 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-200/50">
          <button
            type="button"
            onClick={() => setItemType('task')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${itemType === 'task'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 scale-105 border border-indigo-300'
              : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
          >
            Công việc
          </button>
          <button
            type="button"
            onClick={() => setItemType('reminder')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${itemType === 'reminder'
              ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-500/30 scale-105 border border-green-300'
              : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
          >
            Kế hoạch
          </button>
          <button
            type="button"
            onClick={() => setItemType('note')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${itemType === 'note'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105 border border-amber-300'
              : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
              }`}
          >
            Ghi chú
          </button>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-h-0">
        <div className="mx-auto max-w-md">
          {error && (
            <div className="mb-4 rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 p-4 text-sm font-medium text-red-700 shadow-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
                <span className="flex-1">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} id="unified-item-form" className="space-y-4">
            {itemType === 'task' ? (
              <>
                {/* Task Form */}
                {/* Title - Common field for all tabs */}
                <div>
                  <label htmlFor="task-title" className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="task-title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Nhập tiêu đề công việc..."
                      className="w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pr-12 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg sm:p-4 sm:pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={voiceInput.isListening('taskTitle') ? voiceInput.stopListening : () => voiceInput.startListening('taskTitle')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all ${voiceInput.isListening('taskTitle')
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95'
                        }`}
                      title={voiceInput.isListening('taskTitle') ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói'}
                    >
                      <FaMicrophone className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description - Common field for all tabs */}
                <div>
                  <label htmlFor="task-description" className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Mô tả (tùy chọn)
                  </label>
                  <div className="relative">
                    <textarea
                      id="task-description"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Nhập mô tả công việc..."
                      rows={3}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pr-12 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg sm:p-4 sm:pr-12 resize-none"
                    />
                    <button
                      type="button"
                      onClick={voiceInput.isListening('taskDescription') ? voiceInput.stopListening : () => voiceInput.startListening('taskDescription')}
                      className={`absolute right-3 top-3 rounded-full p-2 transition-all ${voiceInput.isListening('taskDescription')
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95'
                        }`}
                      title={voiceInput.isListening('taskDescription') ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói'}
                    >
                      <FaMicrophone className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Subtasks - Task specific field */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Công việc phụ
                  </label>
                  <div className="space-y-2">
                    {taskSubtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 hover:border-indigo-300 transition-all">
                        <button
                          type="button"
                          onClick={() => setTaskSubtasks(taskSubtasks.map(s => s.id === subtask.id ? { ...s, completed: !s.completed } : s))}
                          className={`flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${subtask.completed ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                        >
                          {subtask.completed ? <FaCheckSquare className="h-5 w-5" /> : <FaSquare className="h-5 w-5" />}
                        </button>
                        <span className={`flex-1 text-sm font-medium truncate ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {subtask.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTaskSubtasks(taskSubtasks.filter(s => s.id !== subtask.id))}
                          className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-50"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={taskSubtaskInput}
                          onChange={(e) => setTaskSubtaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleSubtaskAdd()
                            }
                          }}
                          placeholder="Thêm công việc phụ..."
                          className="w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 pr-12 text-sm font-medium text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={voiceInput.isListening('taskSubtask') ? voiceInput.stopListening : () => voiceInput.startListening('taskSubtask')}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-all ${voiceInput.isListening('taskSubtask')
                            ? 'bg-red-100 text-red-600 animate-pulse'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95'
                            }`}
                          title={voiceInput.isListening('taskSubtask') ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói'}
                        >
                          <FaMicrophone className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubtaskAdd}
                        className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 text-white shadow-md hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        <FaPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color Picker - Common field, positioned before settings */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Màu sắc
                  </label>
                  <div className="flex flex-wrap gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/50">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTaskColor(c)}
                        className={`h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg ${taskColor === c
                          ? 'ring-3 ring-offset-2 ring-indigo-400 scale-110 shadow-lg'
                          : 'hover:scale-105'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Status and Priority - Task specific fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Trạng thái
                    </label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                      disabled={taskSubtasks.length > 0}
                      className={`w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-sm font-medium text-slate-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg sm:p-4 min-h-[56px] appearance-none bg-no-repeat bg-right pr-10 ${taskSubtasks.length > 0 ? 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-60' : 'hover:border-indigo-300'
                        }`}
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1.5em 1.5em'
                      }}
                    >
                      <option value="pending">Chờ</option>
                      <option value="in_progress">Đang làm</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Độ ưu tiên
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-sm font-medium text-slate-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg hover:border-indigo-300 sm:p-4 min-h-[56px] appearance-none bg-no-repeat bg-right pr-10"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                        backgroundPosition: 'right 1rem center',
                        backgroundSize: '1.5em 1.5em'
                      }}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                {/* Deadline - Date field for task */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Deadline (tùy chọn)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTaskDateTimePickerOpen(true)}
                      className="relative flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pl-12 pr-12 text-left transition-all hover:border-indigo-300 hover:shadow-md focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg sm:p-4"
                    >
                      <FaCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500" />
                      <span className="text-sm font-medium text-slate-900">
                        {taskDeadline ? (() => {
                          const [year, month, day] = taskDeadline.split('-')
                          return `${day}/${month}/${year}`
                        })() : 'Chọn deadline'}
                      </span>
                      <FaChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                    {taskDeadline && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTaskDeadline(null)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
                        aria-label="Xóa deadline"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress - Task specific field */}
                <div>
                  <label htmlFor="task-progress" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Tiến độ: <span className="font-bold text-indigo-600">{taskProgress}%</span> {taskSubtasks.length > 0 && <span className="text-slate-500 text-xs">(Tự động tính)</span>}
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100">
                    <FaChartLine className={`h-5 w-5 shrink-0 ${taskSubtasks.length > 0 ? 'text-slate-300' : 'text-indigo-500'}`} />
                    <input
                      type="range"
                      id="task-progress"
                      min="0"
                      max="100"
                      value={taskProgress}
                      onChange={(e) => setTaskProgress(parseInt(e.target.value))}
                      disabled={taskSubtasks.length > 0}
                      className={`flex-1 h-3 rounded-full appearance-none transition-all ${taskSubtasks.length > 0
                        ? 'bg-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-slate-200 cursor-pointer accent-indigo-600 hover:accent-indigo-700'
                        }`}
                    />
                    <span className={`text-sm font-bold w-14 text-right shrink-0 ${taskSubtasks.length > 0 ? 'text-slate-400' : 'text-indigo-600'
                      }`}>{taskProgress}%</span>
                  </div>
                </div>

                {/* Tags - Task specific field */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Tags (tùy chọn)
                  </label>
                  <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:shadow-lg">
                    {taskTags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {taskTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setTaskTags(taskTags.filter(t => t !== tag))}
                              className="hover:text-indigo-900 transition-colors rounded-full p-0.5 hover:bg-indigo-200"
                            >
                              <FaTimes className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={taskTagInput}
                        onChange={(e) => setTaskTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleTagAdd()
                          }
                        }}
                        placeholder="Nhập tag và nhấn Enter..."
                        className="flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleTagAdd}
                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Reminder/Note Form */}
                {/* Reminder Type Selector - Only for reminder, positioned at top */}
                {itemType === 'reminder' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Loại giao dịch
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReminderType('Thu')}
                        className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-center text-sm font-bold transition-all duration-300 sm:py-3.5 sm:text-base ${reminderType === 'Thu'
                          ? 'border-green-500 bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105'
                          : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-green-300 hover:from-green-50 hover:to-green-100 hover:text-green-700 hover:shadow-md hover:scale-[1.02]'
                          } active:scale-95`}
                      >
                        <FaArrowUp className={`relative z-10 h-5 w-5 transition-transform ${reminderType === 'Thu' ? 'scale-110 drop-shadow-md' : ''} sm:h-6 sm:w-6`} />
                        <span className="relative z-10">Thu nhập</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReminderType('Chi')}
                        className={`group relative flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-center text-sm font-bold transition-all duration-300 sm:py-3.5 sm:text-base ${reminderType === 'Chi'
                          ? 'border-red-500 bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105'
                          : 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 hover:border-red-300 hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:shadow-md hover:scale-[1.02]'
                          } active:scale-95`}
                      >
                        <FaArrowDown className={`relative z-10 h-5 w-5 transition-transform ${reminderType === 'Chi' ? 'scale-110 drop-shadow-md' : ''} sm:h-6 sm:w-6`} />
                        <span className="relative z-10">Chi tiêu</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Title - Common field for reminder/note (same position as task) */}
                <div>
                  <label htmlFor="reminder-title" className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    {itemType === 'note' ? 'Tiêu đề ghi chú' : 'Mô tả nhắc nhở'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="reminder-title"
                      value={reminderTitle}
                      onChange={(e) => setReminderTitle(e.target.value)}
                      placeholder={itemType === 'note' ? 'Nhập tiêu đề ghi chú...' : 'Nhập mô tả nhắc nhở...'}
                      className={`w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pr-12 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:shadow-lg sm:p-4 sm:pr-12 ${itemType === 'note'
                        ? 'focus:border-amber-400 focus:ring-amber-500/20'
                        : 'focus:border-green-400 focus:ring-green-500/20'
                        }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={voiceInput.isListening('reminderTitle') ? voiceInput.stopListening : () => voiceInput.startListening('reminderTitle')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 transition-all ${voiceInput.isListening('reminderTitle')
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : itemType === 'note'
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-110 active:scale-95'
                          : 'bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 active:scale-95'
                        }`}
                      title={voiceInput.isListening('reminderTitle') ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói'}
                    >
                      <FaMicrophone className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {itemType === 'reminder' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reminder-amount" className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                          Số tiền (tùy chọn)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            id="reminder-amount"
                            value={reminderAmount}
                            onChange={(e) => {
                              const formatted = formatVNDInput(e.target.value)
                              setReminderAmount(formatted)
                            }}
                            onFocus={() => setIsNumberPadOpen(true)}
                            placeholder="Nhập số tiền"
                            className="h-full w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-base font-semibold text-slate-900 transition-all placeholder:text-slate-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:shadow-lg sm:p-4 sm:text-lg cursor-pointer hover:border-green-300"
                            readOnly
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-green-600">
                            ₫
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                          Hạng mục (tùy chọn)
                        </label>
                        <CustomSelect
                          options={filteredCategories.map((category) => ({
                            value: category.id,
                            label: category.name,
                            icon: categoryIcons[category.id] || undefined,
                          }))}
                          value={reminderCategoryId}
                          onChange={(value) => setReminderCategoryId(value)}
                          placeholder="Chọn hạng mục"
                          loading={isLoading}
                          emptyMessage="Chưa có hạng mục"
                          className=""
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                        Ví (tùy chọn)
                      </label>
                      <CustomSelect
                        options={wallets.map((wallet) => ({
                          value: wallet.id,
                          label: wallet.name,
                          metadata: formatVNDInput(wallet.balance.toString()),
                        }))}
                        value={reminderWalletId}
                        onChange={(value) => setReminderWalletId(value)}
                        placeholder="Chọn ví"
                        loading={isLoading}
                        emptyMessage="Chưa có ví"
                        className=""
                      />
                    </div>
                  </>
                )}

                {/* Date/Time - Common field for reminder/note (same position as deadline for task) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Ngày và giờ <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDateTimePickerOpen(true)}
                    className={`relative flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pl-12 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:shadow-lg ${itemType === 'note'
                      ? 'hover:border-amber-300 focus:border-amber-400 focus:ring-amber-500/20'
                      : 'hover:border-green-300 focus:border-green-400 focus:ring-green-500/20'
                      }`}
                  >
                    <FaCalendar className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${itemType === 'note' ? 'text-amber-500' : 'text-green-500'
                      }`} />
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 truncate">
                        {(() => {
                          try {
                            const date = new Date(reminderDate)
                            if (isNaN(date.getTime())) {
                              return 'Chưa chọn ngày'
                            }
                            const day = String(date.getDate()).padStart(2, '0')
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const year = date.getFullYear()
                            const dateStr = `${day}/${month}/${year}`

                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const selectedDate = new Date(date)
                            selectedDate.setHours(0, 0, 0, 0)

                            if (selectedDate.getTime() === today.getTime()) {
                              return `Hôm nay - ${dateStr}`
                            }
                            return dateStr
                          } catch {
                            return 'Chưa chọn ngày'
                          }
                        })()}
                      </div>
                      {reminderTime && (
                        <>
                          <FaClock className={`h-4 w-4 shrink-0 ${itemType === 'note' ? 'text-amber-400' : 'text-green-400'
                            }`} />
                          <span className="text-sm font-medium text-slate-900 truncate">{reminderTime}</span>
                        </>
                      )}
                    </div>
                    <FaChevronDown className={`h-4 w-4 shrink-0 text-slate-400 ml-2`} />
                  </button>
                </div>

                {/* Repeat Type - Only for reminder */}
                {itemType === 'reminder' && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Lặp lại
                    </label>
                    <CustomSelect
                      options={REPEAT_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={reminderRepeatType}
                      onChange={(value) => setReminderRepeatType(value as RepeatType)}
                      placeholder="Chọn tần suất"
                      className=""
                    />
                  </div>
                )}

                {/* Notes/Description - Common field for reminder/note (same position as task description) */}
                <div>
                  <label htmlFor="reminder-notes" className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    {itemType === 'note' ? 'Nội dung ghi chú (tùy chọn)' : 'Ghi chú (tùy chọn)'}
                  </label>
                  <div className="relative">
                    <textarea
                      id="reminder-notes"
                      value={reminderNotes}
                      onChange={(e) => setReminderNotes(e.target.value)}
                      placeholder={itemType === 'note' ? 'Nhập nội dung chi tiết...' : 'Nhập ghi chú...'}
                      rows={itemType === 'note' ? 4 : 3}
                      className={`w-full rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pr-12 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:shadow-lg sm:p-4 sm:pr-12 resize-none ${itemType === 'note'
                        ? 'focus:border-amber-400 focus:ring-amber-500/20'
                        : 'focus:border-green-400 focus:ring-green-500/20'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={voiceInput.isListening('reminderNotes') ? voiceInput.stopListening : () => voiceInput.startListening('reminderNotes')}
                      className={`absolute right-3 top-3 rounded-full p-2 transition-all ${voiceInput.isListening('reminderNotes')
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : itemType === 'note'
                          ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:scale-110 active:scale-95'
                          : 'bg-green-50 text-green-600 hover:bg-green-100 hover:scale-110 active:scale-95'
                        }`}
                      title={voiceInput.isListening('reminderNotes') ? 'Dừng nhận diện giọng nói' : 'Nhập bằng giọng nói'}
                    >
                      <FaMicrophone className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Icon Picker - Common field, positioned after color (same as task) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Biểu tượng (tùy chọn)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsIconPickerOpen(true)}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 pr-12 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:shadow-lg sm:p-4 ${itemType === 'note'
                        ? 'hover:border-amber-300 focus:border-amber-400 focus:ring-amber-500/20'
                        : 'hover:border-green-300 focus:border-green-400 focus:ring-green-500/20'
                        }`}
                    >
                      {selectedIcon ? (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${itemType === 'note' ? 'from-amber-50 to-orange-50' : 'from-green-50 to-teal-50'
                          } border-2 ${itemType === 'note' ? 'border-amber-200' : 'border-green-200'
                          }`}>
                          {selectedIcon}
                        </div>
                      ) : (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${itemType === 'note' ? 'from-amber-100 to-orange-100' : 'from-green-100 to-teal-100'
                          } border-2 ${itemType === 'note' ? 'border-amber-200 text-amber-500' : 'border-green-200 text-green-500'
                          }`}>
                          <span className="text-lg font-bold">?</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-900 truncate block">
                          {reminderIconId ? 'Đã chọn biểu tượng' : 'Chọn biểu tượng'}
                        </span>
                      </div>
                      <FaChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                    {reminderIconId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setReminderIconId('')
                          setSelectedIcon(null)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                        aria-label="Xóa biểu tượng"
                      >
                        <FaTimes className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Color Picker - Common field, positioned before settings (same as task) */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Màu sắc
                  </label>
                  <div className={`flex flex-wrap gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/50 ${itemType === 'note' ? 'focus-within:border-amber-300' : 'focus-within:border-green-300'
                    }`}>
                    {PRESET_COLORS.map((hexColor) => {
                      const colorName = HEX_TO_REMINDER_COLOR[hexColor] || 'amber'
                      // Check if this color is selected
                      const currentHex = REMINDER_COLOR_TO_HEX[reminderColor] || '#EF4444'
                      const isSelected = hexColor === currentHex

                      return (
                        <button
                          key={hexColor}
                          type="button"
                          onClick={() => setReminderColor(colorName)}
                          className={`h-10 w-10 rounded-full transition-all shadow-md hover:shadow-lg ${isSelected
                            ? `ring-3 ring-offset-2 scale-110 shadow-lg ${itemType === 'note' ? 'ring-amber-400' : 'ring-green-400'
                            }`
                            : 'hover:scale-105'
                            }`}
                          style={{ backgroundColor: hexColor }}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Notification Toggle - Only for reminder/note, positioned at end */}
                <div className={`flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition-all hover:shadow-md ${itemType === 'note'
                  ? 'focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-500/20'
                  : 'focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-500/20'
                  }`}>
                  <div className="flex-1">
                    <label htmlFor="enable_notification" className="text-sm font-semibold text-slate-900 block">
                      Bật thông báo
                    </label>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Nhận thông báo khi đến giờ nhắc nhở
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReminderEnableNotification(!reminderEnableNotification)}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 shadow-inner ${reminderEnableNotification
                      ? `bg-gradient-to-r shadow-lg ${itemType === 'note'
                        ? 'from-amber-400 to-orange-500'
                        : 'from-green-400 to-teal-500'
                      }`
                      : 'bg-slate-300'
                      }`}
                    aria-label={reminderEnableNotification ? 'Tắt thông báo' : 'Bật thông báo'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md ${reminderEnableNotification ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Modals */}
      <IconPicker
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconId) => {
          setReminderIconId(iconId)
          setIsIconPickerOpen(false)
        }}
        selectedIconId={reminderIconId}
      />

      <DateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setReminderDate(date)
          setReminderTime(time || '')
        }}
        initialDate={reminderDate}
        initialTime={reminderTime}
        showTime={true}
      />

      <DateTimePickerModal
        isOpen={isTaskDateTimePickerOpen}
        onClose={() => setIsTaskDateTimePickerOpen(false)}
        onConfirm={(date) => {
          setTaskDeadline(date)
          setIsTaskDateTimePickerOpen(false)
        }}
        initialDate={taskDeadline || undefined}
        showTime={false}
      />

      <NumberPadModal
        isOpen={isNumberPadOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={reminderAmount}
        onChange={(value) => setReminderAmount(value)}
        onConfirm={() => setIsNumberPadOpen(false)}
      />
    </div>
  )
}


