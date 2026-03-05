import { useEffect } from 'react'
import { toast, useToasterStore } from 'react-hot-toast'

const TOAST_LIMIT = 1

export default function ToastStackLimiter() {
  const { toasts } = useToasterStore()

  useEffect(() => {
    const visibleToasts = toasts.filter((t) => t.visible)

    visibleToasts
      .filter((_, index) => index >= TOAST_LIMIT)
      .forEach((toastItem) => toast.dismiss(toastItem.id))
  }, [toasts])

  return null
}

