import { useEffect, useState, useCallback, useEffectEvent } from 'react'
import {
  FaTimes,
  FaWallet,
  FaExchangeAlt,
  FaChartBar,
  FaFolder,
  FaCog,
  FaStar
} from 'react-icons/fa'

type WelcomeModalProps = {
  isOpen: boolean
  onClose: () => void
}

const APP_FEATURES = [
  {
    icon: FaWallet,
    title: 'Quản lý ví tài chính',
    description: 'Theo dõi nhiều ví, quản lý số dư hiệu quả',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: FaExchangeAlt,
    title: 'Quản lý Thu/Chi',
    description: 'Ghi chép và phân loại các khoản thu chi',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: FaChartBar,
    title: 'Báo cáo & Thống kê',
    description: 'Phân tích chi tiêu, biểu đồ trực quan',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: FaFolder,
    title: 'Hạng mục',
    description: 'Tổ chức Thu/Chi theo hạng mục',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
]

export const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [featureIndex, setFeatureIndex] = useState(0)
  const [progress, setProgress] = useState(100)
  const resetProgress = useEffectEvent(() => setProgress(100))
  const resetViewState = useEffectEvent(() => {
    setIsVisible(false)
    setFeatureIndex(0)
    setProgress(100)
  })

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setProgress(100)
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      // Trigger animation
      setTimeout(() => setIsVisible(true), 10)

      // Reset progress
      resetProgress()

      // Progress bar animation
      let currentProgress = 100
      const progressInterval = setInterval(() => {
        currentProgress -= 1
        setProgress(currentProgress)
        if (currentProgress <= 0) {
          clearInterval(progressInterval)
        }
      }, 100) // Update every 100ms (10 seconds total)

      // Auto-close after 10 seconds (increased for better UX)
      const timer = setTimeout(() => {
        handleClose()
      }, 10000)

      return () => {
        clearTimeout(timer)
        clearInterval(progressInterval)
      }
    } else {
      resetViewState()
    }
  }, [isOpen, handleClose])

  // Animate features on mount
  useEffect(() => {
    if (isVisible && isOpen) {
      const interval = setInterval(() => {
        setFeatureIndex((prev) => (prev + 1) % APP_FEATURES.length)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isVisible, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/70 to-slate-900/70 backdrop-blur-md transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mt-12 sm:mt-0 transform overflow-y-auto max-h-[calc(100vh-3rem)] sm:max-h-[90vh] safe-area-bottom rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200/50 transition-all duration-500 ${isVisible ? 'scale-100 sm:scale-100 opacity-100 translate-y-0' : 'scale-100 sm:scale-95 opacity-0 translate-y-8 sm:translate-y-0'
          }`}
      >
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-20 w-full">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Decorative gradient header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 opacity-10 pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white shadow-sm ring-1 ring-slate-200"
          aria-label="Đóng"
        >
          <FaTimes className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="relative flex flex-col items-center px-6 pt-4 sm:pt-8 pb-6">
          {/* Logo with animation */}
          <div className={`mb-4 flex items-center justify-center transition-all duration-500 ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
            }`}>
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/20" />
              <img
                src="/bogin-logo.png"
                alt="BO.fin Logo"
                className="relative h-20 w-20 object-contain drop-shadow-lg sm:h-24 sm:w-24"
              />
            </div>
          </div>

          {/* Welcome text */}
          <div className={`mb-6 text-center transition-all duration-500 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
            <div className="mb-2 flex items-center justify-center gap-2">
              <FaStar className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent sm:text-3xl">
                Chào mừng đến với BO.fin
              </h2>
              <FaStar className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 sm:text-base">
              Ứng dụng theo dõi chi tiêu, tối ưu tài chính
            </p>
          </div>

          {/* App description */}
          <div className={`mb-6 w-full text-center transition-all duration-500 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
            <p className="text-sm leading-relaxed text-slate-600">
              Hãy để BO.fin giúp bạn theo dõi chi tiệu một cách hiệu quả nhất.
            </p>
          </div>

          {/* Features grid */}
          <div className={`mb-6 grid w-full grid-cols-2 gap-3 transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
            {APP_FEATURES.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${featureIndex === index ? 'ring-2 ring-sky-400 ring-offset-2' : ''
                    }`}
                >
                  <div className={`mb-2 inline-flex rounded-xl ${feature.bgColor} p-2.5`}>
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                  {featureIndex === index && (
                    <div className="absolute inset-0 animate-pulse rounded-2xl bg-sky-400/5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Version badge */}
          <div className={`flex items-center gap-2 transition-all duration-500 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <FaCog className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">Phiên bản 1.0.1</span>
            </div>
          </div>

          {/* Auto-close indicator */}
          <div className={`mt-4 w-full transition-all duration-500 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'
            }`}>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              Tự động đóng sau 10 giây
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

