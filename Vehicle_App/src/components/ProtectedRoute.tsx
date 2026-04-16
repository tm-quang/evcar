import { Navigate, useLocation } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuthState'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

/**
 * ProtectedRoute component that checks authentication state
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = ({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, loading, initialized } = useAuthState()
  const location = useLocation()

  // Show loading state while checking auth
  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
        </div>
      </div>
    )
  }

  // If auth is required but user is not logged in, redirect to login
  if (requireAuth && !user) {
    // Save the attempted location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If user is logged in but trying to access login/register, redirect to vehicles
  if (user && (location.pathname === '/login' || location.pathname === '/register')) {
    return <Navigate to="/ev" replace />
  }

  return <>{children}</>
}


