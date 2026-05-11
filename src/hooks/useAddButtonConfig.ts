import { useLocation } from 'react-router-dom'
import { Zap, LayoutList, Route, Wrench } from 'lucide-react'

export type AddAction = {
    label: string
    path: string
    icon: any
    action?: () => void
}

export function useAddButtonConfig() {
    const location = useLocation()
    const pathname = location.pathname

    // Define hidden paths
    const hiddenPaths = [
        '/settings',
        '/ev/list',
        '/ev/calculator',
        '/ev/reports',
        '/ev/history',
        '/ev/add',
        '/account-info',
        '/notifications',
        '/upgrade'
    ]

    // Check if current path starts with any of the hidden paths
    const isHidden = hiddenPaths.some(path => 
        pathname === path || (path !== '/' && pathname.startsWith(path))
    ) || pathname.includes('/edit/')

    // Special case for history detail if it's not covered by /ev/history
    // e.g. /ev/charging/:id if it existed.

    const getConfig = (): AddAction | null => {
        if (isHidden) return null

        if (pathname === '/ev/expenses') {
            return {
                label: 'Chi phí',
                path: '/ev/expenses',
                icon: LayoutList
            }
        }

        if (pathname === '/ev/trips') {
            return {
                label: 'Lộ trình',
                path: '/ev/trips',
                icon: Route
            }
        }

        if (pathname === '/ev/maintenance') {
            return {
                label: 'Bảo dưỡng',
                path: '/ev/maintenance',
                icon: Wrench
            }
        }

        // Default for dashboard (/ev, /dashboard) and charging page
        return {
            label: 'Sạc pin',
            path: '/ev/charging',
            icon: Zap
        }
    }

    return {
        config: getConfig(),
        isHidden
    }
}
