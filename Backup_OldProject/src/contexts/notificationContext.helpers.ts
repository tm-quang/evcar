import { createContext, useContext } from 'react'
import type { ToastOptions } from 'react-hot-toast'

export type ToastType = 'success' | 'error' | 'info' | 'loading' | 'notification'

export interface NotificationContextValue {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  loading: (message: string, options?: ToastOptions) => string
  notification: (message: string, options?: ToastOptions) => string
  dismiss: (toastId?: string) => void
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}



