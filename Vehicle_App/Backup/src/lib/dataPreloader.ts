/**
 * Data Preloader Service
 * Tải và cache toàn bộ dữ liệu khi người dùng đăng nhập
 * Cache tồn tại trong suốt phiên đăng nhập và lưu vào localStorage
 */

import { fetchWallets, getDefaultWallet } from './walletService'
import { fetchTransactions } from './transactionService'
import { fetchCategories, fetchCategoriesHierarchical } from './categoryService'
import { fetchIcons } from './iconService'
import { getCurrentProfile } from './profileService'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

export type PreloadStatus = {
  isPreloading: boolean
  progress: number
  currentStep: string
  error: string | null
}

/**
 * Preload toàn bộ dữ liệu cho user hiện tại
 * Cache tất cả dữ liệu với TTL dài (24 giờ cho session cache)
 */
export const preloadAllData = async (onProgress?: (status: PreloadStatus) => void): Promise<void> => {
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để preload dữ liệu.')
  }

  const userId = user.id
  const totalSteps = 5
  let currentStep = 0

  const updateProgress = (step: string) => {
    currentStep++
    onProgress?.({
      isPreloading: currentStep < totalSteps,
      progress: Math.round((currentStep / totalSteps) * 100),
      currentStep: step,
      error: null,
    })
  }

  try {
    // Step 1: Load Profile (persistent cache - lưu vào thiết bị)
    updateProgress('Đang tải thông tin cá nhân...')
    await queryClient.prefetchQuery({
      queryKey: ['getCurrentProfile'],
      queryFn: () => getCurrentProfile(),
      staleTime: 24 * 60 * 60 * 1000,
    })

    // Step 2: Load Wallets (active và inactive)
    updateProgress('Đang tải danh sách ví...')
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['fetchWallets', { includeInactive: false }],
        queryFn: () => fetchWallets(false),
        staleTime: 24 * 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['fetchWallets', { includeInactive: true }],
        queryFn: () => fetchWallets(true),
        staleTime: 24 * 60 * 60 * 1000,
      }),
    ])

    // Step 3: Load Default Wallet
    updateProgress('Đang tải ví mặc định...')
    await queryClient.prefetchQuery({
      queryKey: ['getDefaultWallet'],
      queryFn: getDefaultWallet,
      staleTime: 24 * 60 * 60 * 1000,
    })

    // Step 4: Load Categories (flat và hierarchical) và Icons
    updateProgress('Đang tải hạng mục...')
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 24 * 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['categories_hierarchical'],
        queryFn: () => fetchCategoriesHierarchical(),
        staleTime: 24 * 60 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['icons', { is_active: true }],
        queryFn: () => fetchIcons({ is_active: true }),
        staleTime: 24 * 60 * 60 * 1000,
      }),
    ])

    // Step 5: Load Recent Transactions (limit để không quá nặng)
    updateProgress('Đang tải giao dịch gần đây...')
    await queryClient.prefetchQuery({
      queryKey: ['transactions', { limit: 50 }],
      queryFn: () => fetchTransactions({ limit: 50 }),
      staleTime: 5 * 60 * 1000, // Short stale time for transactions
    })

    // Mark preload as complete
    updateProgress('Hoàn tất!')

    // Lưu timestamp preload để biết khi nào cần refresh
    const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
    localStorage.setItem(preloadTimestampKey, Date.now().toString())

    console.log('✅ Preload completed successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
    onProgress?.({
      isPreloading: false,
      progress: 0,
      currentStep: 'Lỗi khi tải dữ liệu',
      error: errorMessage,
    })
    throw error
  }
}

/**
 * Kiểm tra xem dữ liệu đã được preload chưa
 */
export const isDataPreloaded = async (): Promise<boolean> => {
  const user = await getCachedUser()

  if (!user) return false

  const userId = user.id
  const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
  const timestamp = localStorage.getItem(preloadTimestampKey)

  if (!timestamp) return false

  // Kiểm tra xem preload có còn valid không (trong vòng 24 giờ)
  const preloadTime = parseInt(timestamp, 10)
  const now = Date.now()
  const hoursSincePreload = (now - preloadTime) / (1000 * 60 * 60)

  return hoursSincePreload < 24
}

/**
 * Clear preload timestamp (khi logout hoặc clear cache)
 */
export const clearPreloadTimestamp = async (): Promise<void> => {
  const user = await getCachedUser()

  if (user) {
    const userId = user.id
    const preloadTimestampKey = `bofin_preload_timestamp_${userId}`
    localStorage.removeItem(preloadTimestampKey)
  }
}

