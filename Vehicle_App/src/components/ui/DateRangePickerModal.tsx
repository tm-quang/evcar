import { useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'
import { formatDateUTC7, getNowUTC7, createDateUTC7, getDateComponentsUTC7, getDayOfWeekUTC7 } from '../../utils/dateUtils'

interface DateRangePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (startDate: string, endDate: string) => void
  initialStartDate?: string
  initialEndDate?: string
}

const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return createDateUTC7(year, month, day, 0, 0, 0, 0)
}

export const DateRangePickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialStartDate,
  initialEndDate,
}: DateRangePickerModalProps) => {
  const [startDate, setStartDate] = useState<Date | null>(() => 
    initialStartDate ? parseDateString(initialStartDate) : null
  )
  const [endDate, setEndDate] = useState<Date | null>(() => 
    initialEndDate ? parseDateString(initialEndDate) : null
  )
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = getNowUTC7()
    const components = getDateComponentsUTC7(now)
    return createDateUTC7(components.year, components.month, 1)
  })

  if (!isOpen) return null

  const monthComponents = getDateComponentsUTC7(currentMonth)
  const firstDay = createDateUTC7(monthComponents.year, monthComponents.month, 1)
  const nextMonth = monthComponents.month === 12 ? { year: monthComponents.year + 1, month: 1 } : { year: monthComponents.year, month: monthComponents.month + 1 }
  const lastDayDate = createDateUTC7(nextMonth.year, nextMonth.month, 1)
  const lastDay = new Date(lastDayDate)
  lastDay.setUTCDate(lastDay.getUTCDate() - 1)
  const daysInMonth = getDateComponentsUTC7(lastDay).day
  const vnDayOfWeek = getDayOfWeekUTC7(firstDay)
  const startingDayOfWeek = vnDayOfWeek === 0 ? 6 : vnDayOfWeek - 1

  const weekdays = ['T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7', 'CN']

  const selectDate = (day: number) => {
    const components = getDateComponentsUTC7(currentMonth)
    const clickedDate = createDateUTC7(components.year, components.month, day)
    const clickedTime = clickedDate.getTime()
    const startTime = startDate?.getTime() || 0

    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate)
      setEndDate(null)
    } else if (clickedTime < startTime) {
      setStartDate(clickedDate)
      setEndDate(null)
    } else {
      setEndDate(clickedDate)
    }
  }

  const isBetween = (day: number) => {
    if (!startDate || !endDate) return false
    const components = getDateComponentsUTC7(currentMonth)
    const checkTime = createDateUTC7(components.year, components.month, day).getTime()
    return checkTime > startDate.getTime() && checkTime < endDate.getTime()
  }

  const isSelected = (day: number) => {
    const components = getDateComponentsUTC7(currentMonth)
    const checkTime = createDateUTC7(components.year, components.month, day).getTime()
    return checkTime === startDate?.getTime() || checkTime === endDate?.getTime()
  }

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(formatDateUTC7(startDate), formatDateUTC7(endDate))
      onClose()
    } else if (startDate) {
      onConfirm(formatDateUTC7(startDate), formatDateUTC7(startDate))
      onClose()
    }
  }

  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + offset)
    setCurrentMonth(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] animate-in fade-in" onClick={onClose}>
      <div className="w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200 overflow-hidden animate-in slide-in-from-bottom-full mt-12 sm:mt-0" onClick={e => e.stopPropagation()}>
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 sm:hidden pointer-events-none">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="pt-2">
            <h2 className="text-base font-bold text-slate-900">Chọn khoảng thời gian</h2>
            <p className="min-h-[16px] text-xs font-medium text-slate-500 mt-0.5">
              {startDate ? (endDate ? `${formatDateUTC7(startDate)} - ${formatDateUTC7(endDate)}` : `Bắt đầu: ${formatDateUTC7(startDate)}`) : 'Chọn ngày bắt đầu và kết thúc'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95"
          >
            <FaTimes className="h-3 w-3" />
          </button>
        </div>

        {/* Calendar Content */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-5">
            <button 
              onClick={() => changeMonth(-1)} 
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              <FaChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-sm font-bold text-slate-900">Tháng {monthComponents.month} / {monthComponents.year}</span>
            <button 
              onClick={() => changeMonth(1)} 
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              <FaChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekdays.map(w => <div key={w} className="flex h-8 items-center justify-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={idx} className="h-10" />
              const selected = isSelected(day)
              const between = isBetween(day)
              return (
                <button
                  key={idx}
                  onClick={() => selectDate(day)}
                  className={`relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                    selected ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' : 
                    between ? 'bg-sky-100/50 text-sky-700' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setStartDate(getNowUTC7()); setEndDate(getNowUTC7()); }}
              className="px-3 py-1.5 rounded-lg bg-sky-50 text-[11px] font-bold text-sky-600 transition hover:bg-sky-100 active:scale-95"
            >
              Hôm nay
            </button>
            <button 
              onClick={() => {
                const now = getNowUTC7()
                const dayOfWeek = getDayOfWeekUTC7(now) === 0 ? 6 : getDayOfWeekUTC7(now) - 1
                const mon = new Date(now); mon.setDate(now.getDate() - dayOfWeek)
                const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
                setStartDate(mon); setEndDate(sun)
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-50 text-[11px] font-bold text-sky-600 transition hover:bg-sky-100 active:scale-95"
            >
              Tuần này
            </button>
            <button 
              onClick={() => {
                const now = getNowUTC7()
                const components = getDateComponentsUTC7(now)
                const s = createDateUTC7(components.year, components.month, 1)
                const nextMonth = components.month === 12 ? { year: components.year + 1, month: 1 } : { year: components.year, month: components.month + 1 }
                const eDate = createDateUTC7(nextMonth.year, nextMonth.month, 1)
                eDate.setUTCDate(eDate.getUTCDate() - 1)
                setStartDate(s); setEndDate(eDate)
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-50 text-[11px] font-bold text-sky-600 transition hover:bg-sky-100 active:scale-95"
            >
              Tháng này
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium italic">
              {startDate && !endDate ? 'Vui lòng chọn ngày kết thúc' : ''}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={onClose} 
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                Đóng
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={!startDate} 
                className="rounded-xl bg-sky-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/30 transition hover:bg-sky-600 disabled:opacity-30 active:scale-95"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
