/**
 * Console Override
 * Disable or sanitize console logs in production to prevent security issues
 */

const isDevelopment = import.meta.env.DEV

// Sensitive patterns to hide
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
  /api.*key/i,
  /supabase.*key/i,
  /bearer/i,
  /authorization/i,
]

/**
 * Check if a message contains sensitive information
 */
const containsSensitiveInfo = (message: string): boolean => {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Sanitize message - remove sensitive data
 */
const sanitizeMessage = (message: unknown): unknown => {
  if (typeof message === 'string') {
    if (containsSensitiveInfo(message)) {
      return '[Sensitive data hidden]'
    }
  }
  if (Array.isArray(message)) {
    return message.map((item) => sanitizeMessage(item))
  }
  if (typeof message === 'object' && message !== null) {
    const sanitizedEntries = Object.entries(message as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (containsSensitiveInfo(key)) {
          return acc
        }
        if (typeof value === 'string' && containsSensitiveInfo(value)) {
          acc[key] = '[Hidden]'
          return acc
        }
        acc[key] = sanitizeMessage(value)
        return acc
      },
      {}
    )
    return sanitizedEntries
  }
  return message
}

const sanitizeArgs = <T extends (...args: never[]) => unknown>(args: Parameters<T>): Parameters<T> => {
  return args.map((arg) => sanitizeMessage(arg)) as Parameters<T>
}

/**
 * Override console methods
 */
export const setupConsoleOverride = () => {
  if (isDevelopment) {
    // In development, keep console but sanitize sensitive data
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info
    const originalDebug = console.debug

    console.log = (...args: Parameters<typeof console.log>) => {
      const sanitized = sanitizeArgs<typeof console.log>(args)
      originalLog(...sanitized)
    }

    console.error = (...args: Parameters<typeof console.error>) => {
      const sanitized = sanitizeArgs<typeof console.error>(args)
      originalError(...sanitized)
    }

    console.warn = (...args: Parameters<typeof console.warn>) => {
      const sanitized = sanitizeArgs<typeof console.warn>(args)
      originalWarn(...sanitized)
    }

    console.info = (...args: Parameters<typeof console.info>) => {
      const sanitized = sanitizeArgs<typeof console.info>(args)
      originalInfo(...sanitized)
    }

    console.debug = (...args: Parameters<typeof console.debug>) => {
      const sanitized = sanitizeArgs<typeof console.debug>(args)
      originalDebug(...sanitized)
    }
  } else {
    // In production, disable all console logs
    console.log = () => {}
    console.error = () => {}
    console.warn = () => {}
    console.info = () => {}
    console.debug = () => {}
    // Keep console.clear for debugging if needed
    // console.clear = () => {}
  }
}


