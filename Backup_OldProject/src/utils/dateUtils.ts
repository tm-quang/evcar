/**
 * Date utilities for UTC+7 timezone (Vietnam timezone)
 * All date operations should use these utilities to ensure consistency
 */

/**
 * Get current date/time in UTC+7
 * Returns a Date object that represents the current time in UTC+7 timezone
 */
export const getNowUTC7 = (): Date => {
  const now = new Date()

  // Use Intl.DateTimeFormat to get UTC+7 components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0')
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')

  // Create date in UTC+7 timezone
  return createDateUTC7(year, month, day, hour, minute, second)
}

/**
 * Convert a Date object to UTC+7
 * Takes a Date object and returns a new Date object representing the same moment in UTC+7
 */
export const toUTC7 = (date: Date): Date => {
  // Use Intl.DateTimeFormat to get UTC+7 components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0')
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')

  // Create date in UTC+7 timezone
  return createDateUTC7(year, month, day, hour, minute, second)
}

/**
 * Create a Date object from UTC+7 date components
 */
export const createDateUTC7 = (year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0, millisecond: number = 0): Date => {
  // Create date string in UTC+7 format
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(millisecond).padStart(3, '0')}+07:00`
  return new Date(dateString)
}

/**
 * Format date as YYYY-MM-DD in UTC+7 timezone
 * This ensures dates are always formatted correctly regardless of system timezone
 */
export const formatDateUTC7 = (date: Date): string => {
  // Get UTC+7 components directly
  const components = getDateComponentsUTC7(date)
  const year = components.year
  const month = String(components.month).padStart(2, '0')
  const day = String(components.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date as YYYY-MM-DD using local date components (simpler, works if system is already UTC+7)
 * Use this when you're sure the Date object represents the correct local date
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get date components in UTC+7
 */
export const getDateComponentsUTC7 = (date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } => {
  // Use Intl.DateTimeFormat to get UTC+7 components directly
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  return {
    year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
    day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
    hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
    second: parseInt(parts.find(p => p.type === 'second')?.value || '0'),
  }
}

/**
 * Create a Date object for the start of a day in UTC+7
 */
export const getStartOfDayUTC7 = (year: number, month: number, day: number): Date => {
  return createDateUTC7(year, month, day, 0, 0, 0, 0)
}

/**
 * Create a Date object for the end of a day in UTC+7
 */
export const getEndOfDayUTC7 = (year: number, month: number, day: number): Date => {
  return createDateUTC7(year, month, day, 23, 59, 59, 999)
}

/**
 * Get first day of month in UTC+7
 */
export const getFirstDayOfMonthUTC7 = (year: number, month: number): Date => {
  return getStartOfDayUTC7(year, month, 1)
}

/**
 * Get last day of month in UTC+7
 */
export const getLastDayOfMonthUTC7 = (year: number, month: number): Date => {
  // Get first day of next month
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const firstDayNextMonth = getStartOfDayUTC7(nextMonth.year, nextMonth.month, 1)

  // Subtract 1 millisecond to get the last moment of the current month
  const lastDayMs = firstDayNextMonth.getTime() - 1

  // Get UTC+7 components of that moment
  const lastDayDate = new Date(lastDayMs)
  const lastDayComponents = getDateComponentsUTC7(lastDayDate)

  // Return the end of that day in UTC+7
  return getEndOfDayUTC7(lastDayComponents.year, lastDayComponents.month, lastDayComponents.day)
}

/**
 * Get day of week in UTC+7 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Use this to get the correct day of week for Vietnam regardless of system timezone
 */
export const getDayOfWeekUTC7 = (date: Date): number => {
  // Vietnam is UTC+7. We shift the date by 7 hours to align UTC components with VN local components
  const vnShifted = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return vnShifted.getUTCDay()
}
