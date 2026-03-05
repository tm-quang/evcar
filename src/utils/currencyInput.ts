/**
 * Utility functions for formatting currency input in Vietnamese Dong (VND)
 */

/**
 * Format a number string to VND format with thousand separators
 * Example: "1000000" -> "1.000.000"
 */
export const formatVNDInput = (value: string): string => {
  // Remove all non-digit characters
  const numbers = value.replace(/[^\d]/g, '')
  
  // Add thousand separators
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Parse a formatted VND string back to a number
 * Example: "1.000.000" -> 1000000
 */
export const parseVNDInput = (value: string): number => {
  // Remove all non-digit characters and parse
  const numbers = value.replace(/[^\d]/g, '')
  return numbers === '' ? 0 : parseFloat(numbers)
}

/**
 * Format a number to VND display format with thousand separators and currency symbol
 * Example: 1000000 -> "1.000.000 ₫"
 */
export const formatVNDDisplay = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Handle input change for currency fields
 * Formats the input value as user types
 */
export const handleCurrencyInputChange = (
  value: string,
  setValue: (value: string) => void
) => {
  const formatted = formatVNDInput(value)
  setValue(formatted)
}


