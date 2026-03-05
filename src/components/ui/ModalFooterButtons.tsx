import React from 'react'

interface ModalFooterButtonsProps {
  onCancel: () => void
  onConfirm: () => void
  confirmText: string
  cancelText?: string
  isSubmitting?: boolean
  disabled?: boolean
  confirmButtonType?: 'button' | 'submit'
  formId?: string
  className?: string
  fixed?: boolean
}

export const ModalFooterButtons: React.FC<ModalFooterButtonsProps> = ({
  onCancel,
  onConfirm,
  confirmText,
  cancelText = 'Hủy',
  isSubmitting = false,
  disabled = false,
  confirmButtonType = 'button',
  formId,
  className = '',
  fixed = false,
}) => {
  const footerClasses = fixed
    ? `fixed bottom-0 left-0 right-0 z-40 shrink-0 bg-[#F7F9FC] px-4 py-4 shadow-lg sm:px-6 ${className}`
    : `shrink-0 bg-[#F7F9FC] px-4 py-3 sm:px-6 ${className}`

  const containerClasses = fixed
    ? 'mx-auto flex w-full max-w-md gap-3'
    : 'flex gap-2 sm:gap-3'

  return (
    <div className={footerClasses}>
      <div className={containerClasses}>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl border-2 border-red-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50 sm:py-3 sm:text-base"
          disabled={isSubmitting || disabled}
        >
          {cancelText}
        </button>
        <button
          type={confirmButtonType}
          onClick={confirmButtonType === 'button' ? onConfirm : undefined}
          form={formId}
          className="flex-1 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 sm:py-3 sm:text-base whitespace-nowrap min-w-fit"
          disabled={isSubmitting || disabled}
        >
          {confirmText}
        </button>
      </div>
    </div>
  )
}


