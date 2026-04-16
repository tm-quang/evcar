import { useState, useEffect } from 'react'
import { FaTimes, FaBackspace } from 'react-icons/fa'

type CalculatorModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Operation = '+' | '-' | '*' | '/' | null

export const CalculatorModal = ({ isOpen, onClose }: CalculatorModalProps) => {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<Operation>(null)
  const [waitingForNewValue, setWaitingForNewValue] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Reset calculator when modal opens
  useEffect(() => {
    if (isOpen) {
      resetCalculator()
    }
  }, [isOpen])

  const resetCalculator = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForNewValue(false)
  }

  const formatNumber = (num: number): string => {
    // Format number to avoid scientific notation for large numbers
    if (num.toString().length > 12) {
      return num.toExponential(6)
    }
    return num.toString()
  }

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num)
      setWaitingForNewValue(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.')
      setWaitingForNewValue(false)
    } else if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const handleOperation = (nextOperation: Operation) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(formatNumber(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForNewValue(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: Operation): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue
      case '-':
        return firstValue - secondValue
      case '*':
        return firstValue * secondValue
      case '/':
        return secondValue !== 0 ? firstValue / secondValue : 0
      default:
        return secondValue
    }
  }

  const handleEquals = () => {
    const inputValue = parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(formatNumber(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForNewValue(true)
    }
  }

  const handleClear = () => {
    resetCalculator()
  }

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }

  const handlePercentage = () => {
    const value = parseFloat(display) / 100
    setDisplay(formatNumber(value))
  }

  const handleToggleSign = () => {
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display)
    }
  }

  if (!isOpen) return null

  // Format display for better readability
  const displayValue = display.length > 12
    ? display
    : parseFloat(display).toLocaleString('vi-VN', {
      maximumFractionDigits: 10,
      useGrouping: false
    })

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm bg-slate-950/50 animate-in fade-in duration-200 pointer-events-none">
      <div className="relative w-full max-w-md flex flex-col rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 shadow-2xl ring-1 ring-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto mt-12 sm:mt-0 safe-area-bottom">
        {/* Header with Handle */}
        <div className="shrink-0 border-b border-slate-200/50 bg-gradient-to-r from-white to-slate-50 sticky top-0 z-20">
          {/* Mobile Handle */}
          <div className="flex w-full justify-center pt-3 pb-2 sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          <div className="flex items-center justify-between px-4 py-2 sm:px-6 sm:py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Bàn phím máy tính</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Máy tính cầm tay</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
            >
              <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Calculator Body */}
        <div className="flex-1 p-4 sm:p-6">
          {/* Display Screen */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 shadow-inner ring-2 ring-slate-700/50">
            <div className="min-h-[60px] sm:min-h-[80px] flex items-center justify-end">
              <div className="text-right">
                {operation && previousValue !== null && (
                  <div className="text-xs sm:text-sm text-slate-400 mb-1 font-mono">
                    {formatNumber(previousValue)} {operation}
                  </div>
                )}
                <div className="text-3xl sm:text-4xl font-bold text-white font-mono break-all">
                  {displayValue}
                </div>
              </div>
            </div>
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {/* Row 1: Clear, Backspace, Percentage, Divide */}
            <button
              onClick={handleClear}
              className="h-14 sm:h-16 rounded-xl bg-red-500 text-white font-semibold text-lg sm:text-xl shadow-lg hover:bg-red-600 active:scale-95 transition-all"
            >
              C
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 sm:h-16 rounded-xl bg-slate-400 text-white font-semibold shadow-lg hover:bg-slate-500 active:scale-95 transition-all flex items-center justify-center"
            >
              <FaBackspace className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              onClick={handlePercentage}
              className="h-14 sm:h-16 rounded-xl bg-slate-400 text-white font-semibold text-lg sm:text-xl shadow-lg hover:bg-slate-500 active:scale-95 transition-all"
            >
              %
            </button>
            <button
              onClick={() => handleOperation('/')}
              className={`h-14 sm:h-16 rounded-xl font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transition-all ${operation === '/'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              ÷
            </button>

            {/* Row 2: 7, 8, 9, Multiply */}
            <button
              onClick={() => handleNumber('7')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              7
            </button>
            <button
              onClick={() => handleNumber('8')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              8
            </button>
            <button
              onClick={() => handleNumber('9')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              9
            </button>
            <button
              onClick={() => handleOperation('*')}
              className={`h-14 sm:h-16 rounded-xl font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transition-all ${operation === '*'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              ×
            </button>

            {/* Row 3: 4, 5, 6, Subtract */}
            <button
              onClick={() => handleNumber('4')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              4
            </button>
            <button
              onClick={() => handleNumber('5')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              5
            </button>
            <button
              onClick={() => handleNumber('6')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              6
            </button>
            <button
              onClick={() => handleOperation('-')}
              className={`h-14 sm:h-16 rounded-xl font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transition-all ${operation === '-'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              −
            </button>

            {/* Row 4: 1, 2, 3, Add */}
            <button
              onClick={() => handleNumber('1')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              1
            </button>
            <button
              onClick={() => handleNumber('2')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              2
            </button>
            <button
              onClick={() => handleNumber('3')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              3
            </button>
            <button
              onClick={() => handleOperation('+')}
              className={`h-14 sm:h-16 rounded-xl font-semibold text-lg sm:text-xl shadow-lg active:scale-95 transition-all ${operation === '+'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
              +
            </button>

            {/* Row 5: Toggle Sign, 0, Decimal, Equals */}
            <button
              onClick={handleToggleSign}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              ±
            </button>
            <button
              onClick={() => handleNumber('0')}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              onClick={handleDecimal}
              className="h-14 sm:h-16 rounded-xl bg-white text-slate-900 font-semibold text-lg sm:text-xl shadow-md hover:bg-slate-50 active:scale-95 transition-all"
            >
              .
            </button>
            <button
              onClick={handleEquals}
              className="h-14 sm:h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-lg sm:text-xl shadow-lg hover:from-green-600 hover:to-green-700 active:scale-95 transition-all"
            >
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


