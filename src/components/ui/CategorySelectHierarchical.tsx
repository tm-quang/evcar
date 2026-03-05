import { useEffect, useRef, useState } from 'react'
import { FaChevronDown, FaCheck, FaChevronUp } from 'react-icons/fa'
import { type CategoryWithChildren } from '../../lib/categoryService'
import { CategoryIcon } from './CategoryIcon'

type CategorySelectHierarchicalProps = {
  categories: CategoryWithChildren[]
  categoryIcons: Record<string, React.ReactNode>
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const CategorySelectHierarchical = ({
  categories,
  categoryIcons,
  value,
  onChange,
  placeholder = 'Chọn hạng mục...',
  disabled = false,
  loading = false,
  emptyMessage = 'Chưa có hạng mục',
  className = '',
}: CategorySelectHierarchicalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Find selected category (can be parent or child)
  const findSelectedCategory = (): { name: string; icon: React.ReactNode } | null => {
    for (const parent of categories) {
      if (parent.id === value) {
        return {
          name: parent.name,
          icon: categoryIcons[parent.id] || <CategoryIcon iconId={parent.icon_id} iconUrl={parent.icon_url} className="h-6 w-6" />,
        }
      }
      if (parent.children) {
        for (const child of parent.children) {
          if (child.id === value) {
            return {
              name: child.name,
              icon: categoryIcons[child.id] || <CategoryIcon iconId={child.icon_id} iconUrl={child.icon_url} className="h-6 w-6" />,
            }
          }
        }
      }
    }
    return null
  }

  const selectedCategory = findSelectedCategory()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleParentExpanded = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedParents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(parentId)) {
        newSet.delete(parentId)
      } else {
        newSet.add(parentId)
      }
      return newSet
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    onChange(categoryId)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`rounded-xl border-2 border-slate-200 bg-white p-3 ${className}`}>
        <div className="h-6 w-full animate-pulse bg-slate-200 rounded" />
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className={`rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-600 ${className}`}>
        <span>{emptyMessage}</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative flex ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex h-full w-full items-center justify-between rounded-xl border-2 bg-white p-3 text-left transition-all ${
          isOpen
            ? 'border-sky-500 shadow-lg shadow-sky-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
          !selectedCategory ? 'text-slate-400' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectedCategory?.icon && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-600">
              {selectedCategory.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {selectedCategory ? (
              <div className="truncate text-base font-medium text-slate-900">{selectedCategory.name}</div>
            ) : (
              <div className="text-base text-slate-400">{placeholder}</div>
            )}
          </div>
        </div>
        <FaChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full rounded-xl border-2 border-slate-200 bg-white shadow-2xl transition-all max-h-96 overflow-hidden">
            <div className="overflow-y-auto overscroll-contain py-2 max-h-96">
              {categories.map((parent, index) => {
                const hasChildren = parent.children && parent.children.length > 0
                const isExpanded = expandedParents.has(parent.id)
                const isParentSelected = value === parent.id

                return (
                  <div key={parent.id}>
                    {/* Divider */}
                    {index > 0 && <div className="mx-3 border-t border-slate-200" />}
                    
                    {/* Parent Category */}
                    <div className="px-2">
                      <div
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isParentSelected
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {/* Expand/Collapse Button */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => toggleParentExpanded(parent.id, e)}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded transition-all ${
                              isExpanded
                                ? 'bg-sky-100 text-sky-600'
                                : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                            }`}
                          >
                            <FaChevronUp
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? '' : 'rotate-180'
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="w-7" />
                        )}

                        {/* Icon */}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
                          {categoryIcons[parent.id] || (
                            <CategoryIcon iconId={parent.icon_id} iconUrl={parent.icon_url} className="h-7 w-7" />
                          )}
                        </span>

                        {/* Name */}
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(parent.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="truncate text-base font-medium">{parent.name}</div>
                        </button>

                        {/* Checkmark */}
                        {isParentSelected && (
                          <FaCheck className="h-5 w-5 shrink-0 text-sky-600" />
                        )}
                      </div>

                      {/* Children Categories */}
                      {hasChildren && isExpanded && parent.children && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                          {parent.children.map((child) => {
                            const isChildSelected = value === child.id
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => handleCategorySelect(child.id)}
                                className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                  isChildSelected
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="w-7" />
                                {/* Icon */}
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full">
                                  {categoryIcons[child.id] || (
                                    <CategoryIcon iconId={child.icon_id} iconUrl={child.icon_url} className="h-6 w-6" />
                                  )}
                                </span>
                                {/* Name */}
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="truncate text-sm font-medium">{child.name}</div>
                                </div>
                                {/* Checkmark */}
                                {isChildSelected && (
                                  <FaCheck className="h-4 w-4 shrink-0 text-sky-600" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


