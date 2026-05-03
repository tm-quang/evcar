import { memo, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CarFront, Zap, LayoutList, Settings } from 'lucide-react'
import { useAppearance } from '../../contexts/AppearanceContext'

type VehicleTab = {
    id: string
    label: string
    icon: React.ElementType
    path: string
}

type VehicleFooterNavPillProps = {
    onAddClick?: () => void
    addLabel?: string
}

export const VehicleFooterNavPill = memo(({ onAddClick, addLabel }: VehicleFooterNavPillProps) => {
    const navigate = useNavigate()
    const location = useLocation()
    const { isDarkMode } = useAppearance()
    const [isVisible, setIsVisible] = useState(true)

    // Auto-hide when modals are open
    useEffect(() => {
        const checkModals = () => {
            // Find elements that look like modals or overlays
            const overlays = document.querySelectorAll('.fixed.inset-0, [class*="backdrop-blur"], [class*="z-50"], [class*="z-[60]"], [class*="z-[9999]"], [role="dialog"]')
            
            // Filter out the footer container and check for visibility
            const activeModals = Array.from(overlays).filter(el => {
                // If it's the footer itself or its parent, ignore
                if (el.classList.contains('footer-nav-container') || el.querySelector('.footer-nav-container')) {
                    return false
                }

                const style = window.getComputedStyle(el)
                const zIndex = parseInt(style.zIndex) || 0
                const opacity = parseFloat(style.opacity)
                const display = style.display

                // Only count if it's visible, has high z-index, and isn't just a tiny element
                return display !== 'none' && 
                       opacity > 0 && 
                       zIndex >= 50 && 
                       el.getBoundingClientRect().width > 100
            })
            
            setIsVisible(activeModals.length === 0)
        }

        const observer = new MutationObserver(checkModals)
        observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            attributeFilter: ['class', 'style'] 
        })

        // Initial check
        checkModals()

        // Periodic check to ensure state consistency
        const interval = setInterval(checkModals, 500)

        return () => {
            observer.disconnect()
            clearInterval(interval)
        }
    }, [])


    const tabs: VehicleTab[] = [
        { id: 'home', label: 'Trang chủ', icon: CarFront, path: '/ev' },
        { id: 'fuel', label: 'Sạc điện', icon: Zap, path: '/ev/charging' },
        { id: 'expenses', label: 'Chi phí', icon: LayoutList, path: '/ev/expenses' },
        { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
    ]

    const isActive = (path: string) => {
        const pathname = location.pathname
        if (path === '/ev') return pathname === path
        return pathname === path || pathname.startsWith(path)
    }

    return (
        <div className={`
            fixed bottom-3 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none px-4 gap-3
            transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}
            footer-nav-container
        `}>
            {onAddClick && (
                <div className="w-full max-w-[380px] flex justify-end pr-2 pointer-events-none">
                    <button
                        onClick={onAddClick}
                        className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 text-white bg-blue-600 ${isDarkMode ? 'shadow-black/50' : 'shadow-blue-500/30'}`}
                        aria-label={addLabel || "Thêm mới"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </button>
                </div>
            )}
            <div
                className={`
                    pointer-events-auto flex items-center justify-between p-1 px-1 rounded-[32px] 
                    w-full max-w-[380px] backdrop-blur-xl border-2 transition-all duration-500
                    ${isDarkMode
                        ? 'bg-slate-900/90 border-slate-700 shadow-2xl shadow-black/40'
                        : 'bg-white/95 border-slate-200 shadow-2xl shadow-slate-200'}
                `}
            >
                {tabs.map((tab) => {
                    const active = isActive(tab.path)
                    const Icon = tab.icon

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className={`
                                relative flex items-center justify-center rounded-[24px] 
                                transition-all duration-300 ease-out h-12
                                active:scale-90 will-change-[padding,width,transform]
                                ${active ? 'px-5 bg-gradient-to-br from-slate-700 to-slate-800' : 'w-12 hover:bg-slate-100/10'}
                            `}
                        >
                            <Icon
                                className={`h-5 w-5 transition-transform duration-300 ${active
                                    ? 'text-white scale-110'
                                    : (isDarkMode ? 'text-slate-400' : 'text-slate-500')
                                    }`}
                            />

                            <div className={`
                                overflow-hidden transition-all duration-300 ease-out
                                ${active ? 'max-w-[120px] ml-2.5 opacity-100' : 'max-w-0 opacity-0'}
                            `}>
                                <span className={`
                                     whitespace-nowrap text-[13.5px] font-bold tracking-tight
                                     ${active ? 'text-white' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}
                                `}>
                                    {tab.label}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
})

export default VehicleFooterNavPill
