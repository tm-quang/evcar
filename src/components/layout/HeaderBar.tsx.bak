import { useEffect, useState, type ReactNode } from 'react'
import { FaBell, FaArrowLeft, FaRedoAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { ProfileModal } from './ProfileModal'
import { useArchiveStore } from '../../store/useArchiveStore'

type HeaderBarProps =
  | {
    variant?: 'greeting'
    userName: string
    avatarUrl?: string
    avatarText?: string
    badgeColor?: string
    onNotificationClick?: () => void
    onReload?: () => void | Promise<void>
    unreadNotificationCount?: number
    isReloading?: boolean
    isLoadingProfile?: boolean
  }
  | {
    variant: 'page'
    title: string
    onBack?: () => void
    showIcon?: ReactNode
    onReload?: () => void | Promise<void>
    isReloading?: boolean
    customContent?: ReactNode
  }

const HeaderBar = (props: HeaderBarProps) => {
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const isArchiveMode = useArchiveStore((state) => state.isArchiveMode)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      // Check both window scroll and scrollable main elements
      const windowScroll = window.scrollY || document.documentElement.scrollTop
      const mainElements = document.querySelectorAll('main')
      let maxScroll = windowScroll

      mainElements.forEach((main) => {
        if (main.scrollTop > maxScroll) {
          maxScroll = main.scrollTop
        }
      })

      setIsScrolled(maxScroll > 20)
    }

    // Listen to scroll on window
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Also listen to scroll on all main elements (for overflow-y-auto containers)
    const mainElements = document.querySelectorAll('main')
    mainElements.forEach((main) => {
      main.addEventListener('scroll', handleScroll, { passive: true })
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      mainElements.forEach((main) => {
        main.removeEventListener('scroll', handleScroll)
      })
    }
  }, [])

  if (props.variant === 'page') {
    const { title, onBack, showIcon, onReload, isReloading = false, customContent } = props
    return (
      <header className="pointer-events-none relative z-40 flex-shrink-0 bg-[#F7F9FC]">
        {isScrolled && (
          <div className="absolute inset-0 bg-white" aria-hidden="true" />
        )}
        <div className="relative px-1 py-1">
          <div
            className={`pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-1.5 transition-all duration-300 ${isScrolled
              ? 'bg-transparent'
              : 'bg-transparent'
              }`}
          >
            <button
              type="button"
              onClick={onBack ?? (() => navigate(-1))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
              aria-label="Quay lại"
            >
              <FaArrowLeft className="h-4 w-4" />
            </button>
            <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
              {title}
            </p>
            <div className="flex items-center gap-2">
              {/* Custom Content (e.g., Add button) */}
              {customContent}

              {/* Reload Button */}
              {onReload && (
                <button
                  onClick={() => {
                    if (onReload) {
                      onReload()
                    }
                  }}
                  disabled={isReloading}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Làm mới dữ liệu"
                  title="Làm mới dữ liệu"
                >
                  <FaRedoAlt className={`h-5 w-5 text-slate-500 ${isReloading ? 'animate-spin' : ''}`} />
                </button>
              )}
              {/* Custom Icon */}
              {showIcon && (
                <div className="flex h-10 w-10 items-center justify-center text-slate-500">
                  {showIcon}
                </div>
              )}
              {!onReload && !showIcon && !customContent && (
                <div className="flex h-10 w-10 items-center justify-center text-slate-500">
                  {/* Empty space để cân bằng layout */}
                </div>
              )}
            </div>
          </div>
        </div>
        {isArchiveMode && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-800">
            Cảnh báo: Đang xem Kho lưu trữ dữ liệu năm 2025.
          </div>
        )}
      </header>
    )
  }

  const {
    userName,
    avatarUrl,
    avatarText = userName?.charAt(0).toUpperCase() || '',
    badgeColor = 'bg-sky-600',
    onNotificationClick,
    onReload,
    unreadNotificationCount = 0,
    isReloading = false,
    isLoadingProfile = false,
  } = props

  let ringColorClass = 'from-emerald-400 via-green-300 to-emerald-500' // Xanh (Connected)
  if (!isOnline) {
    ringColorClass = 'from-rose-500 via-red-400 to-rose-600' // Đỏ (Disconnected)
  } else if (isReloading || isLoadingProfile) {
    ringColorClass = 'from-amber-400 via-yellow-300 to-amber-500' // Vàng (Connecting)
  }

  return (
    <header className="pointer-events-none relative z-40 flex-shrink-0 bg-[#F7F9FC]">
      {isScrolled && (
        <div className="absolute inset-0 bg-white" aria-hidden="true" />
      )}
      <div className="relative px-1 py-1">
        <div
          className={`pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-1.5 transition-all duration-300 ${isScrolled
            ? 'bg-transparent'
            : 'bg-transparent'
            }`}
        >
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 transition-all active:scale-95 text-left focus:outline-none"
          >
            {isLoadingProfile ? (
              <>
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 ring-2 ring-white shadow-[0_18px_35px_rgba(102,166,255,0.35)]" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                </div>
              </>
            ) : avatarUrl ? (
              <div className="relative">
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-r ${ringColorClass} opacity-80 blur-[6px] animate-[spin_4s_linear_infinite]`} />
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="relative h-10 w-10 rounded-full object-cover ring-2 ring-white"
                />
              </div>
            ) : userName && userName !== 'Người dùng' ? (
              <div className="relative">
                <div className={`absolute -inset-1 rounded-full bg-gradient-to-r ${ringColorClass} opacity-80 blur-[6px] animate-[spin_4s_linear_infinite]`} />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#89f7fe] to-[#66a6ff] text-base font-semibold text-slate-800 ring-2 ring-white">
                  {avatarText}
                </div>
              </div>
            ) : null}
            {!isLoadingProfile && userName && userName !== 'Người dùng' && (
              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500" style={{ fontFamily: "'Lobster', cursive" }}>Xin chào,</p>
                <p className="text-lg font-medium text-slate-900" style={{ fontFamily: "'Lobster', cursive" }}>{userName}</p>
              </div>
            )}
          </button>
          <div className="flex items-center gap-2">
            {/* Reload Button */}
            {onReload && (
              <button
                onClick={() => {
                  if (onReload) {
                    onReload()
                  }
                }}
                disabled={isReloading}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Làm mới dữ liệu"
                title="Làm mới dữ liệu"
              >
                <FaRedoAlt className={`h-5 w-5 text-slate-500 ${isReloading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Notification Button */}
            <button
              onClick={() => {
                if (onNotificationClick) {
                  onNotificationClick()
                } else {
                  navigate('/notifications')
                }
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-slate-100 transition hover:scale-110 active:scale-95"
              aria-label="Thông báo"
            >
              {unreadNotificationCount > 0 ? (
                <span className={`absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${badgeColor} text-[10px] font-bold text-white`}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              ) : (
                <span className={`absolute right-0.5 top-0.5 h-2 w-2 rounded-full ${badgeColor}`} />
              )}
              <FaBell className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
      {isArchiveMode && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-800">
          Cảnh báo: Đang xem Kho lưu trữ dữ liệu năm 2025.
        </div>
      )}
      {(props.variant === 'greeting' || !props.variant) && userName && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userName={userName}
          avatarUrl={avatarUrl}
          avatarText={avatarText}
        />
      )}
    </header>
  )
}

export default HeaderBar
