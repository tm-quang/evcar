import { useEffect, useState, useEffectEvent } from 'react'
import { FaInfoCircle, FaChevronDown, FaPaperPlane, FaPlus, FaFolder, FaTasks, FaHandHoldingHeart, FaCog, FaShoppingCart, FaMicrophone, FaPiggyBank } from 'react-icons/fa'
import HeaderBar from '../layout/HeaderBar'

type QuickAction = {
  id: string
  label: string
  enabled: boolean
}

type QuickActionsSettingsProps = {
  isOpen: boolean
  onClose: () => void
  actions: QuickAction[]
  onUpdate: (actions: QuickAction[]) => void
}

// Map action IDs to icons and descriptions
const ACTION_INFO: Record<string, { icon: typeof FaPaperPlane; description: string; color: string; bgGradient: string }> = {
  'send-money': {
    icon: FaPaperPlane,
    description: 'Gửi tiền hoặc chuyển khoản nhanh chóng',
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-cyan-50',
  },
  'add-transaction': {
    icon: FaPlus,
    description: 'Thêm giao dịch thu chi mới vào sổ sách',
    color: 'text-green-600',
    bgGradient: 'from-green-50 to-teal-50',
  },
  'categories': {
    icon: FaFolder,
    description: 'Quản lý và xem các hạng mục thu chi',
    color: 'text-indigo-600',
    bgGradient: 'from-indigo-50 to-purple-50',
  },
  'budgets': {
    icon: FaFolder,
    description: 'Quản lý hạn mức chi tiêu cho từng hạng mục theo tháng/quý/năm',
    color: 'text-red-600',
    bgGradient: 'from-red-50 to-pink-50',
  },
  'notes-plans': {
    icon: FaTasks,
    description: 'Quản lý công việc, ghi chú và kế hoạch nhắc nhở trong tháng',
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-pink-50',
  },
  'tasks': {
    icon: FaTasks,
    description: 'Theo dõi tiến độ và quản lý công việc (đã chuyển sang Công việc, kế hoạch)',
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-pink-50',
  },
  'reminder': {
    icon: FaHandHoldingHeart,
    description: 'Tạo nhắc nhở cho các khoản thu chi sắp tới (đã chuyển sang Công việc, kế hoạch)',
    color: 'text-amber-600',
    bgGradient: 'from-amber-50 to-orange-50',
  },
  'shopping-list': {
    icon: FaShoppingCart,
    description: 'Tạo và quản lý danh sách mua sắm với checklist cho đi chợ, siêu thị',
    color: 'text-orange-600',
    bgGradient: 'from-orange-50 to-amber-50',
  },
  'voice-to-text': {
    icon: FaMicrophone,
    description: 'Chuyển đổi giọng nói thành văn bản, có thể chỉnh sửa, sao chép và xóa',
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-pink-50',
  },
  'spending-jars': {
    icon: FaPiggyBank,
    description: 'Quản lý hũ chi tiêu cá nhân theo phương pháp 6 hũ — phân bổ ngân sách theo từng mục tiêu',
    color: 'text-violet-600',
    bgGradient: 'from-violet-50 to-purple-50',
  },
  'debts': {
    icon: FaFolder,
    description: 'Theo dõi các khoản nợ cho vay và đi vay, không bỏ sót bất kỳ khoản nào',
    color: 'text-rose-600',
    bgGradient: 'from-rose-50 to-red-50',
  },
  'settings': {
    icon: FaCog,
    description: 'Truy cập các cài đặt và tùy chọn',
    color: 'text-slate-600',
    bgGradient: 'from-slate-50 to-slate-100',
  },
}

export const QuickActionsSettings = ({
  isOpen,
  onClose,
  actions,
  onUpdate,
}: QuickActionsSettingsProps) => {
  const [localActions, setLocalActions] = useState<QuickAction[]>(actions)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const syncLocalActions = useEffectEvent((next: QuickAction[]) => {
    setLocalActions(next)
  })

  useEffect(() => {
    if (isOpen) {
      syncLocalActions(actions)
      setExpandedItems(new Set()) // Reset expanded items when modal opens
    }
  }, [isOpen, actions])

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleToggle = (id: string) => {
    setLocalActions((prev) => {
      const currentAction = prev.find((a) => a.id === id)
      if (!currentAction) return prev

      // Nếu đang bật, cho phép tắt
      if (currentAction.enabled) {
        return prev.map((action) => (action.id === id ? { ...action, enabled: false } : action))
      }

      // Nếu đang tắt, chỉ cho phép bật nếu chưa đủ 6 tiện ích
      const enabledCount = prev.filter((a) => a.enabled).length
      if (enabledCount >= 6) {
        return prev // Không cho phép bật thêm nếu đã đủ 6
      }

      return prev.map((action) => (action.id === id ? { ...action, enabled: true } : action))
    })
  }

  const handleSave = () => {
    onUpdate(localActions)
    onClose()
  }

  const handleReset = () => {
    const defaultActions = actions.map((action, index) => ({
      ...action,
      // Mặc định: chỉ 4 chức năng đầu tiên (Settings là chức năng cuối, mặc định tắt)
      enabled: index < 4 && action.id !== 'settings',
    }))
    setLocalActions(defaultActions)
  }

  if (!isOpen) return null

  const enabledCount = localActions.filter((a) => a.enabled).length

  return (
    <div className="fixed inset-0 z-50 flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title="Cài đặt tiện ích"
        onBack={onClose}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
          {/* Subtitle */}
          <div className="px-1 mb-1">
            <p className="text-sm text-slate-600">
              Chọn các chức năng ghim trên Dashboard ({enabledCount}/6 đã chọn)
            </p>
          </div>

          {/* Actions List */}
          <div className="space-y-2">
            {localActions.map((action) => {
              const isExpanded = expandedItems.has(action.id)
              const actionInfo = ACTION_INFO[action.id]
              const Icon = actionInfo?.icon || FaCog
              const isDisabled = !action.enabled && enabledCount >= 4

              return (
                <div
                  key={action.id}
                  className={`group rounded-3xl bg-white shadow-lg ring-1 ring-slate-100 transition-all duration-300 overflow-hidden ${action.enabled
                      ? 'shadow-md hover:shadow-lg'
                      : isDisabled
                        ? 'opacity-60'
                        : 'hover:shadow-lg'
                    }`}
                >
                  {/* Header - Clickable to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(action.id)}
                    className="w-full flex items-center justify-between p-4 transition-all hover:bg-white/50"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Icon with colored background */}
                      <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl transition-all ${action.enabled
                          ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <p className={`font-bold text-base transition-colors ${action.enabled ? 'text-slate-900' : 'text-slate-500'
                          }`}>
                          {action.label}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${action.enabled
                              ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                              : 'bg-slate-100 text-slate-500'
                            }`}>
                            {action.enabled ? '✓ Đang hiển thị' : '○ Đã ẩn'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chevron Icon */}
                    <div className="ml-3 flex-shrink-0">
                      <FaChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-3 pt-2 border-t border-slate-200/50 bg-[#F7F9FC]">
                        {/* Description */}
                        {actionInfo?.description && (
                          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                            {actionInfo.description}
                          </p>
                        )}

                        {/* Toggle Switch */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
                          <span className="text-sm font-medium text-slate-700">
                            {action.enabled ? 'Đang bật' : 'Đang tắt'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggle(action.id)
                            }}
                            disabled={isDisabled}
                            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${action.enabled
                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg focus:ring-sky-500'
                                : isDisabled
                                  ? 'bg-slate-200 cursor-not-allowed opacity-50'
                                  : 'bg-slate-300 hover:bg-slate-400 focus:ring-slate-400'
                              }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${action.enabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info Messages */}
          {enabledCount === 0 && (
            <div className="mt-2 rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="text-lg">⚠️</span>
                </div>
                <p className="text-sm font-medium text-amber-800">
                  Bạn cần chọn ít nhất 1 chức năng để hiển thị trên Dashboard
                </p>
              </div>
            </div>
          )}
          {enabledCount >= 6 && (
            <div className="mt-2 rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <FaInfoCircle className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-blue-800">
                  Đã đạt giới hạn tối đa 6 tiện ích. Vui lòng tắt một tiện ích khác để bật tiện ích mới.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shrink-0 bg-[#F7F9FC] px-4 py-4 shadow-lg sm:px-6">
        <div className="mx-auto flex w-full max-w-md gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-xl border-2 border-red-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50 sm:py-3 sm:text-base"
          >
            Đặt lại
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={enabledCount === 0}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
          >
            {enabledCount === 0 ? 'Chọn ít nhất 1 tiện ích' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}


