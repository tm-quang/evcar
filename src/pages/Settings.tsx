import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FaBell,
  FaCloud,
  FaDownload,
  FaUser,
  FaWallet,
  FaExclamationCircle,
  FaSignOutAlt,
  FaChevronRight,
  FaQrcode,
  FaCalculator,
  FaHandHoldingUsd,
  FaArchive,
} from 'react-icons/fa'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { NotificationSettingsModal } from '../components/settings/NotificationSettingsModal'
import { CalculatorModal } from '../components/settings/CalculatorModal'
import { getCurrentProfile, type ProfileRecord } from '../lib/profileService'
import { queryClient } from '../lib/react-query'
import { useDialog } from '../contexts/dialogContext.helpers'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useNotification } from '../contexts/notificationContext.helpers'
import { clearUserCache } from '../lib/userCache'
import { isAndroidApp, startNativeScan, setupNativeScanCallback, cleanupNativeScanCallback } from '../utils/androidBridge'
import { startWebQRScan, stopWebQRScan } from '../utils/webQRScanner'

const financeToggleSettings = [
  {
    id: 'autoCategorize',
    title: 'Tự động phân loại',
    description: 'AI phân loại giao dịch',
    icon: <FaWallet className="h-5 w-5" />,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    id: 'budgetSuggestion',
    title: 'Gợi ý hạn mức',
    description: 'Dựa trên lịch sử chi tiêu',
    icon: <FaExclamationCircle className="h-5 w-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
  },
  {
    id: 'autoBackup',
    title: 'Tự động sao lưu',
    description: '02:00 sáng mỗi ngày',
    icon: <FaCloud className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
]

const SettingsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { showConfirm } = useDialog()
  const { error: showError } = useNotification()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const { success } = useNotification()

  const [financeToggles, setFinanceToggles] = useState<Record<string, boolean>>({
    autoCategorize: false,
    budgetSuggestion: true,
    autoBackup: true,
  })

  // Load profile and check admin status
  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (mounted) {
        setIsLoadingProfile(true)
      }
      try {
        const profileData = await getCurrentProfile()
        if (mounted) {
          setProfile(profileData)
          setIsLoadingProfile(false)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading profile:', errorMessage)

        if (mounted) {
          setProfile(null)
          setIsLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [])

  // Handle QR scan button click
  const handleQRScanClick = () => {
    if (isAndroidApp()) {
      // Cleanup any existing callback first
      cleanupNativeScanCallback()
      // Setup callback to handle scan result
      setupNativeScanCallback((result: string) => {
        success('Đã quét mã thành công!')
        cleanupNativeScanCallback()
        // Navigate to result page
        navigate('/qr-result', { state: { scanResult: result } })
      })
      // Start native scan directly
      startNativeScan()
    } else {
      // Start web QR scan directly (fullscreen camera, no modal)
      startWebQRScan({
        onSuccess: (result: string) => {
          success('Đã quét mã thành công!')
          // Navigate to result page
          navigate('/qr-result', { state: { scanResult: result } })
        },
        onError: (error: string) => {
          showError(error)
        }
      })
    }
  }

  // Auto-start QR scan if navigated from QRResult with openScanner state
  useEffect(() => {
    if (location.state?.openScanner) {
      // Clear state first to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} })
      // Start QR scan
      if (isAndroidApp()) {
        cleanupNativeScanCallback()
        setupNativeScanCallback((result: string) => {
          success('Đã quét mã thành công!')
          cleanupNativeScanCallback()
          navigate('/qr-result', { state: { scanResult: result } })
        })
        startNativeScan()
      } else {
        startWebQRScan({
          onSuccess: (result: string) => {
            success('Đã quét mã thành công!')
            navigate('/qr-result', { state: { scanResult: result } })
          },
          onError: (error: string) => {
            showError(error)
          }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupNativeScanCallback()
      stopWebQRScan()
    }
  }, [])

  const handleLogout = async () => {
    await showConfirm('Bạn có chắc chắn muốn đăng xuất?', async () => {
      const supabase = getSupabaseClient()

      sessionStorage.removeItem('showWelcomeModal')

      try {
        const { clearPreloadTimestamp } = await import('../lib/dataPreloader')
        const { queryClient } = await import('../lib/react-query')

        await clearPreloadTimestamp()
        queryClient.clear()
      } catch (error) {
        console.warn('Error clearing cache:', error)
      }

      clearUserCache()
      queryClient.clear()

      try {
        localStorage.removeItem('bofin-auth-token')
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Error clearing auth storage:', error)
      }

      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (error) {
        console.warn('SignOut error (ignored):', error)
      }

      // Đợi một chút để đảm bảo dialog đóng hoàn toàn trước khi redirect
      await new Promise(resolve => setTimeout(resolve, 150))

      window.location.replace('/login')
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Cài đặt" />
      <main className="flex-1 overflow-y-auto overscroll-contain p-4 pb-24">
        <div className="mx-auto max-w-md space-y-6">

          {/* Profile Section - Hero Card */}
          <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg border border-slate-100 transition-all hover:shadow-xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-sky-100 to-blue-50 opacity-50 blur-2xl" />

            <div className="relative z-10 flex items-center gap-5">
              {isLoadingProfile ? (
                <>
                  <div className="h-20 w-20 animate-pulse rounded-full bg-slate-100 ring-4 ring-slate-50" />
                  <div className="space-y-2">
                    <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="h-20 w-20 rounded-full object-cover ring-4 ring-slate-50 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white ring-4 ring-slate-50 shadow-md">
                        <FaUser className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-green-500 ring-2 ring-white" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">
                      {profile?.full_name && profile.full_name !== 'Người dùng'
                        ? profile.full_name
                        : 'Người dùng BoFin'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">{profile?.email || 'Chưa cập nhật email'}</p>
                    <button
                      onClick={() => navigate('/account-info')}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      Chỉnh sửa hồ sơ <FaChevronRight className="h-2 w-2" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Main Grid Menu */}
          <section>
            <h2 className="mb-3 px-1 text-lg font-bold text-slate-800">Quản lý chung</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">


              {/* Notification Settings */}
              <button
                onClick={() => setIsNotificationSettingsOpen(true)}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaBell className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Thông báo</p>
                  <p className="text-xs text-slate-500">Nhắc nhở</p>
                </div>
              </button>

              {/* QR Scanner */}
              <button
                onClick={handleQRScanClick}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaQrcode className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Quét QR</p>
                  <p className="text-xs text-slate-500">Tiện ích</p>
                </div>
              </button>

              {/* QR Result History */}
              <button
                onClick={() => navigate('/qr-result')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaQrcode className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Lịch sử QR</p>
                  <p className="text-xs text-slate-500">Danh sách</p>
                </div>
              </button>

              {/* Export Data */}
              <button
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaDownload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Xuất dữ liệu</p>
                  <p className="text-xs text-slate-500">Excel/PDF</p>
                </div>
              </button>

              {/* Calculator */}
              <button
                onClick={() => setIsCalculatorModalOpen(true)}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaCalculator className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Máy tính</p>
                  <p className="text-xs text-slate-500">Bàn phím</p>
                </div>
              </button>

              {/* Account Info (Redundant with header but good for quick access) */}
              <button
                onClick={() => navigate('/account-info')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaUser className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Tài khoản</p>
                  <p className="text-xs text-slate-500">Bảo mật</p>
                </div>
              </button>

              {/* Archive 2025 */}
              <button
                onClick={() => navigate('/archive')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaArchive className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Lưu trữ</p>
                  <p className="text-xs text-slate-500">Dữ liệu 2025</p>
                </div>
              </button>

              {/* Debt Manager - Sổ nợ */}
              <button
                onClick={() => navigate('/debts')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner group-hover:scale-110 transition-transform">
                  <FaHandHoldingUsd className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Sổ nợ</p>
                  <p className="text-xs text-slate-500">Quản lý</p>
                </div>
              </button>

            </div>
          </section>

          {/* Finance Utilities */}
          <section>
            <h2 className="mb-3 px-1 text-lg font-bold text-slate-800">Tiện ích tài chính</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {financeToggleSettings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-lg border border-slate-100 transition-all hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.color} shadow-inner`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={financeToggles[item.id]}
                      onChange={() =>
                        setFinanceToggles((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-red-50 p-4 text-red-600 shadow-lg border border-red-100 transition-all hover:bg-red-100 hover:shadow-xl active:scale-95"
          >
            <FaSignOutAlt className="h-5 w-5" />
            <span className="font-bold">Đăng xuất khỏi thiết bị</span>
          </button>

          <div className="text-center text-xs text-slate-400 pt-4">
            <p>BO fin App v1.0.2</p>
            <p>Designed by MWang</p>
          </div>

        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />


      <CalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
      />

      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />

    </div>
  )
}

export default SettingsPage

