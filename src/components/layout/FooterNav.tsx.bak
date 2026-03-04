import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  LuHouse,
  LuCar,
  LuChartLine,
  LuSettings,
  LuClipboardPen,
} from 'react-icons/lu'

type FooterNavProps = {
  onAddClick?: () => void
}

type TabItem = {
  id: string
  label: string
  icon: IconType
  path?: string
  prominent?: boolean
}

const tabs: TabItem[] = [
  { id: 'home', label: 'Tổng quan', icon: LuHouse, path: '/dashboard' },
  { id: 'vehicles', label: 'Phương tiện', icon: LuCar, path: '/vehicles' },
  { id: 'add', label: '', icon: LuClipboardPen, prominent: true },
  { id: 'reports', label: 'Báo cáo', icon: LuChartLine, path: '/reports' },
  { id: 'settings', label: 'Cài đặt', icon: LuSettings, path: '/settings' },
]

export const FooterNav = ({ onAddClick }: FooterNavProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [animatingTab, setAnimatingTab] = useState<string | null>(null)

  const isActive = (path?: string) => {
    if (!path) return false
    const pathname = location.pathname
    const cleanPath = path.split('?')[0]
    return pathname === cleanPath || pathname.startsWith(cleanPath)
  }

  // Check for animation trigger from navigation state
  useEffect(() => {
    if (location.state?.animateTab) {
      const tabId = location.state.animateTab
      // Small delay to ensure DOM is ready and transition can happen
      requestAnimationFrame(() => {
        setAnimatingTab(tabId)
        setTimeout(() => {
          setAnimatingTab(null)
          // Optional: Clear state to prevent re-animation on refresh (though harmless)
          // window.history.replaceState({}, document.title)
        }, 600)
      })
    }
  }, [location.state])

  const handleClick = (tab: TabItem) => {
    if (tab.prominent) {
      if (onAddClick) {
        onAddClick()
        return
      }
      if (tab.path) {
        navigate(tab.path)
      }
      return
    }

    // Trigger animation when clicking on a menu item
    if (tab.path) {
      // If staying on same page, animate locally
      if (location.pathname === tab.path) {
        setAnimatingTab(null)
        requestAnimationFrame(() => {
          setAnimatingTab(tab.id)
          setTimeout(() => {
            setAnimatingTab(null)
          }, 600)
        })
      } else {
        // If navigating, pass state to trigger animation on next mount
        navigate(tab.path, { state: { animateTab: tab.id } })
      }
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="relative w-full max-w-md pointer-events-auto">
        {/* Central Add Button - Positioned on the convex bulge */}
        <div className="absolute left-1/2 bottom-[12px] z-30 -translate-x-1/2">
          <button
            type="button"
            onClick={() => handleClick(tabs[2])}
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-blue-800 shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
          >
            <LuClipboardPen className="h-8 w-8 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation Bar - Custom SVG Background with Convex Center */}
        <div className="relative h-[100px]">
          {/* SVG Background Shape */}
          <div className="absolute bottom-0 w-full h-[105px] drop-shadow-[0_-10px_30px_rgba(0,0,0,0.06)]">
            <svg
              viewBox="0 0 400 100"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              {/* Convex White background - Even Taller base */}
              <path
                d="M 0,60 
                   C 0,48.954 8.954,40 20,40 
                   L 130,40 
                   C 155,40 175,22 200,22 
                   C 225,22 245,40 270,40 
                   L 380,40 
                   C 391.046,40 400,48.954 400,60 
                   L 400,100 
                   L 0,100 
                   Z"
                fill="white"
              />
            </svg>
          </div>

          {/* Navigation Items */}
          <div className="relative z-10 flex items-end justify-between px-0 h-full pb-1">
            {tabs.map((tab) => {
              if (tab.prominent) {
                return <div key={tab.id} className="flex flex-1" />
              }

              const { label, icon: Icon } = tab
              const active = isActive(tab.path)
              const shouldAnimate = animatingTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleClick(tab)}
                  aria-current={active ? 'page' : undefined}
                  data-no-haptic="true"
                  className={`relative z-20 flex flex-1 flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${active ? 'text-blue-800' : 'text-slate-600'
                    }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all ${active
                      ? 'bg-blue-800 text-white shadow-md'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100/50'
                      } ${shouldAnimate ? 'animate-zoom-once' : ''}`}
                  >
                    <Icon className={`h-6 w-6 ${shouldAnimate ? 'animate-zoom-once' : ''}`} />
                  </span>
                  <span className={`leading-tight inline-block ${shouldAnimate ? 'animate-zoom-text-once' : ''}`}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FooterNav
