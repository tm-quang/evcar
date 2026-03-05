import { FaTimes, FaImage, FaFolder, FaCog } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { getCachedAdminStatus } from '../../lib/adminService'
import { useNotification } from '../../contexts/notificationContext.helpers'

interface AdminOption {
  id: string
  title: string
  description: string
  icon: typeof FaImage
  iconColor: string
  path?: string
  onClick?: () => void
  errorMessage: string
}

export interface AdminSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onIconManagementClick?: () => void
}

export const AdminSettingsModal = ({ 
  isOpen, 
  onClose,
  onIconManagementClick 
}: AdminSettingsModalProps) => {
  const navigate = useNavigate()
  const { error: showError } = useNotification()

  if (!isOpen) return null

  const handleOptionClick = async (option: AdminOption) => {
    // Check admin status before navigation
    try {
      const adminStatus = await getCachedAdminStatus()
      if (!adminStatus) {
        showError(option.errorMessage)
        return
      }
      
      if (option.onClick) {
        option.onClick()
      } else if (option.path) {
        navigate(option.path)
        onClose()
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      showError('Không thể kiểm tra quyền truy cập. Vui lòng thử lại.')
    }
  }

  const adminOptions: AdminOption[] = [
    {
      id: 'icon-management',
      title: 'Quản lý Icons',
      description: 'Thêm, sửa, xóa icons cho hạng mục',
      icon: FaImage,
      iconColor: 'bg-purple-100 text-purple-600',
      onClick: () => {
        if (onIconManagementClick) {
          onIconManagementClick()
          onClose()
        }
      },
      errorMessage: 'Bạn không có quyền truy cập. Chỉ admin mới có thể quản lý icons.',
    },
    {
      id: 'default-categories',
      title: 'Quản lý Hạng mục Mặc định',
      description: 'Chỉnh sửa danh sách hạng mục Thu - Chi mặc định',
      icon: FaFolder,
      iconColor: 'bg-indigo-100 text-indigo-600',
      path: '/admin-categoriesicon',
      errorMessage: 'Bạn không có quyền truy cập. Chỉ admin mới có thể quản lý hạng mục mặc định.',
    },
    {
      id: 'icon-images',
      title: 'Icon_images',
      description: 'Quản lý thư viện icon PNG/SVG cho hạng mục',
      icon: FaImage,
      iconColor: 'bg-emerald-100 text-emerald-600',
      path: '/admin-icon-images',
      errorMessage: 'Bạn không có quyền truy cập. Chỉ admin mới có thể quản lý icon images.',
    },
    {
      id: 'system-settings',
      title: 'Cài đặt hệ thống',
      description: 'Quản lý logo, ảnh, nội dung, menu, logic hệ thống',
      icon: FaCog,
      iconColor: 'bg-sky-100 text-sky-600',
      path: '/admin-settings',
      errorMessage: 'Bạn không có quyền truy cập. Chỉ admin mới có thể quản lý cài đặt hệ thống.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 pointer-events-none">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl mt-12 sm:mt-0 max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quản trị hệ thống</h2>
            <p className="mt-1 text-sm text-slate-500">Quản lý icons và cấu hình hệ thống</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {adminOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${option.iconColor}`}>
                      <IconComponent className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{option.title}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
