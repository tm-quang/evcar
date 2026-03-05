import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaArrowLeft, FaExchangeAlt, FaChevronDown, FaCheck, FaWallet } from 'react-icons/fa'
import { NumberPadModal } from '../ui/NumberPadModal'
import { ModalFooterButtons } from '../ui/ModalFooterButtons'
import { formatVNDInput, parseVNDInput } from '../../utils/currencyInput'
import type { WalletRecord, WalletType } from '../../lib/walletService'

type WalletTransferModalProps = {
  isOpen: boolean
  onClose: () => void
  sourceWallet: WalletRecord
  wallets: WalletRecord[]
  onTransfer: (sourceWalletId: string, targetWalletId: string, amount: number) => Promise<void>
}

export const WalletTransferModal = ({
  isOpen,
  onClose,
  sourceWallet,
  wallets,
  onTransfer,
}: WalletTransferModalProps) => {
  const [targetWalletId, setTargetWalletId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter out source wallet from available wallets
  const availableWallets = wallets.filter((w) => w.id !== sourceWallet.id && w.is_active)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetWalletId('')
      setAmount('')
      setError(null)
      setIsNumberPadOpen(false)
    }
  }, [isOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!targetWalletId) {
      setError('Vui lòng chọn ví đích')
      return
    }

    const amountValue = parseVNDInput(amount)
    if (!amount || amountValue <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (lớn hơn 0)')
      return
    }

    if (amountValue > sourceWallet.balance) {
      setError(`Số dư ví nguồn không đủ. Số dư hiện tại: ${new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(sourceWallet.balance)}`)
      return
    }

    setIsSubmitting(true)
    try {
      await onTransfer(sourceWallet.id, targetWalletId, amountValue)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể chuyển đổi số dư. Vui lòng thử lại.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get wallet type colors
  const getWalletTypeColors = (type: WalletType) => {
    const colors = {
      'Tiền mặt': {
        bg: 'from-slate-900 via-slate-800 to-slate-950',
        border: 'border-slate-400/50',
        text: 'text-white',
        badge: 'bg-emerald-500',
      },
      'Ngân hàng': {
        bg: 'from-blue-700 via-blue-800 to-indigo-900',
        border: 'border-blue-400/50',
        text: 'text-white',
        badge: 'bg-blue-500',
      },
      'Tiết kiệm': {
        bg: 'from-emerald-700 via-teal-800 to-cyan-900',
        border: 'border-emerald-400/50',
        text: 'text-white',
        badge: 'bg-emerald-500',
      },
      'Tín dụng': {
        bg: 'from-purple-700 via-violet-800 to-fuchsia-900',
        border: 'border-purple-400/50',
        text: 'text-white',
        badge: 'bg-purple-500',
      },
      'Đầu tư': {
        bg: 'from-amber-700 via-orange-800 to-rose-900',
        border: 'border-amber-400/50',
        text: 'text-white',
        badge: 'bg-amber-500',
      },
      'Khác': {
        bg: 'from-slate-800 via-gray-900 to-slate-950',
        border: 'border-slate-400/50',
        text: 'text-white',
        badge: 'bg-slate-500',
      },
    }
    return colors[type] || colors['Khác']
  }

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 400 })

  // Handle dropdown positioning
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return
        
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const maxDropdownHeight = 400
        const margin = 16
        
        const spaceBelow = viewportHeight - buttonRect.bottom - margin
        const spaceAbove = buttonRect.top - margin
        
        let top = buttonRect.bottom + 8
        let maxHeight = Math.min(maxDropdownHeight, spaceBelow)
        
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
          top = buttonRect.top - Math.min(maxDropdownHeight, spaceAbove) - 8
          maxHeight = Math.min(maxDropdownHeight, spaceAbove)
        }
        
        let left = buttonRect.left
        const minWidth = Math.max(buttonRect.width, 200)
        if (left + minWidth > viewportWidth) {
          left = Math.max(margin, viewportWidth - minWidth - margin)
        }
        
        maxHeight = Math.max(200, maxHeight)
        
        setDropdownPosition({
          top: Math.max(margin, top),
          left: left,
          width: buttonRect.width,
          maxHeight: maxHeight,
        })
      }
      
      const timeoutId = setTimeout(updatePosition, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [isDropdownOpen])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isDropdownOpen])

  if (!isOpen) return null

  const targetWallet = wallets.find((w) => w.id === targetWalletId)
  const selectedWallet = targetWallet ? availableWallets.find((w) => w.id === targetWalletId) : null

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-50 flex flex-col bg-[#F7F9FC] overflow-hidden rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

      {/* Header */}
      <header className="pointer-events-none relative z-40 flex-shrink-0 bg-[#F7F9FC]">
        <div className="relative px-1 py-1">
          <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-1.5 transition-all duration-300">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100 transition hover:scale-110 active:scale-95"
              aria-label="Quay lại"
            >
              <FaArrowLeft className="h-4 w-4 text-slate-800" />
            </button>
            <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
              CHUYỂN ĐỔI SỐ DƯ
            </p>
            <div className="flex h-10 w-10 items-center justify-center" />
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto overscroll-contain bg-[#F7F9FC]">
        <div className="mx-auto w-full max-w-md px-4 pt-2 pb-4 sm:px-6 sm:pt-2 sm:pb-5">
          <form onSubmit={handleSubmit} id="transfer-form" className="space-y-5">
            {/* Source Wallet Info */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getWalletTypeColors(sourceWallet.type).bg} p-5 shadow-xl`}>
              {/* Decorative patterns */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute -right-8 top-1/2 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                <div className="absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-white/10 blur-2xl"></div>
              </div>
              
              <div className="relative z-10">
                <p className="text-xs font-semibold text-white/80 mb-3 uppercase tracking-wider">Từ ví</p>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-white truncate">{sourceWallet.name}</p>
                    <p className="text-sm text-white/70 mt-1">{sourceWallet.type}</p>
                    <p className="text-2xl font-bold text-white mt-3">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      }).format(sourceWallet.balance)}
                    </p>
                  </div>
                  <div className={`h-14 w-14 shrink-0 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner`}>
                    <FaWallet className="h-7 w-7 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Icon */}
            <div className="flex justify-center py-1">
              <div className="relative">
                <div className="absolute inset-0 bg-sky-400 rounded-full blur-xl opacity-50"></div>
                <div className="relative rounded-full bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white shadow-xl">
                  <FaExchangeAlt className="h-7 w-7" />
                </div>
              </div>
            </div>

            {/* Target Wallet Selection */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                Đến ví <span className="text-rose-500">*</span>
              </label>
              {availableWallets.length === 0 ? (
                <div className="rounded-3xl bg-amber-50 p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FaWallet className="h-5 w-5 text-amber-500" />
                    <p className="text-sm text-amber-600">Không có ví nào khác để chuyển đổi</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex w-full items-center justify-between rounded-3xl bg-white p-4 text-left transition-all min-h-[64px] shadow-md ${
                      isDropdownOpen
                        ? 'shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20'
                        : 'hover:shadow-lg'
                    }`}
                  >
                    {selectedWallet ? (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`h-12 w-12 shrink-0 rounded-3xl bg-gradient-to-br ${getWalletTypeColors(selectedWallet.type).bg} flex items-center justify-center shadow-md`}>
                          <FaWallet className="h-6 w-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="text-sm font-bold text-slate-900 truncate">{selectedWallet.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{selectedWallet.type}</div>
                          <div className="text-sm font-semibold text-slate-700 mt-1">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0,
                            }).format(selectedWallet.balance)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-3xl bg-slate-100 flex items-center justify-center">
                          <FaWallet className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="text-sm text-slate-400 font-medium">Chọn ví đích</div>
                      </div>
                    )}
                    <FaChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isDropdownOpen && typeof document !== 'undefined' && createPortal(
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsDropdownOpen(false)}
                        aria-hidden="true"
                      />

                      {/* Dropdown Menu */}
                      <div 
                        ref={dropdownRef}
                        className="fixed z-[110] rounded-3xl bg-white shadow-2xl overflow-hidden"
                        style={{ 
                          top: `${Math.max(0, dropdownPosition.top)}px`,
                          left: `${Math.max(0, dropdownPosition.left)}px`,
                          width: `${Math.max(200, dropdownPosition.width || 200)}px`,
                          maxHeight: `${Math.max(200, dropdownPosition.maxHeight || 400)}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div 
                          className="overflow-y-auto overscroll-contain py-2 custom-scrollbar w-full"
                          style={{ 
                            maxHeight: `${Math.max(184, (dropdownPosition.maxHeight || 400) - 16)}px`,
                            WebkitOverflowScrolling: 'touch',
                          }}
                        >
                          {availableWallets.map((wallet) => {
                            const colors = getWalletTypeColors(wallet.type)
                            const isSelected = targetWalletId === wallet.id
                            
                            return (
                              <button
                                key={wallet.id}
                                type="button"
                                onClick={() => {
                                  setTargetWalletId(wallet.id)
                                  setIsDropdownOpen(false)
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all hover:scale-[1.01] active:scale-100 ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-sky-50 to-blue-50'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className={`h-12 w-12 shrink-0 rounded-3xl bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-md`}>
                                  <FaWallet className="h-6 w-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className={`text-sm font-bold leading-relaxed break-words ${isSelected ? 'text-sky-700' : 'text-slate-900'}`}>
                                    {wallet.name}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed break-words">
                                    {wallet.type}
                                  </div>
                                  <div className={`text-sm font-semibold mt-1 ${isSelected ? 'text-sky-600' : 'text-slate-700'}`}>
                                    {new Intl.NumberFormat('vi-VN', {
                                      style: 'currency',
                                      currency: 'VND',
                                      maximumFractionDigits: 0,
                                    }).format(wallet.balance)}
                                  </div>
                                </div>
                                {isSelected && (
                                  <FaCheck className="h-5 w-5 shrink-0 text-sky-600 drop-shadow-sm" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="mb-2.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                Số tiền chuyển đổi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const formatted = formatVNDInput(e.target.value)
                    setAmount(formatted)
                  }}
                  onFocus={() => setIsNumberPadOpen(true)}
                  className="w-full rounded-3xl border-2 border-slate-200 bg-white p-4 pr-14 text-base font-semibold text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-sm hover:shadow-md sm:p-5 sm:text-lg"
                  placeholder="Nhập số tiền (ví dụ: 50.000)"
                  required
                  readOnly
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-base sm:text-lg">
                  ₫
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-slate-400"></span>
                Nhấn vào ô để mở bàn phím số
              </p>
            </div>

            {/* Preview */}
            {targetWallet && amount && parseVNDInput(amount) > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-5 border-2 border-sky-200/50 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                  <p className="text-sm font-bold text-sky-900 uppercase tracking-wide">Kết quả sau chuyển đổi</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-white/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="h-2 w-2 rounded-full bg-slate-400 shrink-0"></div>
                      <span className="text-sm font-medium text-slate-700 truncate">{sourceWallet.name}:</span>
                    </div>
                    <span className="text-base font-bold text-slate-900 ml-2">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      }).format(sourceWallet.balance - parseVNDInput(amount))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-white/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
                      <span className="text-sm font-medium text-slate-700 truncate">{targetWallet.name}:</span>
                    </div>
                    <span className="text-base font-bold text-emerald-600 ml-2">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                        maximumFractionDigits: 0,
                      }).format(targetWallet.balance + parseVNDInput(amount))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300/50 p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-sm font-medium text-rose-800 leading-relaxed flex-1">{error}</p>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <ModalFooterButtons
        onCancel={onClose}
        onConfirm={() => {}}
        confirmText={isSubmitting ? 'Đang chuyển đổi...' : 'Xác nhận chuyển đổi'}
        isSubmitting={isSubmitting}
        disabled={isSubmitting || availableWallets.length === 0}
        confirmButtonType="submit"
        formId="transfer-form"
        className="safe-area-bottom"
      />

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={amount}
        onChange={(value) => setAmount(value)}
        onConfirm={() => setIsNumberPadOpen(false)}
      />
    </div>
  )
}

