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
  LuSun,
  LuDatabase,
  LuDownload,
  LuLayoutList,
} from 'react-icons/lu'


import HeaderBar from '../components/layout/HeaderBar'
import { NotificationSettingsModal } from '../components/settings/NotificationSettingsModal'
import { CalculatorModal } from '../components/settings/CalculatorModal'
import { isAndroidApp, startNativeScan, setupNativeScanCallback, cleanupNativeScanCallback } from '../utils/androidBridge'
import { startWebQRScan, stopWebQRScan } from '../utils/webQRScanner'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useProfile } from '../lib/profileQueries'
import { useAppearance } from '../contexts/AppearanceContext'


const SettingsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { error: showError } = useNotification()
  const { data: profile, isLoading: isLoadingProfile } = useProfile()
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const { success } = useNotification()
  const { isDarkMode, toggleDarkMode, navStyle, setNavStyle } = useAppearance()

  const systemToggles: Record<string, boolean> = {
    notifications: true,
    hapticFeedback: true,
  }

  // Handle QR scan button click
  const handleQRScanClick = () => {
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

  // Auto-start QR scan if navigated from QRResult with openScanner state
  useEffect(() => {
    if (location.state?.openScanner) {
      navigate(location.pathname, { replace: true, state: {} })
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

  // Dark mode-aware class helpers
  const cardClass = isDarkMode
    ? 'bg-slate-800 border border-slate-700 shadow-xl shadow-black/20'
    : 'bg-white border border-slate-300 shadow-md'

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-800'
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500'
  const sectionTitle = isDarkMode ? 'text-slate-300' : 'text-slate-800'

  return (
    <div
      className="flex h-full flex-col overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: 'var(--app-home-bg)', color: 'var(--app-text-primary)' }}
    >
      <HeaderBar variant="page" title="Cài đặt" />
      <main className="flex-1 overflow-y-auto overscroll-contain p-4 pb-24">
        <div className="mx-auto max-w-md space-y-6">

          {/* Profile Section - Hero Card */}
          <section className={`relative overflow-hidden rounded-3xl p-6 transition-all hover:shadow-xl ${cardClass}`}>
            <div className={`absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full opacity-50 blur-2xl ${isDarkMode ? 'bg-blue-500/10' : 'bg-gradient-to-br from-sky-100 to-blue-50'}`} />

            <div className="relative z-10 flex items-center gap-5">
              {isLoadingProfile ? (
                <>
                  <div className={`h-20 w-20 animate-pulse rounded-full ring-4 ${isDarkMode ? 'bg-slate-700 ring-slate-800' : 'bg-slate-100 ring-slate-50'}`} />
                  <div className="space-y-2">
                    <div className={`h-6 w-32 animate-pulse rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                    <div className={`h-4 w-48 animate-pulse rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
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
                    <h3 className={`text-xl font-bold ${textPrimary}`}>
                      {profile?.full_name && profile.full_name !== 'Người dùng'
                        ? profile.full_name
                        : 'Người dùng EVNGo'}
                    </h3>
                    <p className={`text-sm font-medium ${textSecondary}`}>{profile?.email || 'Chưa cập nhật email'}</p>
                    <button
                      onClick={() => navigate('/account-info')}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-400 hover:underline"
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
            <h2 className={`mb-3 px-1 text-lg font-bold ${sectionTitle}`}>Quản lý chung</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">

              {/* Vehicle Management */}
              <button
                onClick={() => navigate('/ev/list')}
                className={`group flex flex-col items-center justify-center gap-3 rounded-3xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${cardClass}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <LuCar className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Danh sách xe</p>
                  <p className={`text-xs ${textSecondary}`}>Quản lý & Thêm xe</p>
                </div>
              </button>

              {/* Privacy/Shield - Coming Soon */}
              <button
                onClick={() => success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')}
                className={`relative group flex flex-col items-center justify-center gap-3 rounded-3xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${cardClass}`}
              >
                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  Đang phát triển
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                  <LuShield className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Bảo mật</p>
                  <p className={`text-xs ${textSecondary}`}>Mã PIN/Locker</p>
                </div>
              </button>

              {/* Data Sync */}
              <button
                onClick={() => navigate('/settings/data')}
                className={`group flex flex-col items-center justify-center gap-3 rounded-3xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${cardClass}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <LuDatabase className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Dữ liệu</p>
                  <p className={`text-xs ${textSecondary}`}>Đồng bộ Cloud</p>
                </div>
              </button>

              {/* Appearance Settings */}
              <button
                onClick={() => navigate('/settings/appearance')}
                className={`group flex flex-col items-center justify-center gap-3 rounded-3xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${cardClass}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <LuSettings2 className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Giao diện</p>
                  <p className={`text-xs ${textSecondary}`}>Tinh chỉnh giao diện</p>
                </div>
              </button>

              {/* Export Data - Coming Soon */}
              <button
                onClick={() => success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')}
                className={`relative group flex flex-col items-center justify-center gap-3 rounded-3xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 ${cardClass}`}
              >
                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                  Đang phát triển
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                  <LuDownload className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-bold ${textPrimary}`}>Xuất báo cáo</p>
                  <p className={`text-xs ${textSecondary}`}>Excel/PDF</p>
                </div>
              </button>

            </div>
          </section>

          {/* System Settings */}
          <section>
            <h2 className={`mb-3 px-1 text-lg font-bold ${sectionTitle}`}>Hệ thống & Giao diện</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              {/* Dark Mode — FUNCTIONAL */}
              <div className={`flex items-center justify-between gap-4 rounded-3xl p-4 transition-all ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-3xl shadow-inner ${isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {isDarkMode ? <LuSun className="h-5 w-5" /> : <LuMoon className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className={`font-bold ${textPrimary}`}>Giao diện tối</p>
                    <p className={`text-xs ${textSecondary}`}>
                      {isDarkMode ? 'Đang bật Dark Mode' : 'Chuyển sang Dark Mode'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isDarkMode}
                    onChange={toggleDarkMode}
                    className="peer sr-only"
                  />
                  <div className={`peer h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white ${isDarkMode
                    ? 'bg-amber-600 peer-checked:bg-amber-600'
                    : 'bg-slate-200 peer-checked:bg-amber-500'
                    }`} />
                </label>
              </div>

              {/* Menu Style Toggle */}
              <div className={`flex items-center justify-between gap-4 rounded-3xl p-4 transition-all ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-3xl shadow-inner ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                    <LuLayoutList className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`font-bold ${textPrimary}`}>Kiểu Menu</p>
                    <p className={`text-xs ${textSecondary}`}>
                      {navStyle === 'pill' ? 'Kiểu Pill mới' : 'Kiểu truyền thống'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={navStyle === 'pill'}
                    onChange={() => setNavStyle(navStyle === 'classic' ? 'pill' : 'classic')}
                    className="peer sr-only"
                  />
                  <div className={`peer h-6 w-11 rounded-full transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white ${isDarkMode
                    ? 'bg-slate-700 peer-checked:bg-purple-500'
                    : 'bg-slate-200 peer-checked:bg-purple-500'
                    }`} />
                </label>
              </div>

              {/* Notifications */}
              <div className={`flex items-center justify-between gap-4 rounded-3xl p-4 transition-all ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-3xl shadow-inner ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    <LuBell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${textPrimary}`}>Thông báo đẩy</p>
                      <span className="bg-red-500 text-white text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider">Đang phát triển</span>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>Cảnh báo sạc & đăng kiểm</p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={systemToggles.notifications}
                    onChange={() => {
                      success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')
                    }}
                    className="peer sr-only"
                  />
                  <div className={`peer h-6 w-11 rounded-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white ${isDarkMode ? 'bg-slate-700 peer-checked:bg-emerald-500' : 'bg-slate-200 peer-checked:bg-emerald-500'
                    }`} />
                </label>
              </div>

              {/* Haptic Feedback */}
              <div className={`flex items-center justify-between gap-4 rounded-3xl p-4 transition-all ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-3xl shadow-inner ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                    }`}>
                    <LuCpu className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${textPrimary}`}>Rung phản hồi</p>
                      <span className="bg-red-500 text-white text-[6.5px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider">Đang phát triển</span>
                    </div>
                    <p className={`text-xs ${textSecondary}`}>Cảm nhận khi chạm phím</p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={systemToggles.hapticFeedback}
                    onChange={() => {
                      success('Tính năng đang trong giai đoạn phát triển, sắp ra mắt!')
                    }}
                    className="peer sr-only"
                  />
                  <div className={`peer h-6 w-11 rounded-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white ${isDarkMode ? 'bg-slate-700 peer-checked:bg-blue-500' : 'bg-slate-200 peer-checked:bg-emerald-500'
                    }`} />
                </label>
              </div>
            </div>
          </section>

          {/* QR Scan Button */}
          <button
            onClick={handleQRScanClick}
            className="mb-8 flex w-full items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
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
          <div className="mb-8 text-center">
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>EVNGo Dashboard</p>
            <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>Version 1.0.0 • Build 2026.EV</p>
          </div>
        </div>
      </main>



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
