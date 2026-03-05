import React, { useEffect, useState, useRef, useMemo } from 'react'
import { FaTimes, FaChevronRight, FaFolder, FaSearch } from 'react-icons/fa'
import { fetchCategoriesHierarchical, type CategoryWithChildren } from '../../lib/categoryService'
import { CategoryIcon } from '../ui/CategoryIcon'
import { CategoryListSkeleton } from '../skeletons'
import HeaderBar from '../layout/HeaderBar'

type CategoryPickerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (categoryId: string) => void
  selectedCategoryId?: string
  categoryType: 'Chi tiêu' | 'Thu nhập'
  onEditCategory?: (categoryId: string) => void
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCategoryId,
  categoryType,
  // onEditCategory, // Reserved for future use
}) => {
  const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Reset khi mở/đóng modal
  useEffect(() => {
    if (!isOpen) {
      // Reset khi đóng
      setExpandedParents(new Set())
      setSearchTerm('')
    }
  }, [isOpen])

  // Load categories khi modal mở hoặc categoryType thay đổi
  useEffect(() => {
    if (isOpen) {
      const loadCategories = async () => {
        setIsLoading(true)
        try {
          const categories = await fetchCategoriesHierarchical(categoryType)
          setHierarchicalCategories(categories)
        } catch (error) {
          console.error('Error loading categories:', error)
        } finally {
          setIsLoading(false)
        }
      }
      loadCategories()
    }
  }, [isOpen, categoryType])

  // Không cần đóng khi click ra ngoài vì là full screen

  const toggleParentExpanded = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedParents((prev) => {
      const newSet = new Set<string>()
      // Nếu đang mở thì đóng, nếu đang đóng thì mở (và đóng các mục khác)
      if (prev.has(parentId)) {
        // Đóng mục này
        return newSet
      } else {
        // Mở mục này (accordion: chỉ mở 1 mục tại một thời điểm)
        newSet.add(parentId)
        return newSet
      }
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    onSelect(categoryId)
    onClose()
  }

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return hierarchicalCategories
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = hierarchicalCategories
      .map((parent) => {
        const parentMatches = parent.name.toLowerCase().includes(searchLower)
        const matchingChildren = parent.children?.filter((child) =>
          child.name.toLowerCase().includes(searchLower)
        )

        // Nếu parent match hoặc có children match
        if (parentMatches || (matchingChildren && matchingChildren.length > 0)) {
          return {
            ...parent,
            children: parentMatches
              ? parent.children // Nếu parent match, hiển thị tất cả children
              : matchingChildren, // Nếu không, chỉ hiển thị children match
          }
        }
        return null
      })
      .filter((category) => category !== null) as CategoryWithChildren[]
    
    return filtered
  }, [hierarchicalCategories, searchTerm])

  // const handleEditCategory = (categoryId: string, e: React.MouseEvent) => {
  //   e.stopPropagation()
  //   e.preventDefault()
  //   if (onEditCategory) {
  //     onEditCategory(categoryId)
  //   }
  // }

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-[9999] flex flex-col bg-[#F7F9FC] rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

      {/* Header */}
      <HeaderBar 
        variant="page" 
        title="CHỌN HẠNG MỤC"
        onBack={onClose}
      />

      {/* Content Container with max-width */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Top Actions Bar */}
          <div className="shrink-0 px-3 py-2.5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              {categoryType}
            </h3>
          </div>

          {/* Search Bar */}
          <div className="shrink-0 px-4 pb-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm hạng mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                aria-label="Xóa tìm kiếm"
              >
                  <FaTimes className="h-3.5 w-3.5" />
              </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
          {isLoading ? (
            <div className="p-4">
              <CategoryListSkeleton count={12} />
            </div>
          ) : (
            <>
              {/* All Categories List */}
              {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 p-5 shadow-sm">
                <FaFolder className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm ? 'Không tìm thấy hạng mục' : 'Chưa có hạng mục'}
              </h4>
              <p className="text-sm text-slate-500 text-center max-w-md">
                {searchTerm
                  ? 'Thử tìm kiếm với từ khóa khác'
                  : 'Hãy tạo hạng mục mới để bắt đầu sử dụng'}
              </p>
            </div>
          ) : (
            <div className="py-3 shadow-sm ring-1 rounded-2xl mx-4 mt-2 bg-white ring-slate-200">
              {filteredCategories.map((parent, index) => {
                const hasChildren = parent.children && parent.children.length > 0
                const isExpanded = expandedParents.has(parent.id) || searchTerm.length > 0 // Auto-expand when searching
                const isSelected = selectedCategoryId === parent.id

                return (
                  <div key={parent.id}>
                    {/* Divider */}
                    {index > 0 && (
                      <div className="mx-4 border-t border-slate-200" />
                    )}
                    <div className="px-4">
                      {/* Parent Category */}
                      <div
                        className={`group flex items-center gap-2 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500 shadow-sm'
                            : 'hover:bg-slate-50 active:bg-slate-100'
                        }`}
                        onClick={() => handleCategorySelect(parent.id)}
                      >
                      {/* Expand/Collapse Button */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleParentExpanded(parent.id, e)
                          }}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                            isExpanded
                              ? 'bg-sky-200 text-sky-600'
                              : 'bg-slate-200 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                          }`}
                        >
                          <FaChevronRight
                            className={`h-5 w-5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="w-7" />
                      )}

                      {/* Icon */}
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-all">
                        <CategoryIcon
                          iconId={parent.icon_id}
                          iconUrl={parent.icon_url}
                          className="h-14 w-14"
                          fallback={
                            <span className="text-3xl font-semibold text-slate-400">
                              {parent.name[0]?.toUpperCase() || '?'}
                            </span>
                          }
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-base font-semibold ${
                          isSelected ? 'text-sky-900' : 'text-slate-900'
                        }`}>
                          {parent.name}
                        </p>
                        {hasChildren && parent.children && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {parent.children.length} {parent.children.length === 1 ? 'hạng mục con' : 'hạng mục con'}
                          </p>
                        )}
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Children Categories - Only show if expanded */}
                    {hasChildren && isExpanded && parent.children && parent.children.length > 0 && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-slate-200 pl-1">
                        {parent.children.map((child, index) => {
                          const isChildSelected = selectedCategoryId === child.id
                          return (
                            <div
                              key={child.id}
                              className={`group flex items-center gap-2 px-3 py-1 rounded-xl transition-all cursor-pointer ${
                                isChildSelected
                                  ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500 shadow-sm'
                                  : 'hover:bg-slate-50 active:bg-slate-100'
                              }`}
                              onClick={() => handleCategorySelect(child.id)}
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              {/* Spacer for alignment */}
                              <div className="w-5" />

                              {/* Icon */}
                              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full transition-all">
                                <CategoryIcon
                                  iconId={child.icon_id}
                                  iconUrl={child.icon_url}
                                  className="h-14 w-14"
                                  fallback={
                                    <span className="text-2xl font-semibold text-slate-400">
                                      {child.name[0]?.toUpperCase() || '?'}
                                    </span>
                                  }
                                />
                              </div>

                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <p className={`truncate text-sm font-semibold ${
                                  isChildSelected ? 'text-sky-900' : 'text-slate-900'
                                }`}>
                                  {child.name}
                                </p>
                              </div>

                              {/* Selected Indicator */}
                              {isChildSelected && (
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
              )}
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}

