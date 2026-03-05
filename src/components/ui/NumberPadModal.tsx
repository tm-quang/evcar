import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FaTimes, FaChevronRight } from 'react-icons/fa'
import { formatVNDInput } from '../../utils/currencyInput'

type NumberPadModalProps = {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
}

const QUICK_VALUES = [10000, 30000, 50000, 100000]

const getNumericValue = (formatted: string) => formatted.replace(/\./g, '')

// Memoized button component for better performance and responsiveness
const NumberButton = ({
  children,
  onClick,
  className = '',
  disabled = false
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
  disabled?: boolean
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && buttonRef.current) {
      buttonRef.current.classList.add('active-touch')
    }
  }, [disabled])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
    }

    if (!disabled) {
      // Immediate execution for better responsiveness
      onClick()
    }

    // Delay removal for visual feedback
    touchTimeoutRef.current = setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.classList.remove('active-touch')
      }
    }, 100)
  }, [disabled, onClick])

  const handleTouchCancel = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
    }
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && buttonRef.current) {
      buttonRef.current.classList.add('active-touch')
    }
  }, [disabled])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      onClick()
    }
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [disabled, onClick])

  const handleMouseLeave = useCallback(() => {
    if (buttonRef.current) {
      buttonRef.current.classList.remove('active-touch')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`touch-manipulation select-none active:outline-none focus:outline-none ${className}`}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </button>
  )
}

export const NumberPadModal = ({ isOpen, onClose, value, onChange, onConfirm }: NumberPadModalProps) => {
  const [displayValue, setDisplayValue] = useState(getNumericValue(value))
  const isUpdatingRef = useRef(false)

  // Sync display value when modal opens or value prop changes
  useEffect(() => {
    if (isOpen) {
      setDisplayValue(getNumericValue(value))
    }
  }, [isOpen, value])

  // Update display value when prop value changes - optimized with useCallback
  const handleValueChange = useCallback((newValue: string) => {
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true

    setDisplayValue(newValue)
    const formatted = formatVNDInput(newValue)
    onChange(formatted)

    // Reset flag after a short delay to allow rapid clicks
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 50)
  }, [onChange])

  // Memoize number click handlers
  const handleNumberClick = useCallback((num: string) => {
    const newValue = displayValue + num
    handleValueChange(newValue)
  }, [displayValue, handleValueChange])

  // Memoize quick value handlers
  const handleQuickValueClick = useCallback((quickValue: number) => {
    const currentValue = displayValue ? parseInt(displayValue) : 0
    const newValue = (currentValue + quickValue).toString()
    handleValueChange(newValue)
  }, [displayValue, handleValueChange])

  const handleBackspace = useCallback(() => {
    if (displayValue.length > 0) {
      handleValueChange(displayValue.slice(0, -1))
    }
  }, [displayValue, handleValueChange])

  const handleClear = useCallback(() => {
    handleValueChange('')
  }, [handleValueChange])

  const handleConfirm = useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  // Memoize formatted display to avoid recalculation
  const formattedDisplay = useMemo(() => {
    return displayValue ? formatVNDInput(displayValue) : ''
  }, [displayValue])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <style>{`
        .touch-manipulation {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .active-touch {
          transform: scale(0.92) !important;
          opacity: 0.85 !important;
          filter: brightness(0.95);
        }
        .number-pad-button {
          transition: transform 0.08s cubic-bezier(0.4, 0, 0.2, 1), 
                      opacity 0.08s cubic-bezier(0.4, 0, 0.2, 1), 
                      background-color 0.12s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 0.08s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
        }
        .number-pad-button:active {
          transform: scale(0.92) translateZ(0);
        }
        .number-pad-button:hover:not(:disabled) {
          transform: scale(1.02) translateZ(0);
        }
        @media (hover: none) {
          .number-pad-button:hover:not(:disabled) {
            transform: translateZ(0);
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm bg-slate-950/50 pointer-events-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <div className="flex w-full max-w-md mx-auto max-h-[85vh] flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pointer-events-auto mt-12 sm:mt-0 safe-area-bottom" style={{ backgroundColor: '#F2F4F7' }}>
          {/* Mobile Handle */}
          <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1" style={{ backgroundColor: '#F2F4F7' }}>
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2" style={{ backgroundColor: '#F2F4F7' }}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Nhập số tiền</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:bg-slate-300 active:scale-95 touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Display */}
          <div className="px-3 py-3 border-b border-slate-200" style={{ backgroundColor: '#F2F4F7' }}>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {formattedDisplay || '0'} <span className="text-base text-slate-500">₫</span>
              </p>
              {displayValue && parseInt(displayValue) > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {parseInt(displayValue).toLocaleString('vi-VN')} đồng
                </p>
              )}
            </div>
          </div>

          {/* Quick Value Buttons */}
          <div className="px-3 py-2.5 border-b border-slate-200" style={{ backgroundColor: '#F2F4F7' }}>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_VALUES.map((quickValue) => (
                <NumberButton
                  key={quickValue}
                  onClick={() => handleQuickValueClick(quickValue)}
                  className="number-pad-button rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-md hover:bg-slate-50 active:shadow-inner"
                >
                  +{formatVNDInput(quickValue.toString())}
                </NumberButton>
              ))}
            </div>
          </div>

          {/* Number Pad */}
          <div className="flex-1 overflow-y-auto px-3 py-3" style={{ backgroundColor: '#F2F4F7' }}>
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1: Clear, Divide, Multiply, Backspace */}
              <NumberButton
                onClick={handleClear}
                className="number-pad-button rounded-2xl bg-red-400 px-3 py-4 text-base font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                C
              </NumberButton>
              <NumberButton
                onClick={() => { }}
                disabled
                className="rounded-2xl bg-blue-400 px-3 py-4 text-base font-bold text-gray-700 shadow-md opacity-90 cursor-not-allowed"
              >
                ÷
              </NumberButton>
              <NumberButton
                onClick={() => { }}
                disabled
                className="rounded-2xl bg-amber-300 px-3 py-4 text-base font-bold text-gray-700 shadow-md opacity-90 cursor-not-allowed"
              >
                ×
              </NumberButton>
              <NumberButton
                onClick={handleBackspace}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-base font-bold text-slate-800 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                ⌫
              </NumberButton>

              {/* Row 2: 7, 8, 9, Minus */}
              <NumberButton
                onClick={() => handleNumberClick('7')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                7
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('8')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                8
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('9')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                9
              </NumberButton>
              <NumberButton
                onClick={() => { }}
                disabled
                className="rounded-2xl bg-rose-300 px-3 py-4 text-base font-bold text-gray-700 shadow-md opacity-90 cursor-not-allowed"
              >
                −
              </NumberButton>

              {/* Row 3: 4, 5, 6, Plus */}
              <NumberButton
                onClick={() => handleNumberClick('4')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                4
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('5')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                5
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('6')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                6
              </NumberButton>
              <NumberButton
                onClick={() => { }}
                disabled
                className="rounded-2xl bg-emerald-300 px-3 py-4 text-base font-bold text-gray-700 shadow-md opacity-90 cursor-not-allowed"
              >
                +
              </NumberButton>

              {/* Row 4: 1, 2, 3, Confirm (spans 2 rows) */}
              <NumberButton
                onClick={() => handleNumberClick('1')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                1
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('2')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                2
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('3')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                3
              </NumberButton>
              <NumberButton
                onClick={handleConfirm}
                className="number-pad-button row-span-2 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-blue-600 px-3 py-4 text-white shadow-lg hover:from-sky-600 hover:via-blue-600 hover:to-blue-700 active:shadow-inner flex items-center justify-center"
              >
                <FaChevronRight className="h-6 w-6" />
              </NumberButton>

              {/* Row 5: 0, 000, Comma */}
              <NumberButton
                onClick={() => handleNumberClick('0')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-xl font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                0
              </NumberButton>
              <NumberButton
                onClick={() => handleNumberClick('000')}
                className="number-pad-button rounded-2xl bg-white px-3 py-4 text-lg font-bold text-slate-900 shadow-md hover:bg-slate-50 active:shadow-inner"
              >
                000
              </NumberButton>
              <NumberButton
                onClick={() => { }}
                disabled
                className="rounded-2xl bg-gray-500 px-3 py-4 text-xl font-bold text-white shadow-md opacity-90 cursor-not-allowed"
              >
                ,
              </NumberButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
