import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaCheck, FaWallet, FaFolder, FaReceipt } from 'react-icons/fa'
import { Skeleton } from '../skeletons'

type Option = {
  value: string
  label: string
  icon?: React.ReactNode
  metadata?: string
}

type CustomSelectProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  className = '',
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 400 })

  const selectedOption = options.find((opt) => opt.value === value)

  // Recalculate dropdown position when opened (fallback for positioning updates)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
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
      
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(updatePosition, 0)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    const handleResize = () => {
      if (isOpen) {
        setIsOpen(false) // Close dropdown on resize
      }
    }

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false) // Close dropdown on scroll
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true) // Use capture phase
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  if (loading) {
    return (
      <div className={`rounded-xl border-2 border-slate-200 bg-white p-3 ${className}`}>
        <Skeleton variant="rounded" height={24} width="100%" />
      </div>
    )
  }

  // Determine icon based on emptyMessage content
  const getEmptyIcon = () => {
    const message = emptyMessage.toLowerCase()
    if (message.includes('ví')) {
      return <FaWallet className="h-5 w-5 text-amber-500" />
    } else if (message.includes('hạng mục')) {
      return <FaFolder className="h-5 w-5 text-amber-500" />
    } else if (message.includes('giao dịch')) {
      return <FaReceipt className="h-5 w-5 text-amber-500" />
    }
    return null
  }

  if (options.length === 0) {
    const emptyIcon = getEmptyIcon()
    return (
      <div className={`rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-600 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          {emptyIcon && <div className="flex items-center justify-center">{emptyIcon}</div>}
          <span>{emptyMessage}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className={`relative flex w-full ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (disabled) return
            
            const willBeOpen = !isOpen
            
            if (willBeOpen && buttonRef.current) {
              // Calculate position immediately before opening
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
              const width = Math.max(buttonRect.width, 200)
              
              // Set position and open immediately
              setDropdownPosition({
                top: Math.max(margin, top),
                left: Math.max(margin, left),
                width: width,
                maxHeight: maxHeight,
              })
              setIsOpen(true)
            } else {
              setIsOpen(false)
            }
          }}
          disabled={disabled}
          className={`flex h-full w-full items-center justify-between rounded-2xl border-2 bg-gradient-to-br from-white to-slate-50 p-4 text-left transition-all min-h-[56px] ${
            isOpen
              ? 'border-sky-500 shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
            !selectedOption ? 'text-slate-400' : 'text-slate-900'
          }`}
        >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {selectedOption?.icon && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-600">
              {selectedOption.icon}
            </span>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            {selectedOption ? (
              <>
                <div className="text-sm font-semibold text-slate-900 leading-relaxed break-words">{selectedOption.label}</div>
                {selectedOption.metadata && (
                  <div className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed break-words">
                    {selectedOption.metadata}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400 font-medium">{placeholder}</div>
            )}
          </div>
        </div>
          <FaChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(false)
            }}
            aria-hidden="true"
          />

          {/* Dropdown - Fixed positioning below button, rendered via portal */}
          <div 
            ref={dropdownRef}
            className="fixed z-[110] rounded-2xl border-2 border-slate-300 bg-white shadow-2xl overflow-hidden"
            style={{ 
              top: `${Math.max(0, dropdownPosition.top)}px`,
              left: `${Math.max(0, dropdownPosition.left)}px`,
              width: `${Math.max(200, dropdownPosition.width || 200)}px`,
              maxHeight: `${Math.max(200, dropdownPosition.maxHeight || 400)}px`,
            }}
            onClick={(e) => {
              e.stopPropagation() // Prevent click from closing
            }}
            onMouseDown={(e) => {
              e.stopPropagation() // Prevent mousedown from closing
            }}
          >
            <div 
              className="overflow-y-auto overscroll-contain py-2 custom-scrollbar w-full"
              style={{ 
                maxHeight: `${Math.max(184, (dropdownPosition.maxHeight || 400) - 16)}px`, // Subtract padding (py-2 = 8px * 2)
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                minHeight: '200px',
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all hover:scale-[1.02] active:scale-100 ${
                    value === option.value
                      ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-l-4 border-sky-500 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {option.icon && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm border border-slate-200">
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-sm font-medium leading-relaxed break-words">{option.label}</div>
                    {option.metadata && (
                      <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed break-words">
                        {option.metadata}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <FaCheck className="h-5 w-5 shrink-0 text-sky-600 drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

