import { createContext, useContext } from 'react'

export type DialogType = 'confirm' | 'alert' | 'warning' | 'info' | 'success' | 'error'

export interface DialogOptions {
  title?: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  middleText?: string // Nút ở giữa (ví dụ: "Ẩn ví")
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  onMiddle?: () => void | Promise<void> // Handler cho nút giữa
  showCancel?: boolean
}

export interface DialogContextValue {
  showDialog: (options: DialogOptions) => Promise<boolean>
  showConfirm: (message: string, onConfirm?: () => void | Promise<void>) => Promise<boolean>
  showAlert: (message: string, type?: DialogType) => Promise<void>
}

export const DialogContext = createContext<DialogContextValue | undefined>(undefined)

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}



