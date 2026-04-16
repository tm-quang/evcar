import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { preloadAllData, isDataPreloaded, type PreloadStatus } from '../lib/dataPreloader'
import { getCachedUser } from '../lib/userCache'


/**
 * Hook để preload dữ liệu khi user đăng nhập
 * Chỉ preload một lần trong phiên đăng nhập
 */
export const useDataPreloader = () => {
  const location = useLocation()
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus>({
    isPreloading: false,
    progress: 0,
    currentStep: '',
    error: null,
  })
  const [hasPreloaded, setHasPreloaded] = useState(false)

  useEffect(() => {
    const checkAndPreload = async () => {
      // Chỉ preload khi ở dashboard hoặc các trang chính
      const shouldPreload = ['/dashboard', '/wallets', '/transactions', '/categories', '/reports', '/settings'].includes(
        location.pathname
      )

      if (!shouldPreload || hasPreloaded) return

      try {
        // Kiểm tra xem user đã đăng nhập chưa (sử dụng cached user)
        const user = await getCachedUser()

        if (!user) return



        // Kiểm tra xem đã preload chưa
        const alreadyPreloaded = await isDataPreloaded()
        if (alreadyPreloaded) {
          setHasPreloaded(true)
          console.log('[Preload] Data already preloaded, using cache')
          return
        }

        // Preload dữ liệu
        setPreloadStatus({
          isPreloading: true,
          progress: 0,
          currentStep: 'Bắt đầu tải dữ liệu...',
          error: null,
        })

        await preloadAllData((status) => {
          setPreloadStatus(status)
        })

        setHasPreloaded(true)
        setPreloadStatus({
          isPreloading: false,
          progress: 100,
          currentStep: 'Hoàn tất!',
          error: null,
        })
      } catch (error) {
        console.error('Error preloading data:', error)
        setPreloadStatus({
          isPreloading: false,
          progress: 0,
          currentStep: '',
          error: error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu',
        })
      }
    }

    checkAndPreload()
  }, [location.pathname, hasPreloaded])

  return { preloadStatus, hasPreloaded }
}


