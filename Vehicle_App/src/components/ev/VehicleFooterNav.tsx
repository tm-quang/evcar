import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Settings, Receipt, Zap } from 'lucide-react'
import { LuClipboardPen } from 'react-icons/lu'

type VehicleFooterNavProps = {
    /** Called when the center + button is tapped */
    onAddClick?: () => void
    /** Override add button label */
    addLabel?: string
    /** If the selected vehicle is electric, show Zap icon for fuel tab */
    isElectricVehicle?: boolean
    /**
     * When true (on the /vehicles main page):
     *   - first tab shows "Trang chủ" + Home icon → navigates to /dashboard
     * When false/undefined (on child pages):
     *   - first tab shows "Tổng quan" + grid icon → navigates to /vehicles
     */
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
    const [addAnimating, setAddAnimating] = useState(false)
    const [animatingTab, setAnimatingTab] = useState<string | null>(null)

    // Check for animation trigger from navigation state
    useEffect(() => {
        if (location.state?.animateTab) {
            const tabId = location.state.animateTab
            // Small delay to ensure DOM is ready and transition can happen
            requestAnimationFrame(() => {
                setAnimatingTab(tabId)
                setTimeout(() => {
                    setAnimatingTab(null)
                }, 600)
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
        {
            id: 'home',
            label: 'Trang chủ',
            icon: Home,
            path: '/ev',
        },
        {
            id: 'fuel',
            label: 'Sạc điện',
            icon: Zap,
            path: '/ev/charging',
        },
        {
            id: 'add',
            label: addLabel,
            icon: LuClipboardPen,
            prominent: true,
        },
        {
            id: 'expenses',
            label: 'Chi phí',
            icon: Receipt,
            path: '/ev/expenses',
        },
        {
            id: 'settings',
            label: 'Cài đặt',
            icon: Settings,
            path: '/settings',
        },
    ]

    const isActive = (path?: string) => {
        if (!path) return false
        const pathname = location.pathname
        // Exact match for /vehicles and /dashboard
        if (path === '/ev' || path === '/dashboard') return pathname === path
        return pathname === path || pathname.startsWith(path)
    }

    const handleClick = (tab: VehicleTab) => {
        if (tab.prominent) {
            triggerAddAnimation()
            onAddClick?.()
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

                {/* Center Add Button - floats above the notch */}
                <div className="absolute left-1/2 bottom-[14px] z-30 -translate-x-1/2">
                    <button
                        type="button"
                        onClick={() => handleClick(tabs[2])}
                        className="group flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                            boxShadow: '0 4px 20px rgba(29, 78, 216, 0.45)',
                        }}
                        aria-label="Thêm ghi chép"
                    >
                        <LuClipboardPen
                            className={`h-8 w-8 text-white ${addAnimating ? 'animate-zoom-once' : ''
                                }`}
                            strokeWidth={2.5}
                        />
                    </button>
                </div>

                {/* Background SVG with convex notch */}
                <div className="relative h-[100px]">
                    <div className="absolute bottom-0 w-full h-[105px] drop-shadow-[0_-8px_24px_rgba(0,0,0,0.07)]">
                        <svg
                            viewBox="0 0 400 100"
                            className="w-full h-full"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M 0,60
                                   C 0,48.954 8.954,40 20,40
                                   L 128,40
                                   C 153,40 173,22 200,22
                                   C 227,22 247,40 272,40
                                   L 380,40
                                   C 391.046,40 400,48.954 400,60
                                   L 400,100
                                   L 0,100
                                   Z"
                                fill="white"
                            />
                        </svg>
                    </div>

                    {/* Nav items */}
                    <div className="relative z-10 flex items-end justify-between px-0 h-full pb-1">
                        {tabs.map((tab) => {
                            if (tab.prominent) {
                                // placeholder gap for center button
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
                                    className={`relative z-20 flex flex-1 flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${active ? 'text-blue-800' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${active
                                            ? 'bg-blue-800 text-white shadow-md'
                                            : 'text-slate-500 hover:bg-slate-100/50'
                                            } ${shouldAnimate ? 'animate-zoom-once' : ''}`}
                                    >
                                        <Icon className={`h-5 w-5 ${shouldAnimate ? 'animate-zoom-once' : ''}`} />
                                    </span>
                                    <span className={`leading-tight inline-block ${shouldAnimate ? 'animate-zoom-text-once' : ''}`}>{tab.label}</span>
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

