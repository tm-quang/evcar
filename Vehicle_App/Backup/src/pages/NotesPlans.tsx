import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSearch, FaPlus, FaCheck, FaTimes, FaEdit, FaTrash, FaBell, FaListUl, FaCalendar, FaClock, FaHistory, FaDownload } from 'react-icons/fa'
import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { PlanCalendar } from '../components/dashboard/PlanCalendar'
import { PlanDayModal } from '../components/dashboard/PlanDayModal'
import { UnifiedItemModal } from '../components/notesPlans/UnifiedItemModal'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { LoadingRing } from '../components/ui/LoadingRing'
import {
  fetchTasks,
  deleteTask,
  updateTask,
  type TaskRecord,
} from '../lib/taskService'
import {
  fetchReminders,
  deleteReminder,
  completeReminder,
  skipReminder,
  type ReminderRecord,
} from '../lib/reminderService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { formatDateUTC7, getNowUTC7 } from '../utils/dateUtils'
import { formatVNDDisplay } from '../utils/currencyInput'
import { exportHistoryToCSV } from '../utils/exportCSV'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNode } from '../utils/iconLoader'
import { requestNotificationPermission } from '../lib/notificationService'
import { startPeriodicReminderCheck, checkRemindersAndNotify } from '../lib/serviceWorkerManager'

type ItemType = 'task' | 'reminder' | 'note'
type EditingItem = {
  type: ItemType
  task?: TaskRecord
  reminder?: ReminderRecord
}

const NotesPlansPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [reminderIcons, setReminderIcons] = useState<Record<string, React.ReactNode>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(getNowUTC7())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(formatDateUTC7(getNowUTC7()))
  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false)
  const [modalAnchorPosition, setModalAnchorPosition] = useState<{ top: number; left: number } | undefined>()
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<TaskRecord | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: ItemType; item: TaskRecord | ReminderRecord } | null>(null)
  const [disableRipple, setDisableRipple] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'reminders' | 'notes' | 'history'>('all')
  const [allTasks, setAllTasks] = useState<TaskRecord[]>([])
  const [allReminders, setAllReminders] = useState<ReminderRecord[]>([])

  useEffect(() => {
    loadData()
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    if (reminders.length === 0) return
    startPeriodicReminderCheck()
    checkRemindersAndNotify().catch(console.error)
    return () => { }
  }, [reminders.length])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [tasksData, remindersData, allTasksData, allRemindersData, categoriesData, walletsData] = await Promise.allSettled([
        fetchTasks(),
        fetchReminders({ is_active: true }),
        fetchTasks(), // Load all tasks for history
        fetchReminders(), // Load all reminders (including completed) for history
        fetchCategories(),
        fetchWallets(false),
      ])

      if (tasksData.status === 'fulfilled') {
        const activeTasks = tasksData.value.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        setTasks(activeTasks)
      }
      if (remindersData.status === 'fulfilled') {
        setReminders(remindersData.value)
      }
      if (allTasksData.status === 'fulfilled') {
        setAllTasks(allTasksData.value)
      }
      if (allRemindersData.status === 'fulfilled') {
        setAllReminders(allRemindersData.value)
      }
      if (categoriesData.status === 'fulfilled') {
        setCategories(categoriesData.value)
      }
      if (walletsData.status === 'fulfilled') {
        setWallets(walletsData.value)
      }

      // Load icons
      if (categoriesData.status === 'fulfilled' && categoriesData.value.length > 0) {
        const iconsMap: Record<string, React.ReactNode> = {}
        const iconPromises = categoriesData.value.map(async (category) => {
          try {
            const iconNode = await getIconNode(category.icon_id)
            if (iconNode) {
              return { categoryId: category.id, iconNode: <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span> }
            } else {
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                return { categoryId: category.id, iconNode: <IconComponent className="h-14 w-14" /> }
              }
            }
          } catch (error) {
            const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              return { categoryId: category.id, iconNode: <IconComponent className="h-14 w-14" /> }
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

      // Load reminder icons
      if (remindersData.status === 'fulfilled') {
        const reminderIconsMap: Record<string, React.ReactNode> = {}
        const remindersWithIcons = remindersData.value.filter(r => r.icon_id)
        if (remindersWithIcons.length > 0) {
          const reminderIconPromises = remindersWithIcons.map(async (reminder) => {
            try {
              const iconNode = await getIconNode(reminder.icon_id!)
              if (iconNode) {
                return { reminderId: reminder.id, iconNode: <span className="h-full w-full flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span> }
              }
            } catch (error) {
              // Silent fail
            }
            return null
          })

          const reminderIconResults = await Promise.allSettled(reminderIconPromises)
          reminderIconResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              reminderIconsMap[result.value.reminderId] = result.value.iconNode
            }
          })
          setReminderIcons(reminderIconsMap)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      showError('Không thể tải dữ liệu.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setEditingItem(null)
    const dateStr = formatDateUTC7(selectedDate)
    setSelectedCalendarDate(dateStr)
    setIsUnifiedModalOpen(true)
  }

  const handleDateClick = (date: string) => {
    const dateObj = new Date(date + 'T00:00:00+07:00')
    setSelectedDate(dateObj)
    setSelectedCalendarDate(date)
  }

  const handleDateWithItemsClick = (date: string, position?: { top: number; left: number }) => {
    const dateObj = new Date(date + 'T00:00:00+07:00')
    setSelectedDate(dateObj)
    setSelectedCalendarDate(date)
    setModalAnchorPosition(position)
    setIsPlanDayModalOpen(true)
  }

  // handleEditTask removed - tasks are edited via TaskDetailModal

  const handleEditReminder = (reminder: ReminderRecord) => {
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    setEditingItem({ type: isNote ? 'note' : 'reminder', reminder })
    setIsUnifiedModalOpen(true)
  }

  const handleDelete = (type: ItemType, item: TaskRecord | ReminderRecord) => {
    setItemToDelete({ type, item })
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      if (itemToDelete.type === 'task') {
        await deleteTask((itemToDelete.item as TaskRecord).id)
        success('Đã xóa công việc thành công!')
      } else {
        await deleteReminder((itemToDelete.item as ReminderRecord).id)
        success('Đã xóa nhắc nhở thành công!')
      }
      await loadData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không thể xóa mục này.')
    } finally {
      setIsDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const handleCompleteReminder = async (reminder: ReminderRecord) => {
    try {
      await completeReminder(reminder.id)
      success('Đã đánh dấu hoàn thành!')
      await loadData()
    } catch {
      showError('Không thể cập nhật nhắc nhở.')
    }
  }

  const handleSkipReminder = async (reminder: ReminderRecord) => {
    try {
      await skipReminder(reminder.id)
      success('Đã bỏ qua nhắc nhở!')
      await loadData()
    } catch {
      showError('Không thể cập nhật nhắc nhở.')
    }
  }

  const handleCreateTransaction = (reminder: ReminderRecord) => {
    navigate(`/add-transaction?type=${reminder.type}&reminderId=${reminder.id}`)
  }

  // Filter items by selected date
  const selectedDateStr = formatDateUTC7(selectedDate)
  const dateItems = useMemo(() => {
    const dateTasks = tasks.filter(t => !t.deadline || t.deadline.startsWith(selectedDateStr))
    const dateReminders = reminders.filter(r => r.reminder_date === selectedDateStr && !r.completed_at)
    return { tasks: dateTasks, reminders: dateReminders }
  }, [tasks, reminders, selectedDateStr])

  // Filter by search and tab
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    let filteredTasks = tasks
    let filteredReminders = reminders.filter(r => !r.completed_at)

    // Apply date filter
    filteredTasks = filteredTasks.filter(t => !t.deadline || t.deadline.startsWith(selectedDateStr))
    filteredReminders = filteredReminders.filter(r => r.reminder_date === selectedDateStr)

    // Apply search filter
    if (term) {
      filteredTasks = filteredTasks.filter(t => {
        return t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.tags?.some(tag => tag.toLowerCase().includes(term))
      })

      filteredReminders = filteredReminders.filter(r => {
        return r.title?.toLowerCase().includes(term) ||
          r.notes?.toLowerCase().includes(term) ||
          (r.category_id && categories.find(c => c.id === r.category_id)?.name?.toLowerCase().includes(term)) ||
          (r.wallet_id && wallets.find(w => w.id === r.wallet_id)?.name?.toLowerCase().includes(term))
      })
    }

    // Apply tab filter
    if (activeTab === 'tasks') {
      filteredReminders = []
    } else if (activeTab === 'reminders') {
      filteredTasks = []
      filteredReminders = filteredReminders.filter(r => r.amount || r.category_id || r.wallet_id)
    } else if (activeTab === 'notes') {
      filteredTasks = []
      filteredReminders = filteredReminders.filter(r => !r.amount && !r.category_id && !r.wallet_id)
    }

    return { tasks: filteredTasks, reminders: filteredReminders }
  }, [tasks, reminders, selectedDateStr, searchTerm, activeTab, categories, wallets])

  // Filter history items (all tasks and reminders including completed)
  const historyItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    let historyTasks = [...allTasks]
    let historyReminders = [...allReminders]

    // Apply search filter
    if (term) {
      historyTasks = historyTasks.filter(t => {
        return t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.tags?.some(tag => tag.toLowerCase().includes(term))
      })

      historyReminders = historyReminders.filter(r => {
        return r.title?.toLowerCase().includes(term) ||
          r.notes?.toLowerCase().includes(term) ||
          (r.category_id && categories.find(c => c.id === r.category_id)?.name?.toLowerCase().includes(term)) ||
          (r.wallet_id && wallets.find(w => w.id === r.wallet_id)?.name?.toLowerCase().includes(term))
      })
    }

    // Sort by created_at descending (newest first)
    historyTasks.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    historyReminders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return { tasks: historyTasks, reminders: historyReminders }
  }, [allTasks, allReminders, searchTerm, categories, wallets])

  const formatSelectedDate = (date: Date) => {
    const today = getNowUTC7()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const selected = new Date(date)
    selected.setHours(0, 0, 0, 0)

    if (selected.getTime() === today.getTime()) {
      return 'Hôm nay'
    } else if (selected.getTime() === yesterday.getTime()) {
      return 'Hôm qua'
    } else if (selected.getTime() === tomorrow.getTime()) {
      return 'Ngày mai'
    } else {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    }
  }

  const getCategoryInfo = (categoryId: string | null) => {
    if (!categoryId) return { name: null, icon: null }
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: null, icon: null }
    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
    }
  }

  const getWalletName = (walletId: string | null) => {
    if (!walletId) return null
    const wallet = wallets.find((w) => w.id === walletId)
    return wallet?.name || null
  }

  const getReminderColor = (reminder: ReminderRecord) => {
    if (reminder.color) return reminder.color
    const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
    return isNote ? 'amber' : reminder.type === 'Thu' ? 'green' : 'red'
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; icon: string; dot: string; shadow: string }> = {
      amber: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', border: 'border-amber-200/60', icon: 'bg-gradient-to-br from-amber-400 to-amber-500', dot: 'bg-amber-500', shadow: 'shadow-amber-100/50' },
      green: { bg: 'bg-gradient-to-br from-green-50 to-green-50', border: 'border-green-200/60', icon: 'bg-gradient-to-br from-green-400 to-green-500', dot: 'bg-green-500', shadow: 'shadow-green-100/50' },
      red: { bg: 'bg-gradient-to-br from-red-50 to-pink-50', border: 'border-red-200/60', icon: 'bg-gradient-to-br from-red-400 to-red-500', dot: 'bg-red-500', shadow: 'shadow-red-100/50' },
      sky: { bg: 'bg-gradient-to-br from-sky-50 to-blue-50', border: 'border-sky-200/60', icon: 'bg-gradient-to-br from-sky-400 to-sky-500', dot: 'bg-sky-500', shadow: 'shadow-sky-100/50' },
      blue: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', border: 'border-blue-200/60', icon: 'bg-gradient-to-br from-blue-400 to-blue-500', dot: 'bg-blue-500', shadow: 'shadow-blue-100/50' },
      purple: { bg: 'bg-gradient-to-br from-purple-50 to-violet-50', border: 'border-purple-200/60', icon: 'bg-gradient-to-br from-purple-400 to-purple-500', dot: 'bg-purple-500', shadow: 'shadow-purple-100/50' },
      indigo: { bg: 'bg-gradient-to-br from-indigo-50 to-blue-50', border: 'border-indigo-200/60', icon: 'bg-gradient-to-br from-indigo-400 to-indigo-500', dot: 'bg-indigo-500', shadow: 'shadow-indigo-100/50' },
      pink: { bg: 'bg-gradient-to-br from-pink-50 to-red-50', border: 'border-pink-200/60', icon: 'bg-gradient-to-br from-pink-400 to-pink-500', dot: 'bg-pink-500', shadow: 'shadow-pink-100/50' },
      orange: { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-200/60', icon: 'bg-gradient-to-br from-orange-400 to-orange-500', dot: 'bg-orange-500', shadow: 'shadow-orange-100/50' },
      teal: { bg: 'bg-gradient-to-br from-teal-50 to-cyan-50', border: 'border-teal-200/60', icon: 'bg-gradient-to-br from-teal-400 to-teal-500', dot: 'bg-teal-500', shadow: 'shadow-teal-100/50' },
    }
    return colorMap[color] || colorMap.amber
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    return `${hours}:${minutes}`
  }

  const dayModalTasks = useMemo(() => {
    return dateItems.tasks.filter(t => t.status !== 'completed')
  }, [dateItems.tasks])

  const dayModalReminders = useMemo(() => {
    return dateItems.reminders
  }, [dateItems.reminders])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title={isSearchOpen ? '' : "GHI CHÚ & KẾ HOẠCH"}
        showIcon={
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 transition hover:scale-110 active:scale-95"
            aria-label="Tìm kiếm"
          >
            <FaSearch className="h-4 w-4 text-slate-600" />
          </button>
        }
        customContent={
          isSearchOpen ? (
            <div className="flex-1 px-4">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm ghi chú, kế hoạch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>
          ) : null
        }
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
          {/* Calendar - Hide when viewing history */}
          {activeTab !== 'history' && (
            <>
              <PlanCalendar
                tasks={tasks}
                reminders={reminders}
                onDateClick={handleDateClick}
                selectedDate={selectedCalendarDate}
                onDateWithItemsClick={handleDateWithItemsClick}
                disableRipple={disableRipple}
              />

              {/* Enhanced Selected Date Header with stats cards */}
              <div className="mb-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
                  {formatSelectedDate(selectedDate)}
                </h2>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-3 shadow-lg shadow-indigo-500/30">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <FaListUl className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80 font-medium">Công việc</p>
                        <p className="text-lg font-bold text-white">{dateItems.tasks.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 p-3 shadow-lg shadow-green-500/30">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <FaBell className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80 font-medium">Nhắc nhở</p>
                        <p className="text-lg font-bold text-white">{dateItems.reminders.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 p-3 shadow-lg shadow-sky-500/30">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <FaCalendar className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80 font-medium">Tổng cộng</p>
                        <p className="text-lg font-bold text-white">{dateItems.tasks.length + dateItems.reminders.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* History Header - Show when viewing history */}
          {activeTab === 'history' && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Lịch sử bản ghi
                </h2>
                <button
                  onClick={() => {
                    try {
                      exportHistoryToCSV(historyItems.tasks, historyItems.reminders)
                      success('Đã xuất file CSV thành công! Bạn có thể mở file và import vào Google Sheets.')
                    } catch (error) {
                      showError('Không thể xuất file. Vui lòng thử lại.')
                      console.error('Export error:', error)
                    }
                  }}
                  disabled={historyItems.tasks.length === 0 && historyItems.reminders.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow-lg transition-all hover:from-teal-600 hover:to-cyan-600 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title="Xuất danh sách lịch sử ra file CSV để import vào Google Sheets"
                >
                  <FaDownload className="h-4 w-4" />
                  <span>Xuất CSV</span>
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-3 shadow-lg shadow-indigo-500/30">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <FaListUl className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/80 font-medium">Công việc</p>
                      <p className="text-lg font-bold text-white">{historyItems.tasks.length}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 p-3 shadow-lg shadow-green-500/30">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <FaBell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/80 font-medium">Kế hoạch</p>
                      <p className="text-lg font-bold text-white">{historyItems.reminders.filter(r => r.amount || r.category_id || r.wallet_id).length}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 shadow-lg shadow-amber-500/30">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <FaBell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/80 font-medium">Ghi chú</p>
                      <p className="text-lg font-bold text-white">{historyItems.reminders.filter(r => !r.amount && !r.category_id && !r.wallet_id).length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Tabs with gradients */}
          <div className="flex p-1 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-2xl shadow-inner border border-slate-200/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'all'
                ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg shadow-blue-500/30 scale-105 border border-blue-300'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'tasks'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 scale-105 border border-indigo-300'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
            >
              Công việc
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'reminders'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-500/30 scale-105 border border-green-300'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
            >
              Kế hoạch
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'notes'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105 border border-amber-300'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
            >
              Ghi chú
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-shrink-0 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === 'history'
                ? 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-lg shadow-slate-500/30 scale-105 border border-slate-300'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                }`}
            >
              <span className="flex items-center gap-1.5">
                <FaHistory className="h-3 w-3" />
                Lịch sử
              </span>
            </button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingRing size="md" />
            </div>
          ) : (
            <>
              {/* Items List - Show history or filtered items based on active tab */}
              {activeTab === 'history' ? (
                (historyItems.tasks.length > 0 || historyItems.reminders.length > 0) ? (
                  <div className="space-y-3">
                    {/* History Tasks */}
                    {historyItems.tasks.map((task) => {
                      const getTaskColorClasses = () => {
                        if (task.status === 'completed') {
                          return {
                            bg: 'bg-gradient-to-br from-green-50 via-green-50 to-green-50',
                            border: 'border-green-200/80',
                            icon: 'bg-gradient-to-br from-green-400 to-green-500',
                            shadow: 'shadow-green-100/50'
                          }
                        } else if (task.status === 'in_progress') {
                          return {
                            bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50',
                            border: 'border-blue-200/80',
                            icon: 'bg-gradient-to-br from-blue-400 to-indigo-500',
                            shadow: 'shadow-blue-100/50'
                          }
                        } else if (task.priority === 'urgent') {
                          return {
                            bg: 'bg-gradient-to-br from-red-50 via-red-50 to-red-50',
                            border: 'border-red-200/80',
                            icon: 'bg-gradient-to-br from-red-400 to-red-500',
                            shadow: 'shadow-red-100/50'
                          }
                        } else {
                          return {
                            bg: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50',
                            border: 'border-indigo-200/80',
                            icon: 'bg-gradient-to-br from-indigo-400 to-purple-500',
                            shadow: 'shadow-indigo-100/50'
                          }
                        }
                      }

                      const taskColors = getTaskColorClasses()

                      return (
                        <div
                          key={task.id}
                          className={`rounded-3xl p-4 border-2 ${taskColors.bg} ${taskColors.border} shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
                          style={{ boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 20px -5px ${taskColors.shadow.replace('shadow-', '').replace('/50', '')}50` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${taskColors.icon} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                              <FaListUl className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-base font-bold text-slate-900 leading-tight flex-1">{task.title}</h3>
                                {task.status === 'completed' && (
                                  <FaCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                )}
                              </div>
                              {task.description && (
                                <p className="mt-1.5 text-sm text-slate-600 line-clamp-2 leading-relaxed">{task.description}</p>
                              )}
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${task.status === 'completed' ? 'bg-green-500 text-white' :
                                  task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                    'bg-amber-500 text-white'
                                  }`}>
                                  {task.status === 'completed' ? '✓ Hoàn thành' :
                                    task.status === 'in_progress' ? '⏳ Đang làm' : '⏸ Chờ'}
                                </span>
                                {task.priority === 'urgent' && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-500 text-white font-semibold shadow-sm animate-pulse">
                                    ⚠ Khẩn
                                  </span>
                                )}
                                {task.priority === 'high' && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-sm">
                                    ⬆ Cao
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => {
                                setViewingTask(task)
                                setIsTaskDetailModalOpen(true)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaEdit className="h-4 w-4" />
                              <span>Xem/Sửa</span>
                            </button>
                            <button
                              onClick={() => handleDelete('task', task)}
                              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* History Reminders/Notes */}
                    {historyItems.reminders.map((reminder) => {
                      const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                      const reminderColor = getReminderColor(reminder)
                      const colorClasses = getColorClasses(reminderColor)
                      const categoryInfo = getCategoryInfo(reminder.category_id)
                      const walletName = getWalletName(reminder.wallet_id)

                      return (
                        <div
                          key={reminder.id}
                          className={`rounded-3xl p-4 border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${colorClasses.bg} ${colorClasses.border} shadow-lg`}
                          style={{ boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 20px -5px ${colorClasses.shadow.replace('shadow-', '').replace('/50', '')}50` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClasses.icon} shadow-md group-hover:scale-110 transition-transform duration-300 ring-2 ring-white/50`}>
                              {reminderIcons[reminder.id] ? (
                                <span className="h-10 w-10 flex items-center justify-center text-white">{reminderIcons[reminder.id]}</span>
                              ) : categoryInfo.icon ? (
                                <span className="h-10 w-10 flex items-center justify-center text-white">{categoryInfo.icon}</span>
                              ) : (
                                <FaCalendar className="h-5 w-5 text-white drop-shadow-sm" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900 leading-tight">{reminder.title}</h3>
                                    {reminder.enable_notification && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <FaBell className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                      </div>
                                    )}
                                  </div>
                                  {reminder.amount && (
                                    <p className="mt-1.5 text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                      {formatVNDDisplay(reminder.amount)}
                                    </p>
                                  )}
                                </div>
                                {reminder.reminder_time && (
                                  <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg shadow-sm">
                                      <FaClock className="h-3 w-3 text-slate-500" />
                                      <p className="text-xs font-semibold text-slate-700">
                                        {formatTime(reminder.reminder_time)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {categoryInfo.name && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-white to-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/80">
                                    {categoryInfo.name}
                                  </span>
                                )}
                                {walletName && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-white to-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/80">
                                    {walletName}
                                  </span>
                                )}
                                {isNote && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                    📝 Ghi chú
                                  </span>
                                )}
                                {!isNote && reminder.type && (
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${reminder.type === 'Thu'
                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                    : 'bg-gradient-to-r from-red-400 to-red-500'
                                    }`}>
                                    {reminder.type === 'Thu' ? '💰 Thu' : '💸 Chi'}
                                  </span>
                                )}
                              </div>
                              {reminder.notes && (
                                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed bg-white/50 rounded-xl p-2 border border-white/80">{reminder.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {!isNote && (
                              <button
                                onClick={() => handleCreateTransaction(reminder)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95"
                              >
                                <FaPlus className="h-3.5 w-3.5" />
                                <span>Tạo giao dịch</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditReminder(reminder)}
                              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            {isNote ? (
                              <button
                                onClick={() => handleDelete('note', reminder)}
                                className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleCompleteReminder(reminder)}
                                  className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-green-600 hover:to-green-600 hover:shadow-lg hover:scale-105 active:scale-95"
                                  title="Hoàn thành"
                                >
                                  <FaCheck className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSkipReminder(reminder)}
                                  className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-slate-500 hover:to-slate-600 hover:shadow-lg hover:scale-105 active:scale-95"
                                  title="Bỏ qua"
                                >
                                  <FaTimes className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-white shadow-xl border-2 border-slate-200/50">
                    <div className="h-20 w-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-5 shadow-inner">
                      <FaHistory className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-semibold text-base mb-2">Chưa có lịch sử bản ghi</p>
                    <p className="text-slate-400 text-sm mb-6 text-center px-4">Các công việc, ghi chú và kế hoạch đã tạo sẽ hiển thị ở đây</p>
                  </div>
                )
              ) : (
                /* Regular filtered items for other tabs */
                (filteredItems.tasks.length > 0 || filteredItems.reminders.length > 0) ? (
                  <div className="space-y-3">
                    {/* Tasks with enhanced styling */}
                    {filteredItems.tasks.map((task) => {
                      const getTaskColorClasses = () => {
                        if (task.status === 'completed') {
                          return {
                            bg: 'bg-gradient-to-br from-green-50 via-green-50 to-green-50',
                            border: 'border-green-200/80',
                            icon: 'bg-gradient-to-br from-green-400 to-green-500',
                            shadow: 'shadow-green-100/50'
                          }
                        } else if (task.status === 'in_progress') {
                          return {
                            bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50',
                            border: 'border-blue-200/80',
                            icon: 'bg-gradient-to-br from-blue-400 to-indigo-500',
                            shadow: 'shadow-blue-100/50'
                          }
                        } else if (task.priority === 'urgent') {
                          return {
                            bg: 'bg-gradient-to-br from-red-50 via-red-50 to-red-50',
                            border: 'border-red-200/80',
                            icon: 'bg-gradient-to-br from-red-400 to-red-500',
                            shadow: 'shadow-red-100/50'
                          }
                        } else {
                          return {
                            bg: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50',
                            border: 'border-indigo-200/80',
                            icon: 'bg-gradient-to-br from-indigo-400 to-purple-500',
                            shadow: 'shadow-indigo-100/50'
                          }
                        }
                      }

                      const taskColors = getTaskColorClasses()

                      return (
                        <div
                          key={task.id}
                          className={`rounded-3xl p-4 border-2 ${taskColors.bg} ${taskColors.border} shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
                          style={{ boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 20px -5px ${taskColors.shadow.replace('shadow-', '').replace('/50', '')}50` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${taskColors.icon} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                              <FaListUl className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-base font-bold text-slate-900 leading-tight flex-1">{task.title}</h3>
                                {task.status === 'completed' && (
                                  <FaCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                )}
                              </div>
                              {task.description && (
                                <p className="mt-1.5 text-sm text-slate-600 line-clamp-2 leading-relaxed">{task.description}</p>
                              )}
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full shadow-sm ${task.status === 'completed' ? 'bg-green-500 text-white' :
                                  task.status === 'in_progress' ? 'bg-blue-500 text-white' :
                                    'bg-amber-500 text-white'
                                  }`}>
                                  {task.status === 'completed' ? '✓ Hoàn thành' :
                                    task.status === 'in_progress' ? '⏳ Đang làm' : '⏸ Chờ'}
                                </span>
                                {task.priority === 'urgent' && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-500 text-white font-semibold shadow-sm animate-pulse">
                                    ⚠ Khẩn
                                  </span>
                                )}
                                {task.priority === 'high' && (
                                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-sm">
                                    ⬆ Cao
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => {
                                setViewingTask(task)
                                setIsTaskDetailModalOpen(true)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaEdit className="h-4 w-4" />
                              <span>Xem/Sửa</span>
                            </button>
                            <button
                              onClick={() => handleDelete('task', task)}
                              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Reminders/Notes */}
                    {filteredItems.reminders.map((reminder) => {
                      const isNote = !reminder.amount && !reminder.category_id && !reminder.wallet_id
                      const reminderColor = getReminderColor(reminder)
                      const colorClasses = getColorClasses(reminderColor)
                      const categoryInfo = getCategoryInfo(reminder.category_id)
                      const walletName = getWalletName(reminder.wallet_id)

                      return (
                        <div
                          key={reminder.id}
                          className={`rounded-3xl p-4 border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${colorClasses.bg} ${colorClasses.border} shadow-lg`}
                          style={{ boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05), 0 0 20px -5px ${colorClasses.shadow.replace('shadow-', '').replace('/50', '')}50` }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClasses.icon} shadow-md group-hover:scale-110 transition-transform duration-300 ring-2 ring-white/50`}>
                              {reminderIcons[reminder.id] ? (
                                <span className="h-10 w-10 flex items-center justify-center text-white">{reminderIcons[reminder.id]}</span>
                              ) : categoryInfo.icon ? (
                                <span className="h-10 w-10 flex items-center justify-center text-white">{categoryInfo.icon}</span>
                              ) : (
                                <FaCalendar className="h-5 w-5 text-white drop-shadow-sm" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-bold text-slate-900 leading-tight">{reminder.title}</h3>
                                    {reminder.enable_notification && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <FaBell className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                      </div>
                                    )}
                                  </div>
                                  {reminder.amount && (
                                    <p className="mt-1.5 text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                      {formatVNDDisplay(reminder.amount)}
                                    </p>
                                  )}
                                </div>
                                {reminder.reminder_time && (
                                  <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-lg shadow-sm">
                                      <FaClock className="h-3 w-3 text-slate-500" />
                                      <p className="text-xs font-semibold text-slate-700">
                                        {formatTime(reminder.reminder_time)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {categoryInfo.name && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-white to-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/80">
                                    {categoryInfo.name}
                                  </span>
                                )}
                                {walletName && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-white to-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-200/80">
                                    {walletName}
                                  </span>
                                )}
                                {isNote && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                    📝 Ghi chú
                                  </span>
                                )}
                                {!isNote && reminder.type && (
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${reminder.type === 'Thu'
                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                    : 'bg-gradient-to-r from-red-400 to-red-500'
                                    }`}>
                                    {reminder.type === 'Thu' ? '💰 Thu' : '💸 Chi'}
                                  </span>
                                )}
                              </div>
                              {reminder.notes && (
                                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed bg-white/50 rounded-xl p-2 border border-white/80">{reminder.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            {!isNote && (
                              <button
                                onClick={() => handleCreateTransaction(reminder)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg hover:scale-105 active:scale-95"
                              >
                                <FaPlus className="h-3.5 w-3.5" />
                                <span>Tạo giao dịch</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditReminder(reminder)}
                              className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-600 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            {isNote ? (
                              <button
                                onClick={() => handleDelete('note', reminder)}
                                className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-600 hover:shadow-lg hover:scale-105 active:scale-95"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleCompleteReminder(reminder)}
                                  className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-green-600 hover:to-green-600 hover:shadow-lg hover:scale-105 active:scale-95"
                                  title="Hoàn thành"
                                >
                                  <FaCheck className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleSkipReminder(reminder)}
                                  className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-slate-500 hover:to-slate-600 hover:shadow-lg hover:scale-105 active:scale-95"
                                  title="Bỏ qua"
                                >
                                  <FaTimes className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 rounded-3xl bg-gradient-to-br from-white via-slate-50 to-white shadow-xl border-2 border-slate-200/50">
                    <div className="h-20 w-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-5 shadow-inner">
                      <FaCalendar className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-semibold text-base mb-2">Chưa có mục nào cho ngày này</p>
                    <p className="text-slate-400 text-sm mb-6 text-center px-4">Bắt đầu bằng cách thêm công việc, kế hoạch hoặc ghi chú</p>
                    <button
                      onClick={handleAddClick}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white font-semibold shadow-lg transition-all hover:from-blue-600 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                      + Thêm mới
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </main>

      <FooterNav onAddClick={handleAddClick} />

      {/* Modals */}
      <PlanDayModal
        isOpen={isPlanDayModalOpen}
        onClose={() => {
          setIsPlanDayModalOpen(false)
          setModalAnchorPosition(undefined)
        }}
        tasks={dayModalTasks}
        reminders={dayModalReminders}
        date={selectedCalendarDate}
        anchorPosition={modalAnchorPosition}
        onTaskClick={(task) => {
          setViewingTask(task)
          setIsPlanDayModalOpen(false)
          setModalAnchorPosition(undefined)
          setIsTaskDetailModalOpen(true)
        }}
        onReminderClick={(reminder) => {
          handleEditReminder(reminder)
          setIsPlanDayModalOpen(false)
          setModalAnchorPosition(undefined)
        }}
      />

      <UnifiedItemModal
        isOpen={isUnifiedModalOpen}
        onClose={() => {
          setIsUnifiedModalOpen(false)
          setEditingItem(null)
        }}
        onSuccess={() => {
          loadData()
          setIsUnifiedModalOpen(false)
          setEditingItem(null)
        }}
        editingItem={editingItem}
        defaultDate={selectedCalendarDate}
        categories={categories}
        wallets={wallets}
        categoryIcons={categoryIcons}
      />

      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false)
          setViewingTask(null)
        }}
        disableRipple={disableRipple}
        onToggleRipple={() => setDisableRipple(prev => !prev)}
        task={viewingTask}
        onEdit={(task) => {
          setEditingItem({ type: 'task', task })
          setIsTaskDetailModalOpen(false)
          setIsUnifiedModalOpen(true)
        }}
        onUpdate={async (taskId, updates) => {
          try {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
            if (viewingTask && viewingTask.id === taskId) {
              setViewingTask(prev => prev ? { ...prev, ...updates } : null)
            }
            const { id, user_id, created_at, updated_at, completed_at, ...editableFields } = updates
            await updateTask(taskId, editableFields)
          } catch (err) {
            showError('Không thể cập nhật công việc.')
            loadData()
          }
        }}
        onDelete={(task) => {
          handleDelete('task', task)
        }}
        onComplete={async (task) => {
          try {
            await updateTask(task.id, {
              status: 'completed',
              completed_at: formatDateUTC7(getNowUTC7())
            })
            success('Đã đánh dấu hoàn thành công việc!')
            await loadData()
          } catch (err) {
            showError('Không thể cập nhật công việc.')
          }
        }}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setItemToDelete(null)
        }}
        onConfirm={confirmDelete}
        title={itemToDelete?.type === 'task' ? 'Xóa công việc' : 'Xóa nhắc nhở'}
        message={`Bạn có chắc chắn muốn xóa ${itemToDelete?.type === 'task' ? 'công việc' : 'nhắc nhở'} này?`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="error"
      />
    </div>
  )
}

export default NotesPlansPage


