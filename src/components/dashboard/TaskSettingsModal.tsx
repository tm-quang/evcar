import { useEffect, useState } from 'react'
import { FaTimes, FaCalendar, FaSave } from 'react-icons/fa'
import { type TaskViewPeriod, updateTaskViewPreferences } from '../../lib/userPreferencesService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'
import { useNotification } from '../../contexts/notificationContext.helpers'

type TaskSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  initialViewPeriod: TaskViewPeriod
  initialCustomStartDate: string | null
  initialCustomEndDate: string | null
  onSave: (period: TaskViewPeriod, startDate: string | null, endDate: string | null) => void
}

export const TaskSettingsModal = ({
  isOpen,
  onClose,
  initialViewPeriod,
  initialCustomStartDate,
  initialCustomEndDate,
  onSave,
}: TaskSettingsModalProps) => {
  const { success, error: showError } = useNotification()
  const [viewPeriod, setViewPeriod] = useState<TaskViewPeriod>(initialViewPeriod)
  const [customStartDate, setCustomStartDate] = useState<string | null>(initialCustomStartDate)
  const [customEndDate, setCustomEndDate] = useState<string | null>(initialCustomEndDate)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start')
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when modal opens/closes or initial values change
  useEffect(() => {
    if (isOpen) {
      setViewPeriod(initialViewPeriod)
      setCustomStartDate(initialCustomStartDate)
      setCustomEndDate(initialCustomEndDate)
    }
  }, [isOpen, initialViewPeriod, initialCustomStartDate, initialCustomEndDate])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatDateDisplay = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr + 'T00:00:00+07:00')
      const components = getDateComponentsUTC7(date)
      return `${components.day}/${components.month}/${components.year}`
    } catch {
      return dateStr
    }
  }

  const handleCustomDateSelect = (type: 'start' | 'end') => {
    setDatePickerType(type)
    setIsDatePickerOpen(true)
  }

  const handleDateConfirm = (date: string) => {
    if (datePickerType === 'start') {
      setCustomStartDate(date)
    } else {
      setCustomEndDate(date)
    }
    setIsDatePickerOpen(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate custom dates if custom period is selected
      if (viewPeriod === 'custom') {
        if (!customStartDate || !customEndDate) {
          showError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.')
          setIsSaving(false)
          return
        }

        // Validate that start date is before end date
        const start = new Date(customStartDate + 'T00:00:00+07:00')
        const end = new Date(customEndDate + 'T00:00:00+07:00')
        if (start > end) {
          showError('Ngày bắt đầu phải trước ngày kết thúc.')
          setIsSaving(false)
          return
        }
      }

      // Save to database
      await updateTaskViewPreferences(
        viewPeriod,
        viewPeriod === 'custom' ? customStartDate : null,
        viewPeriod === 'custom' ? customEndDate : null
      )

      // Call parent's onSave callback
      onSave(
        viewPeriod,
        viewPeriod === 'custom' ? customStartDate : null,
        viewPeriod === 'custom' ? customEndDate : null
      )

      success('Đã lưu cài đặt thành công!')
      onClose()
    } catch (error) {
      // Better error handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorObj = error as any
      const errorMessage = errorObj?.message || 'Không thể lưu cài đặt'

      console.error('Error saving task preferences:', {
        error,
        message: errorMessage,
        code: errorObj?.code,
        viewPeriod,
        customStartDate,
        customEndDate,
      })

      // Check if it's a schema/table issue
      if (errorMessage.includes('chưa được tạo') || errorMessage.includes('does not exist')) {
        showError('Bảng cài đặt chưa được tạo. Vui lòng chạy SQL migration.')
      } else if (errorMessage.includes('đăng nhập')) {
        showError('Bạn cần đăng nhập để lưu cài đặt.')
      } else {
        showError(`Không thể lưu cài đặt: ${errorMessage}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200 pointer-events-none">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/50 animate-in zoom-in-95 fade-in duration-300 mt-12 sm:mt-0 max-h-[calc(100vh-3rem)] sm:max-h-[85vh] overflow-y-auto safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Cài đặt hiển thị</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Chọn khoảng thời gian để hiển thị công việc
              </p>
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
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 max-h-[60vh]">
            {/* Period Selection */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Khoảng thời gian
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewPeriod('week')}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewPeriod === 'week'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => setViewPeriod('month')}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewPeriod === 'month'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Tháng
                </button>
                <button
                  onClick={() => setViewPeriod('custom')}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewPeriod === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  Tùy chỉnh
                </button>
              </div>
            </div>

            {/* Custom Date Range Selection */}
            {viewPeriod === 'custom' && (
              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Chọn khoảng thời gian
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Ngày bắt đầu
                    </label>
                    <button
                      onClick={() => handleCustomDateSelect('start')}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-500"
                    >
                      <div className="flex items-center gap-2">
                        <FaCalendar className="text-slate-400 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">
                          {customStartDate ? formatDateDisplay(customStartDate) : 'Chọn ngày bắt đầu'}
                        </span>
                      </div>
                    </button>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      Ngày kết thúc
                    </label>
                    <button
                      onClick={() => handleCustomDateSelect('end')}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-500"
                    >
                      <div className="flex items-center gap-2">
                        <FaCalendar className="text-slate-400 h-4 w-4" />
                        <span className="text-sm font-medium text-slate-700">
                          {customEndDate ? formatDateDisplay(customEndDate) : 'Chọn ngày kết thúc'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              disabled={isSaving}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <FaSave className="h-4 w-4" />
                  <span>Lưu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onConfirm={handleDateConfirm}
        initialDate={(datePickerType === 'start' ? customStartDate : customEndDate) || undefined}
        showTime={false}
      />
    </>
  )
}


