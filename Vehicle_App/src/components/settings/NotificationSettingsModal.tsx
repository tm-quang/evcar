import { useState, useEffect } from 'react'
import { FaTimes, FaBell, FaMobileAlt, FaExclamationCircle } from 'react-icons/fa'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'

type NotificationSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
}

type NotificationPreference = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

const STORAGE_KEY = 'ev_notification_preferences'

const defaultPreferences: Record<string, boolean> = {
  vehicleUpdates: true,
  maintenance: true,
  expenses: true,
  charging: true,
}

const notificationSettings: Omit<NotificationPreference, 'enabled'>[] = [
  {
    id: 'vehicleUpdates',
    title: 'Cập nhật xe',
    description: 'Nhận thông báo khi thêm, sửa hoặc xóa thông tin phương tiện.',
    icon: <FaBell className="h-5 w-5" />,
  },
  {
    id: 'maintenance',
    title: 'Nhắc nhở bảo dưỡng',
    description: 'Thông báo khi đến kỳ bảo dưỡng định kỳ theo số km hoặc ngày.',
    icon: <FaMobileAlt className="h-5 w-5" />,
  },
  {
    id: 'expenses',
    title: 'Ghi nhận chi phí',
    description: 'Thông báo xác nhận sau khi thêm các chi phí phát sinh cho xe.',
    icon: <FaExclamationCircle className="h-5 w-5" />,
  },
  {
    id: 'charging',
    title: 'Cập nhật sạc điện',
    description: 'Thông báo kết quả sau mỗi phiên sạc hoặc nạp nhiên liệu.',
    icon: <FaBell className="h-5 w-5" />,
  },
]

// Load notification preferences from localStorage
const loadNotificationPreferences = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Error loading notification preferences:', error)
  }
  return { ...defaultPreferences }
}

// Save notification preferences to localStorage
const saveNotificationPreferences = (preferences: Record<string, boolean>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Error saving notification preferences:', error)
  }
}

export const NotificationSettingsModal = ({ isOpen, onClose }: NotificationSettingsModalProps) => {
  const { success } = useNotification()
  const [preferences, setPreferences] = useState<Record<string, boolean>>(defaultPreferences)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      const loaded = loadNotificationPreferences()
      setPreferences(loaded)
    }
  }, [isOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleToggle = (id: string) => {
    setPreferences((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      saveNotificationPreferences(preferences)
      success('Đã cập nhật cài đặt thông báo thành công!')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error saving notification preferences:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200">
      <div className="flex w-full max-w-md mx-auto max-h-[90vh] flex-col rounded-t-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 mt-12 sm:mt-0">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Cài đặt thông báo</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Chủ động kiểm soát thông báo tài chính quan trọng</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
          >
            <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-3">
            {notificationSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                    {setting.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{setting.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{setting.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={preferences[setting.id] ?? false}
                    onChange={() => handleToggle(setting.id)}
                    className="peer sr-only"
                  />
                  <span className="absolute h-full w-full rounded-full bg-slate-200 transition peer-checked:bg-sky-500" />
                  <span className="absolute left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white transition peer-checked:left-[calc(100%-1.25rem)] peer-checked:-translate-x-0" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <ModalFooterButtons
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmText={isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          isSubmitting={isSubmitting}
          disabled={isSubmitting}
        />
      </div>
    </div>
  )
}


