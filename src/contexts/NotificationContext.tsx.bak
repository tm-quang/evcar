import { type ReactNode } from 'react'
import toast, { type ToastOptions } from 'react-hot-toast'
import { NotificationContext, type ToastType } from './notificationContext.helpers'

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const defaultDuration = type === 'notification' ? 5000 : 3500

    const toastOptions: ToastOptions = {
      duration: defaultDuration,
      position: 'top-center',
      ...options,
    }

    switch (type) {
      case 'success':
        return toast.success(message, toastOptions)
      case 'error':
        return toast.error(message, toastOptions)
      case 'loading':
        return toast.loading(message, toastOptions)
      case 'notification':
        return toast(message, {
          ...toastOptions,
          icon: '🔔',
        })
      default:
        return toast(message, toastOptions)
    }
  }

  const success = (message: string, options?: ToastOptions) => showToast(message, 'success', options)
  const error = (message: string, options?: ToastOptions) => showToast(message, 'error', options)
  const info = (message: string, options?: ToastOptions) => showToast(message, 'info', options)
  const loading = (message: string, options?: ToastOptions) => showToast(message, 'loading', options)
  const notification = (message: string, options?: ToastOptions) => showToast(message, 'notification', options)
  const dismiss = (toastId?: string) => toast.dismiss(toastId)

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        success,
        error,
        info,
        loading,
        notification,
        dismiss,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

