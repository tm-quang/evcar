import { useEffect, useRef, useState, useMemo } from 'react'
import { FaChevronDown, FaCheck, FaSearch, FaTimes } from 'react-icons/fa'

type Option = {
  value: string
  label: string
  icon?: React.ReactNode
  metadata?: string
}

type SearchableSelectProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  className?: string
  searchPlaceholder?: string
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  emptyMessage = 'Không có dữ liệu',
  className = '',
  searchPlaceholder = 'Tìm kiếm...',
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const term = searchTerm.toLowerCase().trim()
    return options.filter((opt) => 
      opt.label.toLowerCase().includes(term) ||
      opt.metadata?.toLowerCase().includes(term)
    )
  }, [options, searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative flex ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex h-12 w-full items-center justify-between rounded-xl border-2 bg-white px-4 text-left transition-all ${
          isOpen
            ? 'border-sky-500 shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
          !selectedOption ? 'text-slate-400' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectedOption?.icon && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-600">
              {selectedOption.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <>
                <div className="truncate text-sm font-medium text-slate-900">{selectedOption.label}</div>
                {selectedOption.metadata && (
                  <div className="truncate text-xs text-slate-500">{selectedOption.metadata}</div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400">{placeholder}</div>
            )}
          </div>
        </div>
        <FaChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => {
              setIsOpen(false)
              setSearchTerm('')
            }}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full rounded-xl border-2 border-slate-200 bg-white shadow-2xl transition-all">
            {/* Search Input */}
            <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                  >
                    <FaTimes className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  {searchTerm ? 'Không tìm thấy kết quả' : emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      value === option.value
                        ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.icon && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-600">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.metadata && <div className="text-xs text-slate-500 mt-0.5">{option.metadata}</div>}
                    </div>
                    {value === option.value && (
                      <FaCheck className="h-4 w-4 shrink-0 text-sky-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


