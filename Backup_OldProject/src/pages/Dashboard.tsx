import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDataPreloader } from '../hooks/useDataPreloader'
import { FaPlus, FaPaperPlane, FaCog, FaFolder, FaArrowRight, FaClock, FaTasks, FaShoppingCart, FaMicrophone, FaPiggyBank, FaChevronRight } from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { QuickActionsSettings } from '../components/quickActions/QuickActionsSettings'
import { IncomeExpenseOverview } from '../components/charts/IncomeExpenseOverview'
import { TransactionActionModal } from '../components/transactions/TransactionActionModal'
import { TransactionDetailModal } from '../components/transactions/TransactionDetailModal'
import { TransactionCard } from '../components/transactions/TransactionCard'
import { TaskActionModal } from '../components/tasks/TaskActionModal'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WelcomeModal } from '../components/ui/WelcomeModal'
// import { WalletCarousel } from '../components/wallets/WalletCarousel'
import { TransactionListSkeleton } from '../components/skeletons'
import { NetAssetsCard } from '../components/dashboard/NetAssetsCard'
import { DashboardTasksSection } from '../components/dashboard/DashboardTasksSection'
import { BudgetAlertsSection } from '../components/dashboard/BudgetAlertsSection'
import { PlanCalendar } from '../components/dashboard/PlanCalendar'
import { PlanDayModal } from '../components/dashboard/PlanDayModal'
import { UnifiedItemModal } from '../components/notesPlans/UnifiedItemModal'
import { getAllNotifications } from '../lib/notificationService'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'
import { getIconNodeFromCategory } from '../utils/iconLoader'
import { fetchCategories, type CategoryRecord } from '../lib/categoryService'
import { fetchTransactions, deleteTransaction, type TransactionRecord } from '../lib/transactionService'
import { deleteTask, fetchTasks, type TaskRecord } from '../lib/taskService'
import { fetchWallets, type WalletRecord } from '../lib/walletService'
import { getDefaultWallet, setDefaultWallet } from '../lib/walletService'
import { getCurrentProfile, type ProfileRecord } from '../lib/profileService'
import { fetchReminders, type ReminderRecord } from '../lib/reminderService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { checkAndSendBudgetAlerts } from '../lib/budgetAlertService'
import { getQuickActionsSettings, saveQuickActionsSettings } from '../lib/quickActionsSettingsService'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

// Component for Quick Action Button
const QuickActionButton = ({
  action,
  Icon,
  isNew,
  onNavigate
}: {
  action: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; image?: string; color: string; bgColor: string; textColor: string }
  Icon: React.ComponentType<{ className?: string }>
  isNew?: boolean
  onNavigate: (id: string) => void
}) => {
  const [imageError, setImageError] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onNavigate(action.id)}
      className="group relative flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center border border-slate-50 shadow-md transition-all hover:shadow-xl hover:scale-[1.05] active:scale-95 ring-1 ring-slate-100/50"
    >
      {isNew && (
        <span className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
          MỚI
        </span>
      )}
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden transition-transform group-hover:scale-110">
        {action.image && !imageError ? (
          <img
            src={action.image}
            alt={action.label}
            className="h-full w-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </span>
      <span className={`text-[10px] font-semibold leading-tight ${action.textColor} line-clamp-2 min-h-[2rem] flex items-center justify-center text-center w-full`}>
        {action.label}
      </span>
    </button>
  )
}


const ALL_QUICK_ACTIONS = [
  {
    id: 'notes-plans',
    label: 'Công việc, kế hoạch',
    icon: FaTasks,
    image: '/images/heoBO/heo2.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'send-money',
    label: 'Chi tiêu',
    icon: FaPaperPlane,
    image: '/images/heoBO/heo2.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'add-transaction',
    label: 'Thêm giao dịch',
    icon: FaPlus,
    image: '/images/heoBO/heo1.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'categories',
    label: 'Hạng mục',
    icon: FaFolder,
    image: '/images/heoBO/heo4.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'budgets',
    label: 'Hạn mức',
    icon: FaFolder,
    image: '/images/heoBO/heo4.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'shopping-list',
    label: 'Danh sách mua sắm',
    icon: FaShoppingCart,
    image: '/images/heoBO/heo5.png', // Thêm link ảnh ở đây (tùy chọn)
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'voice-to-text',
    label: 'Giọng nói',
    icon: FaMicrophone,
    image: '/images/heoBO/heo5.png',
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
  {
    id: 'spending-jars',
    label: 'Hũ chi tiêu',
    icon: FaPiggyBank,
    image: '/images/heoBO/heo2.png',
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
  },
  {
    id: 'debts',
    label: 'Sổ nợ',
    icon: FaFolder,
    image: '/images/heoBO/heo4.png',
    color: 'from-rose-500 to-red-600',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    icon: FaCog,
    image: '/images/quick-actions/settings.png',
    color: 'from-sky-500 to-blue-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
  },
]

const STORAGE_KEY = 'quickActionsSettings'
const DEFAULT_WALLET_KEY = 'bofin_default_wallet_id'

// Utility functions for default wallet
const getDefaultWalletId = (): string | null => {
  try {
    return localStorage.getItem(DEFAULT_WALLET_KEY)
  } catch {
    return null
  }
}

const saveDefaultWalletId = (walletId: string): void => {
  try {
    localStorage.setItem(DEFAULT_WALLET_KEY, walletId)
  } catch (error) {
    console.error('Error saving default wallet:', error)
  }
}

export const DashboardPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { success, error: showError } = useNotification()
  useDataPreloader() // Preload data khi vào dashboard
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null) // Reserved for future use
  const [defaultWalletId, setDefaultWalletId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [categoryIcons, setCategoryIcons] = useState<Record<string, React.ReactNode>>({})
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()) // Default to today
  const [selectedDateReminders, setSelectedDateReminders] = useState<ReminderRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [reminders, setReminders] = useState<ReminderRecord[]>([])
  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | undefined>(undefined)
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<{ type: 'task' | 'reminder' | 'note'; task?: TaskRecord; reminder?: ReminderRecord } | null>(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [isReloading, setIsReloading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isAllUtilitiesExpanded, setIsAllUtilitiesExpanded] = useState(false)

  // Long press handler refs
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTargetRef = useRef<TransactionRecord | null>(null)

  // Task action states
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [isTaskActionModalOpen, setIsTaskActionModalOpen] = useState(false)
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false)
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false)
  const [isTaskDeleting, setIsTaskDeleting] = useState(false)

  // Task long press handler refs
  const taskLongPressTimerRef = useRef<number | null>(null)
  const taskLongPressTargetRef = useRef<TaskRecord | null>(null)

  // Load quick actions settings from Supabase (with localStorage fallback)
  const getStoredActions = () => {
    // Mặc định: chỉ 4 chức năng đầu tiên (Settings là chức năng thứ 7, mặc định tắt)
    return ALL_QUICK_ACTIONS.map((action, index) => ({
      id: action.id,
      label: action.label,
      enabled: index < 4 && action.id !== 'settings',
    }))
  }

  const [quickActionsSettings, setQuickActionsSettings] = useState(getStoredActions)


  // Load settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getQuickActionsSettings()

        if (savedSettings) {
          // Migration: Nếu có 'tasks' hoặc 'reminder' được bật, chuyển sang 'notes-plans'
          const notesPlansEnabled = savedSettings['notes-plans'] ??
            (savedSettings['tasks'] || savedSettings['reminder']) ??
            false

          // Nếu đã migrate, xóa các key cũ
          if (savedSettings['tasks'] !== undefined || savedSettings['reminder'] !== undefined) {
            delete savedSettings['tasks']
            delete savedSettings['reminder']
            savedSettings['notes-plans'] = notesPlansEnabled
          }

          const loadedActions = ALL_QUICK_ACTIONS.map((action, index) => ({
            id: action.id,
            label: action.label,
            // Mặc định: chỉ 4 chức năng đầu tiên (không bao gồm settings)
            enabled: savedSettings[action.id] ?? (index < 4 && action.id !== 'settings'),
          }))

          setQuickActionsSettings(loadedActions)
        } else {
          // Nếu chưa có settings trong Supabase, thử load từ localStorage (migration)
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored)

              // Migration: Nếu có 'tasks' hoặc 'reminder' được bật, chuyển sang 'notes-plans'
              const notesPlansEnabled = parsed['notes-plans'] ??
                (parsed['tasks'] || parsed['reminder']) ??
                false

              // Nếu đã migrate, xóa các key cũ
              if (parsed['tasks'] !== undefined || parsed['reminder'] !== undefined) {
                delete parsed['tasks']
                delete parsed['reminder']
                parsed['notes-plans'] = notesPlansEnabled
              }

              const migratedActions = ALL_QUICK_ACTIONS.map((action, index) => ({
                id: action.id,
                label: action.label,
                enabled: parsed[action.id] ?? (index < 4 && action.id !== 'settings'),
              }))

              setQuickActionsSettings(migratedActions)

              // Lưu vào Supabase để migrate
              await saveQuickActionsSettings(migratedActions)

              // Xóa localStorage sau khi migrate thành công
              localStorage.removeItem(STORAGE_KEY)
            }
          } catch (error) {
            console.error('Error migrating settings from localStorage:', error)
          }
        }
      } catch (error) {
        console.error('Error loading quick actions settings:', error)
      }
    }

    loadSettings()
  }, [])

  // Get enabled quick actions (exclude settings) - chỉ sử dụng ảnh từ ALL_QUICK_ACTIONS
  const enabledQuickActions = ALL_QUICK_ACTIONS.filter((action) => {
    if (action.id === 'settings') return false // Loại bỏ tiện ích cài đặt
    const setting = quickActionsSettings.find((s) => s.id === action.id)
    return setting?.enabled ?? false
  })

  // Handle update quick actions settings
  const handleUpdateQuickActions = async (updatedActions: typeof quickActionsSettings) => {
    // updatedActions đã được filter settings từ modal, chỉ cần lưu lại
    // Đảm bảo không có quá 4 tiện ích được bật
    const enabledCount = updatedActions.filter((a) => a.enabled).length
    let finalActions = updatedActions

    if (enabledCount > 6) {
      // Nếu có lỗi, giới hạn lại
      finalActions = updatedActions.map((action, index) => ({
        ...action,
        enabled: action.enabled && index < 6
      }))
    }

    setQuickActionsSettings(finalActions)

    // Save to Supabase
    try {
      await saveQuickActionsSettings(finalActions)
      success('Đã lưu cài đặt tiện ích thành công!')
    } catch (error) {
      console.error('Error saving quick actions settings:', error)
      showError('Không thể lưu cài đặt. Vui lòng thử lại.')
      // Rollback nếu lưu thất bại
      setQuickActionsSettings(quickActionsSettings)
    }
  }

  const handleAddClick = () => {
    navigate('/add-transaction')
  }


  // const handleWalletChange = (wallet: WalletRecord) => {
  //   setSelectedWallet(wallet)
  //   // Chỉ cập nhật state để hiển thị, không lưu làm ví mặc định
  //   // Ví mặc định chỉ được lưu khi người dùng chủ động chọn từ trang Wallets
  // }


  // Load default wallet on mount
  useEffect(() => {
    const loadDefaultWallet = async () => {
      try {
        const savedDefaultWalletId = await getDefaultWallet()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
          saveDefaultWalletId(savedDefaultWalletId) // Đồng bộ với localStorage
          // WalletCarousel sẽ tự động chọn ví mặc định khi load
          // và gọi handleWalletChange để set selectedWallet
        } else {
          // Kiểm tra localStorage fallback
          const localDefaultWalletId = getDefaultWalletId()
          if (localDefaultWalletId) {
            // Kiểm tra xem ví này có còn tồn tại không
            const wallets = await fetchWallets(false)
            const walletExists = wallets.some(w => w.id === localDefaultWalletId)
            if (walletExists) {
              setDefaultWalletId(localDefaultWalletId)
              // Đồng bộ lại với database
              try {
                await setDefaultWallet(localDefaultWalletId)
              } catch (error) {
                console.error('Error syncing default wallet to database:', error)
              }
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading default wallet:', errorMessage, error)
        // Fallback về localStorage
        const savedDefaultWalletId = getDefaultWalletId()
        if (savedDefaultWalletId) {
          setDefaultWalletId(savedDefaultWalletId)
        }
      }
    }
    loadDefaultWallet()
  }, [])


  // Load profile - force refresh on mount, then use cache
  useEffect(() => {
    let mounted = true
    let retryCount = 0
    const maxRetries = 3

    const loadProfile = async (forceRefresh = false) => {
      if (mounted) {
        setIsLoadingProfile(true)
      }
      try {
        const profileData = await getCurrentProfile(forceRefresh)
        if (mounted) {
          setProfile(profileData)
          setIsLoadingProfile(false)
        }
      } catch (error) {
        console.error('Error loading profile:', error)

        // Retry logic for transient errors
        if (retryCount < maxRetries && mounted) {
          retryCount++
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
          setTimeout(() => {
            if (mounted) {
              loadProfile(true) // Force refresh on retry
            }
          }, delay)
        } else if (mounted) {
          // If all retries failed, set to null to show default
          setProfile(null)
          setIsLoadingProfile(false)
        }
      }
    }

    // Force refresh on mount to ensure fresh data
    loadProfile(true)

    return () => {
      mounted = false
    }
  }, []) // Only run on mount

  // Also reload profile when location changes (user navigates back)
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true)
      try {
        const profileData = await getCurrentProfile(false) // Use cache if available
        setProfile(profileData)
        setIsLoadingProfile(false)
      } catch (error) {
        console.error('Error loading profile on navigation:', error)
        setIsLoadingProfile(false)
      }
    }
    loadProfile()
  }, [location.key])

  // Check for welcome modal flag from login
  // WelcomeModal is disabled for now
  // useEffect(() => {
  //   // Use a small delay to ensure sessionStorage is set before checking
  //   const checkWelcomeModal = () => {
  //     const shouldShowWelcome = sessionStorage.getItem('showWelcomeModal')
  //     if (shouldShowWelcome === 'true') {
  //       // Clear the flag immediately so it doesn't show again
  //       sessionStorage.removeItem('showWelcomeModal')
  //       // Show modal after a short delay to ensure page is loaded
  //       setShowWelcomeModal(true)
  //     }
  //   }
  //   
  //   // Check immediately
  //   checkWelcomeModal()
  //   
  //   // Also check after a short delay to handle any race conditions
  //   const timer = setTimeout(checkWelcomeModal, 200)
  //   
  //   return () => clearTimeout(timer)
  // }, [location.key]) // Re-run when location changes (navigation)

  // const handleAddWallet = () => {
  //   navigate('/wallets')
  // }

  // Load transactions and categories - chỉ load khi cần thiết, sử dụng cache
  // Nếu đã preload, dữ liệu sẽ được lấy từ cache ngay lập tức
  // Chỉ load lại khi location.key thay đổi (navigate từ trang khác về)
  useEffect(() => {
    loadNotificationCount()

    // Check budget alerts when Dashboard loads (chạy trong background)
    checkAndSendBudgetAlerts().catch((error) => {
      console.warn('Error checking budget alerts on Dashboard load:', error)
    })
  }, [])

  // Refresh notification count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotificationCount()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const loadNotificationCount = async () => {
    try {
      const notifications = await getAllNotifications()
      const unread = notifications.filter((notif) => notif.status === 'unread').length
      setUnreadNotificationCount(unread)
    } catch (error) {
      console.error('Error loading notification count:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingTransactions(true)
      try {
        // Sử dụng cache - nếu đã preload, sẽ lấy từ cache ngay lập tức
        // Chỉ fetch khi cache hết hạn hoặc chưa có
        const [transactionsData, categoriesData, walletsData] = await Promise.all([
          fetchTransactions({ limit: 10 }),
          fetchCategories(),
          fetchWallets(false), // Chỉ lấy ví active, không lấy ví đã ẩn
        ])

        // Load icons for all categories
        const iconsMap: Record<string, React.ReactNode> = {}
        await Promise.all(
          categoriesData.map(async (category) => {
            try {
              // Sử dụng getIconNodeFromCategory để ưu tiên icon_url nếu có
              const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
              if (iconNode) {
                // Wrap icon với kích thước phù hợp
                iconsMap[category.id] = <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
              } else {
                // Fallback to hardcoded icon
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                }
              }
            } catch (error) {
              console.error('Error loading icon for category:', category.id, error)
              // Fallback to hardcoded icon
              const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
              if (hardcodedIcon?.icon) {
                const IconComponent = hardcodedIcon.icon
                iconsMap[category.id] = <IconComponent className="h-14 w-14" />
              }
            }
          })
        )
        setCategoryIcons(iconsMap)

        // Sort by date: newest first (transaction_date desc, then created_at desc)
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA // Newest first
          }
          // If same date, sort by created_at
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA // Newest first
        })
        setTransactions(sortedTransactions)
        setCategories(categoriesData)
        setWallets(walletsData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading transactions:', errorMessage, error)
      } finally {
        setIsLoadingTransactions(false)
      }
    }

    // Chỉ load lại khi location.key thay đổi (navigate từ trang khác về)
    // Không load lại khi chỉ re-render hoặc khi component re-mount
    // Nếu đã có cache, sẽ không fetch lại
    loadData()
  }, []) // Chỉ load một lần khi mount, cache sẽ được sử dụng

  // Reload transactions when a new transaction is added/updated/deleted
  const handleTransactionSuccess = () => {
    // Trigger refresh for NetAssetsCard
    setRefreshTrigger(prev => prev + 1)

    const loadTransactions = async () => {
      try {
        // Đợi một chút để đảm bảo wallet balance đã được sync
        await new Promise(resolve => setTimeout(resolve, 500))

        const transactionsData = await fetchTransactions({ limit: 10 })
        // Sort by date: newest first (transaction_date desc, then created_at desc)
        const sortedTransactions = [...transactionsData].sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          if (dateB !== dateA) {
            return dateB - dateA // Newest first
          }
          // If same date, sort by created_at
          const createdA = new Date(a.created_at).getTime()
          const createdB = new Date(b.created_at).getTime()
          return createdB - createdA // Newest first
        })
        setTransactions(sortedTransactions)
      } catch (error) {
        console.error('Error reloading transactions:', error)
      }
    }
    loadTransactions()
  }

  // Handle reload - clear all cache, reset state and reload all data
  const handleReload = async () => {
    setIsReloading(true)
    // Trigger refresh for NetAssetsCard
    setRefreshTrigger(prev => prev + 1)
    try {
      // Clear toàn bộ cache và reset trạng thái
      const { clearAllCacheAndState } = await import('../utils/reloadData')
      await clearAllCacheAndState()

      // Reload all data
      const loadData = async () => {
        try {
          setIsLoadingTransactions(true)
          const [transactionsData, categoriesData, walletsData, remindersData, tasksData, profileData] = await Promise.all([
            fetchTransactions({ limit: 10 }),
            fetchCategories(),
            fetchWallets(false),
            fetchReminders({ is_active: true }),
            fetchTasks(),
            getCurrentProfile(true), // Force refresh on reload
          ])

          // Load icons for categories
          const iconsMap: Record<string, React.ReactNode> = {}
          await Promise.all(
            categoriesData.map(async (category) => {
              try {
                // Sử dụng getIconNodeFromCategory để ưu tiên icon_url nếu có
                const iconNode = await getIconNodeFromCategory(category.icon_id, category.icon_url, 'h-full w-full object-cover rounded-full')
                if (iconNode) {
                  iconsMap[category.id] = <span className="h-14 w-14 flex items-center justify-center rounded-full overflow-hidden">{iconNode}</span>
                } else {
                  const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                  if (hardcodedIcon?.icon) {
                    const IconComponent = hardcodedIcon.icon
                    iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                  }
                }
              } catch {
                const hardcodedIcon = CATEGORY_ICON_MAP[category.icon_id]
                if (hardcodedIcon?.icon) {
                  const IconComponent = hardcodedIcon.icon
                  iconsMap[category.id] = <IconComponent className="h-14 w-14" />
                }
              }
            })
          )
          setCategoryIcons(iconsMap)

          // Sort transactions
          const sortedTransactions = [...transactionsData].sort((a, b) => {
            const dateA = new Date(a.transaction_date).getTime()
            const dateB = new Date(b.transaction_date).getTime()
            if (dateB !== dateA) {
              return dateB - dateA
            }
            const createdA = new Date(a.created_at).getTime()
            const createdB = new Date(b.created_at).getTime()
            return createdB - createdA
          })
          setTransactions(sortedTransactions)
          setCategories(categoriesData)
          setWallets(walletsData)
          setTasks(tasksData)
          setProfile(profileData)

          // Reload notification count
          await loadNotificationCount()

          // Reload date data
          const dateStr = formatDateToString(selectedDate)
          const dateReminders = remindersData.filter((r) => r.reminder_date === dateStr && !r.completed_at)
          setSelectedDateReminders(dateReminders)

          success('Đã làm mới dữ liệu thành công!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error('Error reloading data:', errorMessage, error)
          showError('Không thể tải lại dữ liệu. Vui lòng thử lại.')
        } finally {
          setIsLoadingTransactions(false)
        }
      }

      await loadData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error reloading data:', errorMessage, error)
      showError('Không thể làm mới dữ liệu. Vui lòng thử lại.')
    } finally {
      setIsReloading(false)
    }
  }

  // Long press handlers
  const handleLongPressStart = (transaction: TransactionRecord) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
    }

    longPressTargetRef.current = transaction

    // Set timer for long press (500ms)
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressTargetRef.current) {
        setSelectedTransaction(longPressTargetRef.current)
        setIsActionModalOpen(true)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  const handleLongPressCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTargetRef.current = null
  }

  // Handle edit
  // Handle view transaction detail
  const handleViewClick = () => {
    setIsActionModalOpen(false)
    if (selectedTransaction) {
      setIsDetailModalOpen(true)
    }
  }

  const handleEditClick = () => {
    setIsEditConfirmOpen(true)
  }

  const handleEditConfirm = () => {
    setIsEditConfirmOpen(false)
    setIsActionModalOpen(false)
    if (selectedTransaction) {
      navigate(`/add-transaction?id=${selectedTransaction.id}`)
    }
  }

  // Handle delete
  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return

    setIsDeleting(true)
    try {
      await deleteTransaction(selectedTransaction.id)
      success('Đã xóa giao dịch thành công!')
      handleTransactionSuccess()
      setSelectedTransaction(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa giao dịch'
      showError(message)
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
    }
  }

  // Task long press handlers
  const handleTaskLongPressStart = (task: TaskRecord) => {
    // Clear any existing timer
    if (taskLongPressTimerRef.current) {
      window.clearTimeout(taskLongPressTimerRef.current)
    }

    taskLongPressTargetRef.current = task

    // Set timer for long press (500ms)
    taskLongPressTimerRef.current = window.setTimeout(() => {
      if (taskLongPressTargetRef.current) {
        setSelectedTask(taskLongPressTargetRef.current)
        setIsTaskActionModalOpen(true)
      }
    }, 500)
  }

  const handleTaskLongPressEnd = () => {
    if (taskLongPressTimerRef.current) {
      window.clearTimeout(taskLongPressTimerRef.current)
      taskLongPressTimerRef.current = null
    }
    taskLongPressTargetRef.current = null
  }

  const handleTaskLongPressCancel = () => {
    if (taskLongPressTimerRef.current) {
      window.clearTimeout(taskLongPressTimerRef.current)
      taskLongPressTimerRef.current = null
    }
    taskLongPressTargetRef.current = null
  }

  // Handle task view
  const handleTaskViewClick = () => {
    setIsTaskActionModalOpen(false)
    if (selectedTask) {
      setIsTaskDetailModalOpen(true)
    }
  }

  // Handle task edit
  const handleTaskEditClick = () => {
    setIsTaskActionModalOpen(false)
    if (selectedTask) {
      navigate(`/notes-plans?taskId=${selectedTask.id}&edit=true`)
    }
  }

  // Handle task delete
  const handleTaskDeleteClick = () => {
    setIsTaskDeleteConfirmOpen(true)
  }

  const handleTaskDeleteConfirm = async () => {
    if (!selectedTask) return

    setIsTaskDeleting(true)
    try {
      await deleteTask(selectedTask.id)
      success('Đã xóa công việc thành công!')
      setSelectedTask(null)
      // Trigger refresh for tasks section
      setRefreshTrigger(prev => prev + 1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa công việc'
      showError(message)
    } finally {
      setIsTaskDeleting(false)
      setIsTaskDeleteConfirmOpen(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
      if (taskLongPressTimerRef.current) {
        window.clearTimeout(taskLongPressTimerRef.current)
      }
    }
  }, [])

  // Get category info for a transaction
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    if (!category) return { name: 'Khác', icon: null, iconId: undefined, iconUrl: undefined }

    return {
      name: category.name,
      icon: categoryIcons[category.id] || null,
      iconId: category.icon_id,
      iconUrl: category.icon_url || null,
    }
  }

  // Get wallet name
  const getWalletName = (walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId)
    return wallet?.name || 'Không xác định'
  }

  // Format date to YYYY-MM-DD (avoid timezone issues)
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Load reminders and tasks
  useEffect(() => {
    let isCancelled = false

    const loadDateData = async () => {
      try {
        const dateStr = formatDateToString(selectedDate)

        // Fetch reminders and tasks
        const [allReminders, allTasks] = await Promise.all([
          fetchReminders({ is_active: true }),
          fetchTasks()
        ])

        if (isCancelled) return

        const dateReminders = allReminders.filter(
          (r) => r.reminder_date === dateStr && !r.completed_at
        )
        setSelectedDateReminders(dateReminders)
        setReminders(allReminders)
        setTasks(allTasks)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading date data:', errorMessage, error)
      }
    }

    loadDateData()

    return () => {
      isCancelled = true
    }
  }, [selectedDate, refreshTrigger])

  // Auto-update to today when date changes (check every minute)
  // Use ref to track if we're viewing today to avoid infinite loops
  const isViewingTodayRef = useRef(true)
  const selectedDateRef = useRef(selectedDate)

  // Update refs when selectedDate changes
  useEffect(() => {
    selectedDateRef.current = selectedDate
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    isViewingTodayRef.current = selected.getTime() === today.getTime()
  }, [selectedDate])

  useEffect(() => {
    const checkDateChange = () => {
      // Only check if we're currently viewing today
      if (!isViewingTodayRef.current) {
        return
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStr = formatDateToString(today)

      // Get last checked date from localStorage
      const lastChecked = localStorage.getItem('lastDateCheck')
      const lastCheckedStr = lastChecked ? formatDateToString(new Date(lastChecked)) : null

      // Only update if date actually changed and we're still viewing today
      if (lastCheckedStr !== todayStr && isViewingTodayRef.current) {
        // Date changed, update to new today
        const newToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        setSelectedDate(newToday)
        localStorage.setItem('lastDateCheck', now.toISOString())
        isViewingTodayRef.current = true
      }
    }

    // Don't check immediately, wait a bit to avoid initial loop
    const initialTimeout = setTimeout(() => {
      checkDateChange()
    }, 2000)

    // Then check every minute
    const interval = setInterval(checkDateChange, 60000) // Check every minute

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, []) // Empty dependency array - only run once on mount



  // Get wallet color based on ID (consistent color for same wallet)
  const getWalletColor = (walletId: string) => {
    // Array of beautiful color combinations
    const colors = [
      { bg: 'bg-sky-100', icon: 'text-sky-600', text: 'text-sky-700' },
      { bg: 'bg-green-100', icon: 'text-green-600', text: 'text-green-700' },
      { bg: 'bg-red-100', icon: 'text-red-600', text: 'text-red-700' },
      { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
      { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' },
      { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' },
      { bg: 'bg-pink-100', icon: 'text-pink-600', text: 'text-pink-700' },
      { bg: 'bg-cyan-100', icon: 'text-cyan-600', text: 'text-cyan-700' },
      { bg: 'bg-orange-100', icon: 'text-orange-600', text: 'text-orange-700' },
      { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-700' },
    ]

    // Simple hash function to convert wallet ID to index
    let hash = 0
    for (let i = 0; i < walletId.length; i++) {
      hash = walletId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        userName={profile?.full_name || 'Người dùng'}
        avatarUrl={profile?.avatar_url || undefined}
        badgeColor="bg-sky-500"
        unreadNotificationCount={unreadNotificationCount}
        onReload={handleReload}
        isReloading={isReloading}
        isLoadingProfile={isLoadingProfile}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-24 sm:pt-2 sm:pb-24">
          {/* Tài sản ròng - Tổng quan tài chính */}
          <NetAssetsCard refreshTrigger={refreshTrigger} />

          {/* Wallet Card Carousel - Đã ẩn */}
          {/* <WalletCarousel onWalletChange={handleWalletChange} onAddWallet={handleAddWallet} /> */}

          {/* Income Expense Overview - Sử dụng ví mặc định */}
          <IncomeExpenseOverview walletId={defaultWalletId || undefined} />

          {/* Plan Section with Calendar */}
          <section className="space-y-4">
            {/* Calendar */}
            <PlanCalendar
              tasks={tasks}
              reminders={reminders.filter((r) => !r.completed_at)}
              onDateClick={(date) => {
                const dateObj = new Date(date + 'T00:00:00+07:00')
                setSelectedDate(dateObj)
                setSelectedCalendarDate(date)
              }}
              selectedDate={formatDateToString(selectedDate)}
              onDateWithItemsClick={(date) => {
                const dateObj = new Date(date + 'T00:00:00+07:00')
                setSelectedDate(dateObj)
                setSelectedCalendarDate(date)
                setIsPlanDayModalOpen(true)
              }}
            />
          </section>

          {/* Tasks Section */}
          <DashboardTasksSection
            onTaskClick={(task) => {
              navigate(`/notes-plans?taskId=${task.id}`)
            }}
            onLongPressStart={handleTaskLongPressStart}
            onLongPressEnd={handleTaskLongPressEnd}
            onLongPressCancel={handleTaskLongPressCancel}
            refreshTrigger={refreshTrigger}
          />

          {/* ───── Tiện ích khác ───── */}
          {(() => {
            // IDs that are recently added (show "MỚI" badge)
            const newIds = new Set(['spending-jars'])
            // All non-settings actions
            const allActions = ALL_QUICK_ACTIONS.filter(a => a.id !== 'settings')
            // Pinned = user-enabled
            const pinnedIds = new Set(enabledQuickActions.map(a => a.id))
            const unpinnedActions = allActions.filter(a => !pinnedIds.has(a.id))

            const handleNav = (id: string) => {
              if (id === 'add-transaction') navigate('/add-transaction')
              else if (id === 'settings') setIsSettingsOpen(true)
              else if (id === 'categories') navigate('/categories')
              else if (id === 'notes-plans') navigate('/notes-plans')
              else if (id === 'budgets') navigate('/budgets')
              else if (id === 'shopping-list') navigate('/shopping-list')
              else if (id === 'voice-to-text') navigate('/voice-to-text')
              else if (id === 'spending-jars') navigate('/spending-jars')
              else if (id === 'debts') navigate('/debts')
              else if (id === 'reminder' || id === 'tasks') navigate('/notes-plans')
            }

            return (
              <section className="overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-50">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-lg shadow-blue-200">
                      <FaCog className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Tiện ích</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-90"
                      title="Cài đặt tiện ích"
                    >
                      <FaCog className="h-4 w-4" />
                    </button>
                    {unpinnedActions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAllUtilitiesExpanded(!isAllUtilitiesExpanded)}
                        className={`flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold transition-all active:scale-95 ${isAllUtilitiesExpanded
                            ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                            : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                          }`}
                      >
                        {isAllUtilitiesExpanded ? 'Thu gọn' : 'Thêm'}
                        <FaChevronRight className={`h-2.5 w-2.5 transition-transform duration-300 ${isAllUtilitiesExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider with label */}
                <div className="relative mx-5 mb-4 flex items-center">
                  <span className="flex-shrink mr-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">Đã ghim</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                {/* Pinned (enabled) grid */}
                <div className="px-4 pb-5">
                  <div className="grid grid-cols-4 gap-3.5">
                    {enabledQuickActions.length > 0 ? (
                      enabledQuickActions.map((action) => (
                        <QuickActionButton
                          key={action.id}
                          action={action}
                          Icon={action.icon}
                          isNew={newIds.has(action.id)}
                          onNavigate={handleNav}
                        />
                      ))
                    ) : (
                      <div className="col-span-4 py-4 text-center">
                        <p className="text-[11px] text-slate-400 italic">Chưa có tiện ích nào được ghim</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* All other (unpinned) actions - Expandable */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out bg-slate-50/50 ${isAllUtilitiesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="p-4">
                    <div className="relative mb-4 flex items-center">
                      <span className="flex-shrink mr-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter">Tất cả tiện ích</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-4 gap-3.5">
                      {unpinnedActions.map((action) => (
                        <QuickActionButton
                          key={action.id}
                          action={{ ...action, textColor: 'text-slate-500' }}
                          Icon={action.icon}
                          isNew={newIds.has(action.id)}
                          onNavigate={handleNav}
                        />
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-[10px] text-slate-400 italic">Bạn có thể ghim các mục này trong phần Tùy chỉnh</p>
                    </div>
                  </div>
                </div>
              </section>
            )
          })()}



          {/* Budget Alerts Section */}
          <BudgetAlertsSection />

          <section className="space-y-4">
            <header className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                    <FaClock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Giao dịch gần đây</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Lịch sử thu chi mới nhất</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/transactions')}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-lg active:scale-95"
              >
                <span>Xem thêm</span>
                <FaArrowRight className="h-3.5 w-3.5" />
              </button>
            </header>
            <div className="space-y-3">
              {isLoadingTransactions ? (
                <TransactionListSkeleton count={10} />
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 shadow-lg border border-slate-100">
                  <div className="mb-3 p-3 overflow-hidden">
                    <img
                      src="/bg-giaodich.png"
                      alt="Giao dịch"
                      className="h-56 w-56 object-contain opacity-90"
                    />
                  </div>
                  <p className="text-sm text-slate-500">Chưa có giao dịch nào</p>
                </div>
              ) : (
                (() => {
                  const recentTransactions = transactions.slice(0, 10);
                  // Group transactions by date
                  const grouped: Record<string, typeof transactions> = {};
                  recentTransactions.forEach((t) => {
                    const date = new Date(t.transaction_date);
                    const day = String(date.getDate()).padStart(2, '0')
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const year = String(date.getFullYear()).slice(-2)
                    const dateKey = `${day}/${month}/${year}`
                    if (!grouped[dateKey]) {
                      grouped[dateKey] = []
                    }
                    grouped[dateKey].push(t)
                  })

                  return Object.entries(grouped).map(([dateKey, txs]) => {
                    // Format date for display (Hôm nay, Hôm qua, etc.)
                    const [day, month, year] = dateKey.split('/').map(Number)
                    const fullYear = 2000 + year
                    const date = new Date(fullYear, month - 1, day)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)
                    date.setHours(0, 0, 0, 0)

                    let dayLabel = dateKey
                    if (date.getTime() === today.getTime()) {
                      dayLabel = 'Hôm nay'
                    } else if (date.getTime() === yesterday.getTime()) {
                      dayLabel = 'Hôm qua'
                    }

                    // calculate total net amount for the date
                    const dayTotal = txs.reduce((sum, t) => {
                      if (t.type === 'Thu') return sum + t.amount
                      if (t.type === 'Chi') return sum - t.amount
                      return sum
                    }, 0)

                    return (
                      <div key={dateKey}>
                        {/* Date separator */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-sky-400" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{dayLabel}</span>
                          </div>
                          <span className={`text-[13px] font-black ${dayTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {dayTotal >= 0 ? '+' : ''}{Math.round(dayTotal).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div className="space-y-3 pl-3.5 border-l-2 ml-[3px] py-1 border-slate-100">
                          {txs.map((transaction) => {
                            const categoryInfo = getCategoryInfo(transaction.category_id)
                            const walletColor = getWalletColor(transaction.wallet_id)

                            const formatTransactionDate = () => dayLabel;

                            return (
                              <TransactionCard
                                key={transaction.id}
                                transaction={transaction}
                                categoryInfo={categoryInfo}
                                walletInfo={{
                                  name: getWalletName(transaction.wallet_id),
                                  color: walletColor,
                                }}
                                onLongPressStart={handleLongPressStart}
                                onLongPressEnd={handleLongPressEnd}
                                onLongPressCancel={handleLongPressCancel}
                                formatCurrency={formatCurrency}
                                formatDate={formatTransactionDate}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          </section>

        </div>
      </main>

      <FooterNav onAddClick={handleAddClick} />

      <TransactionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTransaction(null)
        }}
        transaction={selectedTransaction}
        categoryInfo={selectedTransaction ? getCategoryInfo(selectedTransaction.category_id) : undefined}
        walletInfo={selectedTransaction ? { name: getWalletName(selectedTransaction.wallet_id) } : undefined}
      />

      <TransactionActionModal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false)
          setSelectedTransaction(null)
        }}
        onView={handleViewClick}
        onEdit={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for edit action
          handleEditClick()
        }}
        onDelete={() => {
          setIsActionModalOpen(false)
          // Keep selectedTransaction for delete action
          handleDeleteClick()
        }}
      />

      <ConfirmDialog
        isOpen={isEditConfirmOpen}
        onClose={() => setIsEditConfirmOpen(false)}
        onConfirm={handleEditConfirm}
        type="warning"
        title="Xác nhận sửa giao dịch"
        message="Bạn có chắc chắn muốn sửa giao dịch này? Thông tin giao dịch sẽ được cập nhật và có thể ảnh hưởng đến số dư ví."
        confirmText="Sửa"
        cancelText="Hủy"
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        type="error"
        title="Xác nhận xóa giao dịch"
        message="Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác và sẽ ảnh hưởng đến số dư ví."
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={isDeleting}
      />

      {/* Task Action Modal */}
      <TaskActionModal
        isOpen={isTaskActionModalOpen}
        onClose={() => {
          setIsTaskActionModalOpen(false)
          setSelectedTask(null)
        }}
        onView={handleTaskViewClick}
        onEdit={handleTaskEditClick}
        onDelete={handleTaskDeleteClick}
      />

      {/* Plan Day Modal */}
      <PlanDayModal
        isOpen={isPlanDayModalOpen}
        onClose={() => {
          setIsPlanDayModalOpen(false)
          setSelectedCalendarDate(undefined)
        }}
        tasks={selectedCalendarDate ? tasks.filter((t) => {
          if (!t.deadline) return false
          const taskDate = t.deadline.split('T')[0]
          return taskDate === selectedCalendarDate && t.status !== 'completed'
        }) : []}
        reminders={selectedCalendarDate ? selectedDateReminders.filter((r) => r.reminder_date === selectedCalendarDate) : []}
        date={selectedCalendarDate || formatDateToString(selectedDate)}
        onTaskClick={(task) => {
          navigate(`/notes-plans?taskId=${task.id}`)
        }}
        onReminderClick={() => {
          navigate('/notes-plans')
        }}
        onCreateNote={(date) => {
          setEditingItem({ type: 'note' })
          setSelectedCalendarDate(date)
          setIsPlanDayModalOpen(false)
          setIsUnifiedModalOpen(true)
        }}
        onCreateTask={(date) => {
          setEditingItem({ type: 'task' })
          setSelectedCalendarDate(date)
          setIsPlanDayModalOpen(false)
          setIsUnifiedModalOpen(true)
        }}
        onCreatePlan={(date) => {
          setEditingItem({ type: 'reminder' })
          setSelectedCalendarDate(date)
          setIsPlanDayModalOpen(false)
          setIsUnifiedModalOpen(true)
        }}
      />

      {/* Unified Item Modal for quick create */}
      <UnifiedItemModal
        isOpen={isUnifiedModalOpen}
        onClose={() => {
          setIsUnifiedModalOpen(false)
          setEditingItem(null)
        }}
        onSuccess={async () => {
          // Refresh data
          setRefreshTrigger(prev => prev + 1)
          setIsUnifiedModalOpen(false)
          setEditingItem(null)
        }}
        editingItem={editingItem}
        defaultDate={selectedCalendarDate}
        categories={categories}
        wallets={wallets}
        categoryIcons={categoryIcons}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false)
          setSelectedTask(null)
        }}
        task={selectedTask}
        onEdit={(task) => {
          setIsTaskDetailModalOpen(false)
          navigate(`/notes-plans?taskId=${task.id}&edit=true`)
        }}
        onUpdate={async () => {
          // Refresh tasks section
          setRefreshTrigger(prev => prev + 1)
        }}
        onDelete={(task) => {
          setIsTaskDetailModalOpen(false)
          setSelectedTask(task)
          setIsTaskDeleteConfirmOpen(true)
        }}
        onComplete={async () => {
          // Refresh tasks section
          setRefreshTrigger(prev => prev + 1)
        }}
      />

      {/* Task Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isTaskDeleteConfirmOpen}
        onClose={() => setIsTaskDeleteConfirmOpen(false)}
        onConfirm={handleTaskDeleteConfirm}
        type="error"
        title="Xác nhận xóa công việc"
        message="Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        isLoading={isTaskDeleting}
      />

      <QuickActionsSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        actions={quickActionsSettings.filter((action) => action.id !== 'settings')}
        onUpdate={handleUpdateQuickActions}
      />


      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

    </div>
  )
}

export default DashboardPage


