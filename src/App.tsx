import { useEffect, Suspense, lazy, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useSwipeBack } from './hooks/useSwipeBack'
import { NotificationProvider } from './contexts/NotificationContext'
import { DialogProvider } from './contexts/DialogContext'
import ToastStackLimiter from './components/ui/ToastStackLimiter'
import { isInstalledPWA } from './utils/nativeAppBehavior'
import { useSystemSetting } from './hooks/useSystemSettings'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'



import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister } from './lib/react-query'

const DashboardPage = lazy(() => import('./pages/ev'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const NotificationsPage = lazy(() => import('./pages/Notifications'))
const LoginPage = lazy(() => import('./pages/Login'))
const RegisterPage = lazy(() => import('./pages/Register'))
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


const PageFallback = () => {
  const { value: splashLogo } = useSystemSetting('app_splash_logo', '/EVGo-Logo.png')

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="relative h-32 w-32">
          <div className="absolute -inset-6 rounded-full bg-sky-200/30 blur-[40px]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-40 w-40 rounded-full border border-sky-200/80 ripple-wave" />
            <div className="absolute h-48 w-48 rounded-full border border-sky-100/70 ripple-wave-delay-1" />
            <div className="absolute h-56 w-56 rounded-full border border-sky-50/60 ripple-wave-delay-2" />
          </div>
          <div className="absolute inset-0 rounded-full bg-sky-200/40 blur-xl animate-waveGlow" />
          <div
            className="absolute inset-2 rounded-full bg-sky-100/30 blur-xl animate-waveGlow"
            style={{ animationDelay: '0.3s' }}
          />
          <img
            src={splashLogo || '/EVGo-Logo.png'}
            alt="EVGo logo"
            className="relative h-32 w-32 animate-[scalePulse_3s_ease-in-out_infinite]"
          />
        </div>
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3, 4].map((dot) => (
            <span
              key={dot}
              className="h-3 w-3 rounded-full bg-sky-500"
              style={{
                animation: `dotPulse 1.2s ease-in-out ${dot * 0.12}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [initialPath] = useState(() => location.pathname)
  const splashEligible = ['/login', '/register', '/'].includes(initialPath)
  const [showSplash, setShowSplash] = useState(splashEligible)



  // Enable swipe back gesture (swipe from left edge to go back)
  useSwipeBack({ enabled: true, threshold: 100, edgeWidth: 50 })

  // Enhanced Android back button handling for PWA
  useEffect(() => {
    if (!isInstalledPWA()) return

    // React Router's BrowserRouter automatically handles back button
    // We just need to ensure proper behavior for PWA

    // Track navigation history for back button
    const unlisten = () => {
      // React Router handles this automatically
    }

    return unlisten
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!splashEligible) return
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [splashEligible])

  return (
    <>
      {showSplash ? (
        <PageFallback />
      ) : (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              path="/login"
              element={
                <ProtectedRoute requireAuth={false}>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute requireAuth={false}>
                  <RegisterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/data"
              element={
                <ProtectedRoute>
                  <DataManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/account-info"
              element={
                <ProtectedRoute>
                  <AccountInfoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev"
              element={
                <ProtectedRoute>
                  <VehicleManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/list"
              element={
                <ProtectedRoute>
                  <VehicleListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/add"
              element={
                <ProtectedRoute>
                  <AddEVPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/edit/:id"
              element={
                <ProtectedRoute>
                  <EditEVPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/trips"
              element={
                <ProtectedRoute>
                  <VehicleTripsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/charging"
              element={
                <ProtectedRoute>
                  <VehicleChargingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/maintenance"
              element={
                <ProtectedRoute>
                  <VehicleMaintenancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/expenses"
              element={
                <ProtectedRoute>
                  <VehicleExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/reports"
              element={
                <ProtectedRoute>
                  <VehicleReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/history"
              element={
                <ProtectedRoute>
                  <VehicleChargingHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ev/calculator"
              element={
                <ProtectedRoute>
                  <EVCalculatorPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      )}
      <Toaster
        position="top-center"
        containerClassName="!top-4"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            padding: '5px 12px',
            maxWidth: '450px',
            fontSize: '12px',
            fontWeight: '500',
            lineHeight: '1.4',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: '#ffffff',
            border: '1px solid rgba(14, 165, 233, 0.3)',
          },
          success: {
            duration: 3000,
            style: {
              borderRadius: '10px',
              padding: '5px 12px',
              maxWidth: '500px',
              fontSize: '12px',
              fontWeight: '500',
              lineHeight: '1.4',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 3000,
            style: {
              borderRadius: '10px',
              padding: '5px 12px',
              maxWidth: '500px',
              fontSize: '12px',
              fontWeight: '500',
              lineHeight: '1.4',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#ef4444',
            },
          },
          loading: {
            duration: Infinity,
            style: {
              borderRadius: '10px',
              padding: '5px 12px',
              maxWidth: '450px',
              fontSize: '12px',
              fontWeight: '500',
              lineHeight: '1.4',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            },
            iconTheme: {
              primary: '#ffffff',
              secondary: '#3b82f6',
            },
          },
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
              <AppContent />
            </DialogProvider>
          </NotificationProvider>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App


