import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LuUser,
  LuBell,
  LuShield,
  LuChevronRight,
  LuZap,
  LuSettings2,
  LuCpu,
  LuCar,
  LuMoon,
  LuDatabase,
  LuDownload,
} from 'react-icons/lu'

import { VehicleFooterNav } from '../components/ev/VehicleFooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { NotificationSettingsModal } from '../components/settings/NotificationSettingsModal'
import { CalculatorModal } from '../components/settings/CalculatorModal'
import { isAndroidApp, startNativeScan, setupNativeScanCallback, cleanupNativeScanCallback } from '../utils/androidBridge'
import { startWebQRScan, stopWebQRScan } from '../utils/webQRScanner'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useProfile } from '../lib/profileQueries'


const systemSettings = [
  {
    id: 'darkMode',
    title: 'Giao diện tối',
    description: 'Chuyển sang chế độ Dark Mode',
    icon: <LuMoon className="h-5 w-5" />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
  },
  {
    id: 'notifications',
    title: 'Thông báo đẩy',
    description: 'Cảnh báo sạc & đăng kiểm',
    icon: <LuBell className="h-5 w-5" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  {
    id: 'hapticFeedback',
    title: 'Rung phản hồi',
    description: 'Cảm nhận khi chạm phím',
    icon: <LuCpu className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
]



const SettingsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { error: showError } = useNotification()
  const { data: profile, isLoading: isLoadingProfile } = useProfile()
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const { success } = useNotification()

  const [systemToggles] = useState<Record<string, boolean>>({
    darkMode: false,
    notifications: true,
    hapticFeedback: true,
  })

  // Load profile handled by useProfile hook

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



  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="Cài đặt" />
      <main className="flex-1 overflow-y-auto overscroll-contain p-4 pb-24">
        <div className="mx-auto max-w-md space-y-6">

          {/* Profile Section - Hero Card */}
          <section className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-md border border-slate-300 transition-all hover:shadow-xl">
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
                        <LuUser className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-green-500 ring-2 ring-white" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">
                      {profile?.full_name && profile.full_name !== 'Người dùng'
                        ? profile.full_name
                        : 'Người dùng EVNGo'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">{profile?.email || 'Chưa cập nhật email'}</p>
                    <button
                      onClick={() => navigate('/account-info')}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                    >
                      Chỉnh sửa hồ sơ <LuChevronRight className="h-2 w-2" />
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

              {/* Vehicle Management */}
              <button
                onClick={() => navigate('/ev/list')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-md border border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                  <LuCar className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Danh sách xe</p>
                  <p className="text-xs text-slate-500">Quản lý & Thêm xe</p>
                </div>
              </button>


              {/* Privacy/Shield */}
              <button
                onClick={() => success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')}
                className="relative group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-md border border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  Đang phát triển
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-50 text-sky-600 shadow-inner group-hover:scale-110 transition-transform">
                  <LuShield className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Bảo mật</p>
                  <p className="text-xs text-slate-500">Mã PIN/Locker</p>
                </div>
              </button>

              {/* Data Sync */}
              <button
                onClick={() => navigate('/settings/data')}
                className="group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-md border border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                  <LuDatabase className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Dữ liệu</p>
                  <p className="text-xs text-slate-500">Đồng bộ Cloud</p>
                </div>
              </button>

              {/* Advanced UI Settings */}
              <button
                onClick={() => success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')}
                className="relative group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-md border border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  Đang phát triển
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 shadow-inner group-hover:scale-110 transition-transform">
                  <LuSettings2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Giao diện</p>
                  <p className="text-xs text-slate-500">Tinh chỉnh UI</p>
                </div>
              </button>

              {/* Export Data */}
              <button
                onClick={() => success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')}
                className="relative group flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 text-center shadow-md border border-slate-300 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              >
                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  Đang phát triển
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-teal-50 text-teal-600 shadow-inner group-hover:scale-110 transition-transform">
                  <LuDownload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Xuất báo cáo</p>
                  <p className="text-xs text-slate-500">Excel/PDF</p>
                </div>
              </button>

            </div>
          </section>

          {/* System Settings */}
          <section>
            <h2 className="mb-3 px-1 text-lg font-bold text-slate-800">Hệ thống & Giao diện</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {systemSettings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-md border border-slate-300 transition-all hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-3xl ${item.bg} ${item.color} shadow-inner`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <span className="bg-red-500 text-white text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider">Đang phát triển</span>
                      </div>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={systemToggles[item.id]}
                      onChange={() => {
                        success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')
                      }}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* QR Scan Button */}
          <button
            onClick={handleQRScanClick}
            className="mb-8 flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-white/20 p-3">
                <LuZap className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h4 className="text-base font-black">Quét mã QR</h4>
                <p className="text-xs opacity-80">Đồng bộ dữ liệu</p>
              </div>
            </div>
            <LuChevronRight className="h-5 w-5 opacity-60" />
          </button>

          {/* Footer Info */}
          <div className="mb-8 text-center text-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">EVNGo Dashboard</p>
            <p className="text-[10px] mt-1">Version 1.0.0 • Build 2026.EV</p>
          </div>
        </div>
      </main>

      <VehicleFooterNav onAddClick={() => navigate('/ev/charging')} />


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

