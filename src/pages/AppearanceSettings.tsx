import { useState } from 'react'
import {
  LuPalette,
  LuLayoutTemplate,
  LuType,
  LuSparkles,
  LuCheck,
  LuRotateCcw,
  LuMoon,
  LuSun,
} from 'react-icons/lu'
import HeaderBar from '../components/layout/HeaderBar'
import { useAppearance } from '../contexts/AppearanceContext'
import type { AppearanceSettings } from '../contexts/AppearanceContext'
import { useNotification } from '../contexts/notificationContext.helpers'

const fontOptions = [
  { name: 'Roboto (Mặc định)', value: "'Roboto', sans-serif" },
  { name: 'Inter (Hiện đại)', value: "'Inter', sans-serif" },
  { name: 'Outfit (Sang trọng)', value: "'Outfit', sans-serif" },
  { name: 'Montserrat (Đậm chất)', value: "'Montserrat', sans-serif" },
]

const colorOptions = [
  '#F7F9FC',
  '#FFFFFF',
  '#F0FDF4',
  '#FFFBEB',
  '#FEF2F2',
  '#F5F3FF',
  '#0F172A',
  '#09090B',
]

const accentOptions = [
  { name: 'Sky Blue', value: '#0ea5e9' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
]

const AppearanceSettingsPage = () => {
  const { settings, updateSettings, resetSettings, isLoading, isDarkMode, toggleDarkMode } = useAppearance()
  const { success } = useNotification()
  const [isSaving, setIsSaving] = useState(false)

  const handleUpdate = async (newSettings: Partial<AppearanceSettings>) => {
    await updateSettings(newSettings)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      success('Đã lưu thay đổi giao diện!')
    }, 500)
  }

  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục giao diện mặc định?')) {
      await resetSettings()
      success('Đã khôi phục giao diện mặc định')
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex h-full items-center justify-center transition-colors duration-500"
        style={{ backgroundColor: 'var(--app-home-bg)', color: 'var(--app-text-primary)' }}
      >
        Đang tải...
      </div>
    )
  }

  // Dark mode conditional styles
  const sectionCard = isDarkMode
    ? 'rounded-3xl bg-slate-800 p-6 border border-slate-700 shadow-xl shadow-black/20'
    : 'rounded-3xl bg-white p-6 shadow-md border border-slate-200'
  const labelClass = isDarkMode ? 'text-slate-400' : 'text-slate-400'
  const fontBtnActive = isDarkMode ? 'border-violet-500 bg-violet-900/20' : 'border-violet-500 bg-violet-50'
  const fontBtnInactive = isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
  const fontBtnText = isDarkMode ? 'text-slate-200' : 'text-slate-700'
  const resetBtnClass = isDarkMode
    ? 'border-2 border-slate-700 text-slate-400 hover:bg-slate-800 active:scale-95 transition-all'
    : 'border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all'
  const saveBtnClass = isDarkMode
    ? 'bg-white text-slate-900 hover:opacity-90 active:scale-95 transition-all shadow-xl'
    : 'bg-slate-900 text-white hover:opacity-90 active:scale-95 transition-all shadow-xl'

  return (
    <div
      className="flex h-full flex-col overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: 'var(--app-home-bg)', color: 'var(--app-text-primary)' }}
    >
      <HeaderBar variant="page" title="Giao diện website" />

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mx-auto max-w-md space-y-6">

          {/* Dark Mode Toggle */}
          <section className={sectionCard}>
            <div className="flex items-center gap-2 mb-4">
              {isDarkMode
                ? <LuSun className="h-5 w-5 text-amber-400" />
                : <LuMoon className="h-5 w-5 text-indigo-600" />
              }
              <h3 className={`text-sm font-black uppercase tracking-widest ${labelClass}`}>Chế độ hiển thị</h3>
            </div>

            <button
              onClick={toggleDarkMode}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                isDarkMode
                  ? 'border-indigo-500/30 bg-indigo-500/10'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                  isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {isDarkMode
                    ? <LuSun className="h-6 w-6" />
                    : <LuMoon className="h-6 w-6" />
                  }
                </div>
                <div className="text-left">
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {isDarkMode ? 'Dark Mode đang bật' : 'Light Mode đang bật'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isDarkMode ? 'Nhấn để chuyển sang Light Mode' : 'Nhấn để chuyển sang Dark Mode'}
                  </p>
                </div>
              </div>
              <div className={`w-14 h-7 rounded-full flex items-center px-1 transition-all shadow-inner ${
                isDarkMode ? 'bg-indigo-600 justify-end shadow-indigo-900/50' : 'bg-slate-300 justify-start'
              }`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md transition-all" />
              </div>
            </button>
          </section>

          {/* Preview Section */}
          <section className={sectionCard}>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <LuSparkles className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className={`text-sm font-black uppercase tracking-widest ${labelClass} mb-4`}>Xem trước</h3>

            <div
              className={`rounded-2xl p-4 border transition-all duration-700 shadow-inner ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}
              style={{ backgroundColor: isDarkMode ? '#1E293B' : settings.home_bg_color }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl shadow-sm flex items-center justify-center text-white"
                    style={{ backgroundColor: settings.accent_color }}
                  >
                    <LuCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className={`h-2 w-24 rounded ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`} />
                    <div className={`h-2 w-16 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                  </div>
                </div>
                <div className={`h-20 w-full border shadow-sm rounded-3xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`} />
              </div>
            </div>
          </section>

          {/* Background Color — only relevant in light mode */}
          {!isDarkMode && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <LuLayoutTemplate className="h-4 w-4 text-blue-600" />
                <h2 className={`text-sm font-black uppercase tracking-widest ${labelClass}`}>Màu nền trang</h2>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleUpdate({ home_bg_color: color })}
                    className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-90 ${
                      settings.home_bg_color === color ? 'border-blue-500 scale-105 shadow-md' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {settings.home_bg_color === color && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-[inherit]">
                        <div className="bg-white rounded-full p-1 shadow-sm">
                          <LuCheck className="h-4 w-4 text-blue-500" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
                <div className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <input
                    type="color"
                    value={settings.home_bg_color}
                    onChange={(e) => handleUpdate({ home_bg_color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <LuPalette className="h-6 w-6 text-slate-400" />
                </div>
              </div>
            </section>
          )}

          {/* Accent Color */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <LuPalette className="h-4 w-4 text-emerald-600" />
              <h2 className={`text-sm font-black uppercase tracking-widest ${labelClass}`}>Màu sắc chủ đạo</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {accentOptions.map((accent) => (
                <button
                  key={accent.value}
                  onClick={() => handleUpdate({ accent_color: accent.value })}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all ${
                    settings.accent_color === accent.value
                      ? 'border-current shadow-md ' + (isDarkMode ? 'bg-slate-800' : 'bg-white')
                      : 'border-transparent ' + (isDarkMode ? 'bg-slate-800/50 opacity-60' : 'bg-slate-100 opacity-60')
                  }`}
                  style={{ color: settings.accent_color === accent.value ? accent.value : 'inherit' }}
                >
                  <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: accent.value }} />
                  <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{accent.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <LuType className="h-4 w-4 text-violet-600" />
              <h2 className={`text-sm font-black uppercase tracking-widest ${labelClass}`}>Kiểu chữ</h2>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => handleUpdate({ font_family: font.value })}
                  className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${
                    settings.font_family === font.value ? fontBtnActive : fontBtnInactive
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  <span className={`text-sm font-bold ${fontBtnText}`}>{font.name}</span>
                  {settings.font_family === font.value && <LuCheck className="h-5 w-5 text-violet-500" />}
                </button>
              ))}
            </div>
          </section>

          {/* Save & Reset Actions */}
          <div className="pt-4 grid grid-cols-2 gap-4">
            <button
              onClick={handleReset}
              className={`flex items-center justify-center gap-2 py-4 rounded-3xl font-bold text-sm ${resetBtnClass}`}
            >
              <LuRotateCcw className="h-4 w-4" />
              Khôi phục
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center justify-center gap-2 py-4 rounded-3xl font-bold text-sm disabled:opacity-50 ${saveBtnClass}`}
            >
              {isSaving ? 'Đang lưu...' : (
                <>
                  <LuCheck className="h-4 w-4" />
                  Lưu giao diện
                </>
              )}
            </button>
          </div>

        </div>
      </div>

    </div>
  )
}

export default AppearanceSettingsPage
