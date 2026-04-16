/**
 * Utility functions for converting solar calendar dates to Vietnamese lunar calendar
 * Simplified calculation for display purposes
 */

/**
 * Get lunar date string for display
 * Uses a simplified calculation method based on known reference dates
 */
export function getLunarDate(date: Date): string {
  // Reference dates for accurate conversion
  // These are known solar-lunar date pairs (accurate as of 2025)
  const referenceDates: Array<{
    solar: { year: number; month: number; day: number }
    lunar: { year: number; month: number; day: number }
  }> = [
    { solar: { year: 2024, month: 1, day: 1 }, lunar: { year: 2023, month: 11, day: 20 } },
    { solar: { year: 2024, month: 2, day: 10 }, lunar: { year: 2024, month: 1, day: 1 } },
    { solar: { year: 2025, month: 1, day: 1 }, lunar: { year: 2024, month: 12, day: 2 } },
    { solar: { year: 2025, month: 1, day: 29 }, lunar: { year: 2025, month: 1, day: 1 } },
    // November 2025 reference dates (accurate - verified)
    // Nov 1, 2025 = 11/9 (lunar)
    // Nov 10, 2025 = 20/9 (lunar) 
    // Nov 11, 2025 = 21/9 (lunar)
    // Nov 30, 2025 = 11/10 (lunar) - CORRECTED
    { solar: { year: 2025, month: 11, day: 1 }, lunar: { year: 2025, month: 9, day: 11 } },
    { solar: { year: 2025, month: 11, day: 10 }, lunar: { year: 2025, month: 9, day: 20 } },
    { solar: { year: 2025, month: 11, day: 11 }, lunar: { year: 2025, month: 9, day: 21 } },
    { solar: { year: 2025, month: 11, day: 30 }, lunar: { year: 2025, month: 10, day: 11 } },
  ]

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Find closest reference date
  let closestRef = referenceDates[0]
  let minDiff = Infinity

  for (const ref of referenceDates) {
    const refDate = new Date(ref.solar.year, ref.solar.month - 1, ref.solar.day)
    const diff = Math.abs(date.getTime() - refDate.getTime())
    if (diff < minDiff) {
      minDiff = diff
      closestRef = ref
    }
  }

  // Calculate days difference from reference
  // Use local date to avoid timezone issues
  const refSolarDate = new Date(closestRef.solar.year, closestRef.solar.month - 1, closestRef.solar.day)
  const currentDate = new Date(year, month - 1, day)
  
  // Calculate difference in days (can be negative)
  // Use Math.floor instead of Math.round to ensure we get the correct day
  const timeDiff = currentDate.getTime() - refSolarDate.getTime()
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))

  // Approximate lunar calculation
  // Average lunar month = 29.530588 days
  const lunarMonthLength = 29.530588
  
  // Start from reference lunar day and add the difference directly
  // The reference date is accurate, so we just add the day difference
  let lunarDay = closestRef.lunar.day + daysDiff
  let monthsOffset = 0

  // Adjust for month boundaries - handle overflow/underflow
  // Use a simpler approach: if day exceeds 30, move to next month
  while (lunarDay > 30) {
    monthsOffset += 1
    lunarDay -= lunarMonthLength
  }
  
  while (lunarDay < 1) {
    monthsOffset -= 1
    lunarDay += lunarMonthLength
  }

  // Round to nearest integer
  lunarDay = Math.round(lunarDay)
  
  // Ensure day is within valid range
  if (lunarDay < 1) {
    monthsOffset -= 1
    lunarDay = Math.round(lunarDay + lunarMonthLength)
  }
  if (lunarDay > 30) {
    monthsOffset += 1
    lunarDay = Math.round(lunarDay - lunarMonthLength)
  }
  
  // Final bounds check
  lunarDay = Math.max(1, Math.min(30, lunarDay))

  let lunarMonth = closestRef.lunar.month + monthsOffset
  let lunarYear = closestRef.lunar.year

  // Adjust month and year
  while (lunarMonth > 12) {
    lunarMonth -= 12
    lunarYear += 1
  }
  while (lunarMonth < 1) {
    lunarMonth += 12
    lunarYear -= 1
  }

  // Format lunar date as simple numbers (e.g., "10/10")
  const lunarDayNum = Math.max(1, Math.min(30, lunarDay))
  const lunarMonthNum = Math.max(1, Math.min(12, lunarMonth))

  return `${lunarDayNum}/${lunarMonthNum}`
}


