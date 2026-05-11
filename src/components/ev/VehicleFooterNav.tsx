import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Settings, LayoutList, Zap } from 'lucide-react'
import { LuClipboardPen } from 'react-icons/lu'
import { useAppearance } from '../../contexts/AppearanceContext'
import { VehicleFooterNavPill } from './VehicleFooterNavPill'
import { QuickAddMenu } from './QuickAddMenu'
import { useAddButtonConfig } from '../../hooks/useAddButtonConfig'

type VehicleFooterNavProps = {
    onAddClick?: () => void
    addLabel?: string
    isElectricVehicle?: boolean
    isMainPage?: boolean
}

type VehicleTab = {
    id: string
    label: string
    icon: React.ElementType
    path?: string
    prominent?: boolean
}

export function VehicleFooterNav({
    onAddClick,
    addLabel = 'Thêm',
}: VehicleFooterNavProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const { isDarkMode, navStyle } = useAppearance()
    const [addAnimating, setAddAnimating] = useState(false)
    const [animatingTab, setAnimatingTab] = useState<string | null>(null)
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
    const { config, isHidden } = useAddButtonConfig()

    const [isVisible, setIsVisible] = useState(true)

    // Auto-hide when modals are open
    useEffect(() => {
        const checkModals = () => {
            const overlays = document.querySelectorAll('.fixed.inset-0, [class*="backdrop-blur"], [class*="z-50"], [class*="z-[60]"], [class*="z-[9999]"], [role="dialog"]')
            const activeModals = Array.from(overlays).filter(el => {
                if (el.classList.contains('footer-nav-container') || el.querySelector('.footer-nav-container')) return false
                const style = window.getComputedStyle(el)
                const zIndex = parseInt(style.zIndex) || 0
                return style.display !== 'none' && parseFloat(style.opacity) > 0 && zIndex >= 50 && el.getBoundingClientRect().width > 100
            })
            setIsVisible(activeModals.length === 0)
        }

        const observer = new MutationObserver(checkModals)
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
        checkModals()
        const interval = setInterval(checkModals, 500)
        return () => { observer.disconnect(); clearInterval(interval) }
    }, [])

    useEffect(() => {
        if (location.state?.animateTab) {
            const tabId = location.state.animateTab
            requestAnimationFrame(() => {
                setAnimatingTab(tabId)
                setTimeout(() => setAnimatingTab(null), 600)
            })
        }
    }, [location.state])

    const triggerAddAnimation = () => {
        setAddAnimating(false)
        requestAnimationFrame(() => {
            setAddAnimating(true)
            setTimeout(() => setAddAnimating(false), 650)
        })
    }

    const tabs: VehicleTab[] = [
        { id: 'home', label: 'Trang chủ', icon: Home, path: '/ev' },
        { id: 'fuel', label: 'Sạc pin', icon: Zap, path: '/ev/charging' },
        { id: 'add', label: config?.label || addLabel, icon: LuClipboardPen, prominent: true },
        { id: 'expenses', label: 'Chi phí', icon: LayoutList, path: '/ev/expenses' },
        { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
    ]

    const isActive = (path?: string) => {
        if (!path) return false
        const pathname = location.pathname
        if (path === '/ev' || path === '/dashboard') return pathname === path
        return pathname === path || pathname.startsWith(path)
    }

    const handleClick = (tab: VehicleTab) => {
        if (tab.prominent) {
            triggerAddAnimation()
            
            // If on Dashboard, show popup
            if (location.pathname === '/ev' || location.pathname === '/dashboard') {
                setIsQuickAddOpen(true)
                return
            }

            // Otherwise, perform the context action
            if (config) {
                if (location.pathname === config.path) {
                    // Already on the right page, just trigger the local add click if provided, 
                    // or use the common navigate with state
                    if (onAddClick) {
                        onAddClick()
                    } else {
                        navigate(config.path, { state: { openAddModal: true }, replace: true })
                    }
                } else {
                    navigate(config.path, { state: { openAddModal: true } })
                }
            } else {
                onAddClick?.()
            }
            return
        }

        if (tab.path) {
            if (location.pathname === tab.path) {
                setAnimatingTab(null)
                requestAnimationFrame(() => {
                    setAnimatingTab(tab.id)
                    setTimeout(() => setAnimatingTab(null), 600)
                })
            } else {
                navigate(tab.path, { state: { animateTab: tab.id } })
            }
        }
    }

    const isButtonHidden = isHidden

    if (navStyle === 'pill') {
        return <VehicleFooterNavPill />
    }

    return (
        <div className={`
            fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none footer-nav-container
            transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}
        `}>
            <div className="relative w-full max-w-md pointer-events-auto">
                <QuickAddMenu 
                    isOpen={isQuickAddOpen} 
                    onClose={() => setIsQuickAddOpen(false)} 
                    anchor="center"
                />

                {/* Center Add Button */}
                {!isButtonHidden && (
                    <div className="absolute left-1/2 bottom-[14px] z-30 -translate-x-1/2">
                        <button
                            type="button"
                            onClick={() => handleClick(tabs[2])}
                            className="group flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 active:scale-95"
                            style={{
                                background: isDarkMode
                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                    : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                                boxShadow: isDarkMode
                                    ? '0 4px 20px rgba(59, 130, 246, 0.4)'
                                    : '0 4px 20px rgba(29, 78, 216, 0.45)',
                            }}
                            aria-label="Thêm ghi chép"
                        >
                            {config?.icon ? (
                                <config.icon className={`h-7 w-7 text-white ${addAnimating ? 'animate-zoom-once' : ''}`} />
                            ) : (
                                <LuClipboardPen
                                    className={`h-8 w-8 text-white ${addAnimating ? 'animate-zoom-once' : ''}`}
                                    strokeWidth={2.5}
                                />
                            )}
                        </button>
                    </div>
                )}

                {/* Background SVG */}
                <div className="relative h-[100px]">
                    <div className="absolute bottom-0 w-full h-[105px] drop-shadow-[0_-8px_24px_rgba(0,0,0,0.07)]">
                        <svg
                            viewBox="0 0 400 100"
                            className="w-full h-full"
                            preserveAspectRatio="none"
                        >
                            <path
                                d={isButtonHidden 
                                    ? "M 0,60 C 0,48.954 8.954,40 20,40 L 380,40 C 391.046,40 400,48.954 400,60 L 400,100 L 0,100 Z"
                                    : "M 0,60 C 0,48.954 8.954,40 20,40 L 128,40 C 153,40 173,22 200,22 C 227,22 247,40 272,40 L 380,40 C 391.046,40 400,48.954 400,60 L 400,100 L 0,100 Z"
                                }
                                fill="var(--app-home-bg)"
                                className="transition-all duration-500"
                            />
                            {isDarkMode && (
                                <path
                                    d={isButtonHidden
                                        ? "M 0,60 C 0,48.954 8.954,40 20,40 L 380,40 C 391.046,40 400,48.954 400,60"
                                        : "M 0,60 C 0,48.954 8.954,40 20,40 L 128,40 C 153,40 173,22 200,22 C 227,22 247,40 272,40 L 380,40 C 391.046,40 400,48.954 400,60"
                                    }
                                    fill="none"
                                    stroke="#334155"
                                    strokeWidth="0.8"
                                    className="transition-all duration-500"
                                />
                            )}
                        </svg>
                    </div>

                    {/* Nav items */}
                    <div className="relative z-10 flex items-end justify-between px-0 h-full pb-1">
                        {tabs.map((tab) => {
                            if (tab.prominent) {
                                return <div key={tab.id} className="flex flex-1" />
                            }

                            const Icon = tab.icon
                            const active = isActive(tab.path)
                            const shouldAnimate = animatingTab === tab.id

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleClick(tab)}
                                    aria-current={active ? 'page' : undefined}
                                    data-no-haptic="true"
                                    className={`relative z-20 flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                                        active
                                            ? isDarkMode ? 'text-blue-400' : 'text-blue-800'
                                            : isDarkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <span
                                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                                            active
                                                ? isDarkMode
                                                    ? 'bg-blue-500/20 text-blue-400 shadow-md'
                                                    : 'bg-blue-800 text-white shadow-md'
                                                : isDarkMode
                                                    ? 'text-slate-500 hover:bg-slate-700/50'
                                                    : 'text-slate-500 hover:bg-slate-100/50'
                                        } ${shouldAnimate ? 'animate-zoom-once' : ''}`}
                                    >
                                        <Icon className={`h-5 w-5 ${shouldAnimate ? 'animate-zoom-once' : ''}`} />
                                    </span>
                                    <span className={`leading-tight inline-block ${shouldAnimate ? 'animate-zoom-text-once' : ''}`}>
                                        {tab.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VehicleFooterNav
