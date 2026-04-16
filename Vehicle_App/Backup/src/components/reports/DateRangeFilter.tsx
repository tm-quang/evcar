import { useState } from 'react'
import { FaCalendarAlt } from 'react-icons/fa'
import { DateTimePickerModal } from '../ui/DateTimePickerModal'

type DateRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

type DateRangeFilterProps = {
  rangeType: DateRangeType
  onRangeTypeChange: (type: DateRangeType) => void
  startDate?: string
  endDate?: string
  onStartDateChange?: (date: string) => void
  onEndDateChange?: (date: string) => void
}

const RANGE_OPTIONS: { value: DateRangeType; label: string; icon?: string }[] = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
]

// Format date for display (dd/mm/yyyy)
const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return 'dd/mm/yyyy'
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  } catch {
    return 'dd/mm/yyyy'
  }
}

export const DateRangeFilter = ({
  rangeType,
  onRangeTypeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) => {
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)

  const handleStartDateConfirm = (date: string) => {
    onStartDateChange?.(date)
    setIsStartDatePickerOpen(false)
  }

  const handleEndDateConfirm = (date: string) => {
    onEndDateChange?.(date)
    setIsEndDatePickerOpen(false)
  }

  return (
    <div className="space-y-3 w-full">
      {/* Quick Range Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {RANGE_OPTIONS.map((option) => {
          const isActive = rangeType === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeTypeChange(option.value)}
              className={`group relative rounded-2xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 truncate overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 hover:shadow-md'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* Custom Date Range Picker */}
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          rangeType === 'custom' ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="min-h-0">
          <div className="flex gap-3">
            {/* Start Date */}
            <div className="relative flex-1">
              <label className="absolute left-4 top-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">
                Từ ngày
              </label>
              <button
                type="button"
                onClick={() => setIsStartDatePickerOpen(true)}
                className="relative w-full h-14 rounded-2xl bg-white border-2 border-slate-200 pl-4 pr-12 pt-5 pb-2 text-left transition-all hover:border-sky-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 group"
              >
                <span
                  className={`block text-sm font-semibold transition-colors ${
                    startDate ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {formatDateDisplay(startDate)}
                </span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-sky-100 transition-colors">
                  <FaCalendarAlt className="h-4 w-4 text-slate-600 group-hover:text-sky-600 transition-colors" />
                </div>
              </button>
            </div>

            {/* End Date */}
            <div className="relative flex-1">
              <label className="absolute left-4 top-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">
                Đến ngày
              </label>
              <button
                type="button"
                onClick={() => setIsEndDatePickerOpen(true)}
                className="relative w-full h-14 rounded-2xl bg-white border-2 border-slate-200 pl-4 pr-12 pt-5 pb-2 text-left transition-all hover:border-sky-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 group"
              >
                <span
                  className={`block text-sm font-semibold transition-colors ${
                    endDate ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {formatDateDisplay(endDate)}
                </span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-sky-100 transition-colors">
                  <FaCalendarAlt className="h-4 w-4 text-slate-600 group-hover:text-sky-600 transition-colors" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker Modals */}
      <DateTimePickerModal
        isOpen={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        onConfirm={handleStartDateConfirm}
        initialDate={startDate}
        showTime={false}
      />

      <DateTimePickerModal
        isOpen={isEndDatePickerOpen}
        onClose={() => setIsEndDatePickerOpen(false)}
        onConfirm={handleEndDateConfirm}
        initialDate={endDate}
        showTime={false}
      />
    </div>
  )
}

