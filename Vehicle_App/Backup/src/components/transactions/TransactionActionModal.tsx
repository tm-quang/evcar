import { FaTrash, FaEdit, FaEye } from 'react-icons/fa'

type TransactionActionModalProps = {
  isOpen: boolean
  onClose: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}

export const TransactionActionModal = ({
  isOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
}: TransactionActionModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
      {/* Modal - Always centered */}
      <div className="w-full max-w-md flex flex-col gap-2 rounded-t-3xl sm:rounded-2xl bg-white p-2 shadow-[0_10px_40px_rgba(0,0,0,0.2)] ring-1 ring-slate-200 max-h-[80vh] overflow-y-auto safe-area-bottom mt-12 sm:mt-0 animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* View Button */}
        <button
          onClick={onView}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-blue-50 active:bg-blue-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <FaEye className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Xem</p>
            <p className="text-xs text-slate-500">Xem chi tiết giao dịch</p>
          </div>
        </button>

        {/* Edit Button */}
        <button
          onClick={onEdit}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-sky-50 active:bg-sky-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <FaEdit className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Sửa</p>
            <p className="text-xs text-slate-500">Chỉnh sửa thông tin giao dịch</p>
          </div>
        </button>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-red-50 active:bg-red-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <FaTrash className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Xóa</p>
            <p className="text-xs text-slate-500">Xóa vĩnh viễn giao dịch này</p>
          </div>
        </button>

        {/* Close Button */}
        <div className="mt-1 flex justify-center">
          <button
            onClick={onClose}
            className="w-1/2 flex items-center justify-center rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:from-slate-200 hover:to-slate-300 hover:shadow-md active:scale-95"
          >
            <span className="ml-2">Đóng</span>
          </button>
        </div>
      </div>
    </div>
  )
}


