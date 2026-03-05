import { FaCheck, FaTimes, FaExclamationTriangle, FaInfoCircle, FaExclamationCircle } from 'react-icons/fa'
import type { DialogType } from '../../contexts/dialogContext.helpers'

type ConfirmDialogProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  middleText?: string // Nút ở giữa (ví dụ: "Ẩn ví")
  showCancel?: boolean
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  onMiddle?: () => void | Promise<void> // Handler cho nút giữa
  isLoading?: boolean
}

const getDialogConfig = (type: DialogType = 'confirm') => {
  const configs = {
    confirm: {
      icon: FaInfoCircle,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      titleColor: 'text-slate-900',
      buttonColor: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      defaultTitle: 'Xác nhận',
    },
    alert: {
      icon: FaExclamationCircle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-100',
      titleColor: 'text-slate-900',
      buttonColor: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
      defaultTitle: 'Thông báo',
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-100',
      titleColor: 'text-orange-900',
      buttonColor: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      defaultTitle: 'Cảnh báo',
    },
    info: {
      icon: FaInfoCircle,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      titleColor: 'text-slate-900',
      buttonColor: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      defaultTitle: 'Thông tin',
    },
    success: {
      icon: FaCheck,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-100',
      titleColor: 'text-slate-900',
      buttonColor: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
      defaultTitle: 'Thành công',
    },
    error: {
      icon: FaExclamationTriangle,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-100',
      titleColor: 'text-rose-900',
      buttonColor: 'from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
      defaultTitle: 'Lỗi',
    },
  }
  return configs[type] || configs.confirm
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'confirm',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  middleText,
  showCancel = true,
  onConfirm,
  onCancel,
  onMiddle,
  isLoading = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null

  const config = getDialogConfig(type)
  const Icon = config.icon

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm()
    } else {
      onClose()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }

  const handleMiddle = async () => {
    if (onMiddle) {
      await onMiddle()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={!isLoading ? handleCancel : undefined}
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-md transform rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] ring-1 ring-slate-200 transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close button */}
        {!isLoading && (
          <button
            onClick={handleCancel}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Icon and Title */}
          <div className="mb-5 flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${config.iconBg} shadow-lg`}>
              <Icon className={`h-7 w-7 ${config.iconColor}`} />
            </div>
            <div className="flex-1 pt-1.5">
              <h3 className={`text-xl font-bold ${config.titleColor}`}>
                {title || config.defaultTitle}
              </h3>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-base leading-relaxed text-slate-700">{message}</p>
          </div>

          {/* Actions */}
          {middleText ? (
            // 3 nút: Hủy | Ẩn ví | Xóa
            <div className="flex gap-3">
              {showCancel && (
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={handleMiddle}
                disabled={isLoading}
                className="flex-1 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 hover:border-amber-400 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {middleText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 rounded-xl bg-gradient-to-r ${config.buttonColor} px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLoading ? 'cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          ) : (
            // 2 nút: Hủy | Xác nhận (như cũ)
          <div className={`flex gap-3 ${showCancel ? '' : 'justify-end'}`}>
            {showCancel && (
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 rounded-xl bg-gradient-to-r ${config.buttonColor} px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                isLoading ? 'cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

