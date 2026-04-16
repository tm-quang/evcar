import { useEffect, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaClock, FaTimes } from 'react-icons/fa'
import { formatDateUTC7, getNowUTC7, createDateUTC7, getDateComponentsUTC7, getDayOfWeekUTC7 } from '../../utils/dateUtils'

interface DateTimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (date: string, time?: string) => void
  initialDate?: string
  initialTime?: string
  showTime?: boolean
}

// Parse date string YYYY-MM-DD to Date object in UTC+7 timezone
// This ensures dates are parsed according to Vietnam timezone (UTC+7)
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return createDateUTC7(year, month, day, 0, 0, 0, 0)
}

export const DateTimePickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialTime,
  showTime = true,
}: DateTimePickerModalProps) => {

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) {
      try {
        const date = parseDateString(initialDate)
        return isNaN(date.getTime()) ? getNowUTC7() : date
      } catch {
        return getNowUTC7()
      }
    }
    return getNowUTC7()
  })

  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (initialTime) {
      return initialTime
    }
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)
    return `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`
  })

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialDate) {
      try {
        const date = parseDateString(initialDate)
        if (isNaN(date.getTime())) {
          const now = getNowUTC7()
          const components = getDateComponentsUTC7(now)
          return createDateUTC7(components.year, components.month, 1)
        }
        const components = getDateComponentsUTC7(date)
        return createDateUTC7(components.year, components.month, 1)
      } catch {
        const now = getNowUTC7()
        const components = getDateComponentsUTC7(now)
        return createDateUTC7(components.year, components.month, 1)
      }
    }
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)
    return createDateUTC7(components.year, components.month, 1)
  })

  // Update selected date when initialDate changes
  useEffect(() => {
    if (initialDate) {
      try {
        const date = parseDateString(initialDate)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          const components = getDateComponentsUTC7(date)
          setCurrentMonth(createDateUTC7(components.year, components.month, 1))
        }
      } catch {
        // Invalid date format, ignore
      }
    }
  }, [initialDate])

  // Update selected time when initialTime changes
  useEffect(() => {
    if (initialTime) {
      setSelectedTime(initialTime)
    }
  }, [initialTime])

  if (!isOpen) return null

  // Get today in UTC+7
  const nowUTC7 = getNowUTC7()
  const todayComponents = getDateComponentsUTC7(nowUTC7)
  const today = createDateUTC7(todayComponents.year, todayComponents.month, todayComponents.day)

  // Get selected date in UTC+7
  const selectedComponents = getDateComponentsUTC7(selectedDate)
  const currentDate = createDateUTC7(selectedComponents.year, selectedComponents.month, selectedComponents.day)

  const isToday = currentDate.getTime() === today.getTime()

  // Get first day of month and number of days in UTC+7
  const monthComponents = getDateComponentsUTC7(currentMonth)
  const firstDay = createDateUTC7(monthComponents.year, monthComponents.month, 1)
  // Get last day of month
  const nextMonth = monthComponents.month === 12 ? { year: monthComponents.year + 1, month: 1 } : { year: monthComponents.year, month: monthComponents.month + 1 }
  const lastDayDate = createDateUTC7(nextMonth.year, nextMonth.month, 1)
  const lastDay = new Date(lastDayDate)
  lastDay.setUTCDate(lastDay.getUTCDate() - 1)
  const lastDayComponents = getDateComponentsUTC7(lastDay)
  const daysInMonth = lastDayComponents.day
  const vnDayOfWeek = getDayOfWeekUTC7(firstDay)
  const startingDayOfWeek = vnDayOfWeek === 0 ? 6 : vnDayOfWeek - 1 // Monday = 0

  // Weekday labels
  const weekdays = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN']

  // Navigate months
  const goToPreviousMonth = () => {
    const components = getDateComponentsUTC7(currentMonth)
    const prevMonth = components.month === 1 ? { year: components.year - 1, month: 12 } : { year: components.year, month: components.month - 1 }
    setCurrentMonth(createDateUTC7(prevMonth.year, prevMonth.month, 1))
  }

  const goToNextMonth = () => {
    const components = getDateComponentsUTC7(currentMonth)
    const nextMonth = components.month === 12 ? { year: components.year + 1, month: 1 } : { year: components.year, month: components.month + 1 }
    setCurrentMonth(createDateUTC7(nextMonth.year, nextMonth.month, 1))
  }

  const goToToday = () => {
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)
    const todayDate = createDateUTC7(components.year, components.month, components.day)
    setSelectedDate(todayDate)
    setCurrentMonth(createDateUTC7(components.year, components.month, 1))
  }

  // Select date
  const selectDate = (day: number) => {
    const components = getDateComponentsUTC7(currentMonth)
    const newDate = createDateUTC7(components.year, components.month, day)
    setSelectedDate(newDate)
  }

  // Check if date is selected
  const isDateSelected = (day: number) => {
    const monthComponents = getDateComponentsUTC7(currentMonth)
    const checkDate = createDateUTC7(monthComponents.year, monthComponents.month, day)
    const checkComponents = getDateComponentsUTC7(checkDate)
    const selectedComponents = getDateComponentsUTC7(selectedDate)
    return (
      checkComponents.year === selectedComponents.year &&
      checkComponents.month === selectedComponents.month &&
      checkComponents.day === selectedComponents.day
    )
  }

  // Check if date is today
  const isDateToday = (day: number) => {
    const monthComponents = getDateComponentsUTC7(currentMonth)
    const checkDate = createDateUTC7(monthComponents.year, monthComponents.month, day)
    const checkComponents = getDateComponentsUTC7(checkDate)
    const todayComponents = getDateComponentsUTC7(today)
    return (
      checkComponents.year === todayComponents.year &&
      checkComponents.month === todayComponents.month &&
      checkComponents.day === todayComponents.day
    )
  }

  // Format month and year
  const formatMonthYear = () => {
    const monthNames = [
      'Tháng 1',
      'Tháng 2',
      'Tháng 3',
      'Tháng 4',
      'Tháng 5',
      'Tháng 6',
      'Tháng 7',
      'Tháng 8',
      'Tháng 9',
      'Tháng 10',
      'Tháng 11',
      'Tháng 12',
    ]
    const components = getDateComponentsUTC7(currentMonth)
    return `${monthNames[components.month - 1]} ${components.year}`
  }

  // Format selected date
  const formatSelectedDate = () => {
    const components = getDateComponentsUTC7(selectedDate)
    const day = String(components.day).padStart(2, '0')
    const month = String(components.month).padStart(2, '0')
    const year = components.year
    return `${day}/${month}/${year}`
  }

  // Format time for display
  const formatDisplayTime = () => {
    if (!showTime || !selectedTime) return ''
    const [hours, minutes] = selectedTime.split(':')
    return `${hours}:${minutes}`
  }

  // Handle confirm
  const handleConfirm = () => {
    // Use formatDateUTC7 to format date in UTC+7 timezone
    const dateStr = formatDateUTC7(selectedDate)
    onConfirm(dateStr, showTime ? selectedTime : undefined)
    onClose()
  }

  // Generate calendar days
  const calendarDays: (number | null)[] = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
        <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200 overflow-hidden animate-in slide-in-from-bottom-full duration-300 mt-12 sm:mt-0 max-h-[80vh] safe-area-bottom" onClick={e => e.stopPropagation()}>
          {/* Header with Handle */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shrink-0">
            {/* Mobile Handle */}
            <div className="flex w-full justify-center pt-3 pb-2 sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full">
              <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
            </div>

            {/* Header Content */}
            <div className="flex shrink-0 items-center justify-between px-4 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Chọn ngày{showTime ? ' và giờ' : ''}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isToday ? 'Hôm nay' : formatSelectedDate()} {showTime && formatDisplayTime() && `- ${formatDisplayTime()}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            {/* Calendar */}
            <div className="space-y-3">
              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95"
                  aria-label="Tháng trước"
                >
                  <FaChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-900">{formatMonthYear()}</span>
                </div>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95"
                  aria-label="Tháng sau"
                >
                  <FaChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="flex h-8 items-center justify-center text-[10px] font-semibold text-slate-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="h-9" />
                  }

                  const isSelected = isDateSelected(day)
                  const isTodayDate = isDateToday(day)

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={`relative flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${isSelected
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : isTodayDate
                          ? 'bg-sky-100 text-sky-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Time Picker */}
              {showTime && (
                <div className="border-t border-slate-200 pt-3">
                  <label className="mb-2 block text-xs font-semibold text-slate-900">
                    Chọn giờ
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 pl-10 pr-3 text-sm font-medium text-slate-900 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 active:scale-95"
            >
              Hôm nay
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-600 active:scale-95"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


