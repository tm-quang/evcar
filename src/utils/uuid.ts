/**
 * Generate a UUID v4 compatible string
 * Falls back to a simpler ID generation if crypto.randomUUID() is not available
 */
export function generateUUID(): string {
  // Try to use native crypto.randomUUID() if available (Chrome 92+, Firefox 95+, Safari 15.4+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch (e) {
      // Fall through to fallback method
    }
  }

  // Fallback: Generate UUID v4 format manually
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, A, or B
  const chars = '0123456789abcdef'
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return chars[v]
  })
}


