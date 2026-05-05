import { useEffect, Suspense, lazy, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSwipeBack } from './hooks/useSwipeBack'
import { NotificationProvider } from './contexts/NotificationContext'
import { DialogProvider } from './contexts/DialogContext'
import ToastStackLimiter from './components/ui/ToastStackLimiter'
import { useSystemSetting } from './hooks/useSystemSettings'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister } from './lib/react-query'
import { AppearanceProvider, useAppearance } from './contexts/AppearanceContext'
import { VehicleFooterNav } from './components/ev/VehicleFooterNav'

const DashboardPage = lazy(() => import('./pages/ev'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const NotificationsPage = lazy(() => import('./pages/Notifications'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'))
const AccountInfoPage = lazy(() => import('./pages/AccountInfo'))
const VehicleManagementPage = lazy(() => import('./pages/ev'))
const AddEVPage = lazy(() => import('./pages/ev/AddEV'))
const EditEVPage = lazy(() => import('./pages/ev/EditEV'))
const VehicleListPage = lazy(() => import('./pages/ev/VehicleList'))
const VehicleTripsPage = lazy(() => import('./pages/ev/VehicleTrips'))
const VehicleChargingPage = lazy(() => import('./pages/ev/VehicleCharging'))
const VehicleMaintenancePage = lazy(() => import('./pages/ev/VehicleMaintenance'))
const VehicleExpensesPage = lazy(() => import('./pages/ev/VehicleExpenses'))
const VehicleReportsPage = lazy(() => import('./pages/ev/VehicleReports'))
const VehicleChargingHistoryPage = lazy(() => import('./pages/ev/VehicleChargingHistory'))
const EVCalculatorPage = lazy(() => import('./pages/ev/EVCalculator'))
const DataManagementPage = lazy(() => import('./pages/ev/DataManagement'))
const UpgradePage = lazy(() => import('./pages/Upgrade'))
const AppearanceSettingsPage = lazy(() => import('./pages/AppearanceSettings'))

const PageFallback = () => {
  const { value: splashLogo } = useSystemSetting('app_splash_logo', '/EVGo-Logo.png')
  const { isDarkMode } = useAppearance()

  return (
    <div className={`flex h-screen items-center justify-center px-6 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="relative h-32 w-32">
          <div className="absolute inset-0 flex items-center justify-center" />
          <img
            src={splashLogo || '/EVGo-Logo.png'}
            alt="EVGo logo"
            className="relative h-32 w-32"
          />
        </div>
      </div>
    </div>
  )
}

function RootRedirect({ hasExistingSession }: { hasExistingSession: boolean }) {
  const hash = window.location.hash
  if (hash.includes('type=recovery') && hash.includes('access_token')) {
    return <Navigate to={`/reset-password${hash}`} replace />
  }
  if (hash.includes('error=')) {
    const params = new URLSearchParams(hash.replace('#', ''))
    const errorCode = params.get('error_code') ?? ''
    const errorDesc = params.get('error_description') ?? ''
    const loginSearch = `?auth_error=${encodeURIComponent(errorCode)}&msg=${encodeURIComponent(errorDesc)}`
    return <Navigate to={`/login${loginSearch}`} replace />
  }
  return <Navigate to={hasExistingSession ? '/ev' : '/login'} replace />
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [initialPath] = useState(() => location.pathname)

  const initialHash = useState(() => window.location.hash)[0]
  const hasRecoveryToken = initialHash.includes('type=recovery') ||
    (initialHash.includes('access_token') && initialHash.includes('type=recovery'))
  const hasHashError = initialHash.includes('error=')

  const splashEligible = ['/login', '/register', '/'].includes(initialPath)
    && !hasRecoveryToken && !hasHashError
  const [showSplash, setShowSplash] = useState(splashEligible)

  const hasExistingSession = useState(() => {
    try {
      const stored = localStorage.getItem('bofin-auth-token')
      if (!stored) return false
      const parsed = JSON.parse(stored)
      return !!parsed?.access_token || !!parsed?.currentSession?.access_token
    } catch {
      return false
    }
  })[0]

  useSwipeBack({ enabled: true, threshold: 100, edgeWidth: 50 })

  useEffect(() => {
    if (!splashEligible) return
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [splashEligible])

  const showFooter = !['/login', '/register', '/', '/reset-password', '/account-info', '/upgrade'].includes(location.pathname)

  return (
    <>
      {showSplash ? (
        <PageFallback />
      ) : (
        <div className="flex h-screen flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<RootRedirect hasExistingSession={hasExistingSession} />} />
                <Route path="/login" element={<ProtectedRoute requireAuth={false}><LoginPage /></ProtectedRoute>} />
                <Route path="/register" element={<ProtectedRoute requireAuth={false}><RegisterPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/settings/data" element={<ProtectedRoute><DataManagementPage /></ProtectedRoute>} />
                <Route path="/settings/appearance" element={<ProtectedRoute><AppearanceSettingsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                <Route path="/account-info" element={<ProtectedRoute><AccountInfoPage /></ProtectedRoute>} />
                <Route path="/ev" element={<ProtectedRoute><VehicleManagementPage /></ProtectedRoute>} />
                <Route path="/ev/list" element={<ProtectedRoute><VehicleListPage /></ProtectedRoute>} />
                <Route path="/ev/add" element={<ProtectedRoute><AddEVPage /></ProtectedRoute>} />
                <Route path="/ev/edit/:id" element={<ProtectedRoute><EditEVPage /></ProtectedRoute>} />
                <Route path="/ev/trips" element={<ProtectedRoute><VehicleTripsPage /></ProtectedRoute>} />
                <Route path="/ev/charging" element={<ProtectedRoute><VehicleChargingPage /></ProtectedRoute>} />
                <Route path="/ev/maintenance" element={<ProtectedRoute><VehicleMaintenancePage /></ProtectedRoute>} />
                <Route path="/ev/expenses" element={<ProtectedRoute><VehicleExpensesPage /></ProtectedRoute>} />
                <Route path="/ev/reports" element={<ProtectedRoute><VehicleReportsPage /></ProtectedRoute>} />
                <Route path="/ev/history" element={<ProtectedRoute><VehicleChargingHistoryPage /></ProtectedRoute>} />
                <Route path="/ev/calculator" element={<ProtectedRoute><EVCalculatorPage /></ProtectedRoute>} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/upgrade" element={<ProtectedRoute><UpgradePage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </div>

          {showFooter && (
            <div className="flex-none">
              <VehicleFooterNav onAddClick={() => navigate('/ev/charging', { state: { openAddModal: true } })} />
            </div>
          )}
        </div>
      )}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '15px', fontSize: '12px' },
        }}
      />
      <ToastStackLimiter />
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
          <NotificationProvider>
            <DialogProvider>
              <AppearanceProvider>
                <AppContent />
              </AppearanceProvider>
            </DialogProvider>
          </NotificationProvider>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
