import React, { useEffect, useState, useRef, useMemo } from 'react'
import { FaTimes, FaStar, FaSearch, FaChevronUp } from 'react-icons/fa'
import { fetchCategoriesHierarchical, type CategoryWithChildren } from '../../lib/categoryService'
import { getFavoriteCategories, saveFavoriteCategories } from '../../lib/favoriteCategoriesService'
import { CategoryIcon } from '../ui/CategoryIcon'
import { CategoryListSkeleton } from '../skeletons'
import { useNotification } from '../../contexts/notificationContext.helpers'
import HeaderBar from '../layout/HeaderBar'

interface FavoriteCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  categoryType: 'Chi tiêu' | 'Thu nhập'
}

export const FavoriteCategoriesModal: React.FC<FavoriteCategoriesModalProps> = ({
  isOpen,
  onClose,
  categoryType,
}) => {
  const { success, error: showError } = useNotification()
  const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load categories and favorites
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoading(true)
        try {
          const [categories, favorites] = await Promise.all([
            fetchCategoriesHierarchical(categoryType),
            getFavoriteCategories(categoryType),
          ])
          setHierarchicalCategories(categories)
          setFavoriteIds(new Set(favorites))
        } catch (error) {
          console.error('Error loading data:', error)
          showError('Không thể tải dữ liệu')
        } finally {
          setIsLoading(false)
        }
      }
      loadData()
    } else {
      // Reset when closing
      setSearchTerm('')
      setExpandedParents(new Set())
    }
  }, [isOpen, categoryType, showError])

  // Full screen - không cần đóng khi click ra ngoài

  const toggleFavorite = (categoryId: string) => {
    setFavoriteIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        // Limit to 7 favorites
        if (newSet.size >= 7) {
          showError('Chỉ có thể chọn tối đa 7 hạng mục thường dùng')
          return prev
        }
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveFavoriteCategories(categoryType, Array.from(favoriteIds))
      success('Đã lưu danh sách hạng mục thường dùng')
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu danh sách'
      showError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    const confirmed = window.confirm('Bạn có chắc muốn đặt lại danh sách mục hay dùng về mặc định?')
    if (!confirmed) return

    setIsSaving(true)
    try {
      // Reset về danh sách rỗng
      await saveFavoriteCategories(categoryType, [])
      setFavoriteIds(new Set())
      success('Đã đặt lại danh sách mục hay dùng')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đặt lại danh sách'
      showError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleParentExpanded = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedParents((prev) => {
      const newSet = new Set<string>()
      if (prev.has(parentId)) {
        return newSet
      } else {
        newSet.add(parentId)
        return newSet
      }
    })
  }

  // Get all categories (parent and children) for search
  const allCategories = useMemo(() => {
    const categories: Array<CategoryWithChildren & { isChild?: boolean; parentId?: string }> = []
    hierarchicalCategories.forEach((parent) => {
      categories.push(parent)
      if (parent.children) {
        parent.children.forEach((child) => {
          categories.push({ ...child, isChild: true, parentId: parent.id })
        })
      }
    })
    return categories
  }, [hierarchicalCategories])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return hierarchicalCategories
    }

    const searchLower = searchTerm.toLowerCase().trim()
    const matchingIds = new Set(
      allCategories
        .filter((cat) => cat.name.toLowerCase().includes(searchLower))
        .map((cat) => cat.id)
    )

    return hierarchicalCategories
      .map((parent) => {
        const parentMatches = matchingIds.has(parent.id)
        const matchingChildren = parent.children?.filter((child) =>
          matchingIds.has(child.id)
        )

        if (parentMatches || (matchingChildren && matchingChildren.length > 0)) {
          return {
            ...parent,
            children: parentMatches ? parent.children : matchingChildren,
          } as CategoryWithChildren
        }
        return null
      })
      .filter((category): category is CategoryWithChildren => category !== null)
  }, [hierarchicalCategories, searchTerm, allCategories])

  if (!isOpen) return null

  const favoriteCount = favoriteIds.size

  return (
    <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-[99999] flex flex-col bg-[#F7F9FC] rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

      {/* Header */}
      <HeaderBar 
        variant="page" 
        title="SỬA MỤC HAY DÙNG"
        onBack={onClose}
      />

      {/* Content Container with max-width */}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        <div className="mx-auto flex w-full max-w-md flex-col">
          {/* Category Type Info */}
          <div className="shrink-0 flex items-center justify-between px-4 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              {categoryType}
            </h3>
            <span className="text-sm text-slate-600">
              Đã chọn: <span className="font-semibold text-sky-600">{favoriteCount}/7</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className="shrink-0 px-4 pb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm theo tên hạng mục..."
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
              <CategoryListSkeleton count={8} />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 p-4 shadow-sm">
                <FaSearch className="h-8 w-8 text-slate-400" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">
                Không tìm thấy hạng mục
              </h4>
              <p className="text-sm text-slate-500 text-center max-w-md">
                Thử tìm kiếm với từ khóa khác
              </p>
            </div>
          ) : (
            <div className={`py-3 shadow-sm ring-1 rounded-2xl mx-4 mt-4 ${
              categoryType === 'Chi tiêu'
                ? 'bg-gradient-to-br from-rose-50/30 to-white ring-rose-100/50'
                : 'bg-gradient-to-br from-emerald-50/30 to-white ring-emerald-100/50'
            }`}>
              {filteredCategories.map((parent) => {
                if (!parent) return null
                const hasChildren = parent.children && parent.children.length > 0
                const isExpanded = expandedParents.has(parent.id) || searchTerm.length > 0
                const parentId = parent.id
                const parentIconId = parent.icon_id
                const parentName = parent.name
                const parentChildren = parent.children

                return (
                  <div key={parentId} className="mb-0.5 px-4">
                    {/* Parent Category */}
                    <div
                      className={`group flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                        favoriteIds.has(parentId)
                          ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Expand/Collapse Button */}
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleParentExpanded(parentId, e)
                          }}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                            isExpanded
                              ? 'bg-sky-100 text-sky-600'
                              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                          }`}
                        >
                          <FaChevronUp
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              isExpanded ? '' : 'rotate-180'
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="w-7" />
                      )}

                      {/* Icon */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all">
                        <CategoryIcon
                          iconId={parentIconId}
                          iconUrl={parent.icon_url}
                          className="h-6 w-6"
                          fallback={
                            <span className="text-lg font-semibold text-slate-400">
                              {parentName[0]?.toUpperCase() || '?'}
                            </span>
                          }
                        />
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {parentName}
                        </p>
                      </div>

                      {/* Favorite Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(parentId)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                          favoriteIds.has(parentId)
                            ? 'text-amber-500'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      >
                        <FaStar
                          className={`h-5 w-5 ${
                            favoriteIds.has(parentId) ? 'fill-current drop-shadow-sm' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Children Categories */}
                    {hasChildren && isExpanded && parentChildren && parentChildren.length > 0 && (
                      <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
                        {parentChildren.map((child) => (
                          <div
                            key={child.id}
                            className={`group flex items-center gap-3 px-4 py-1.5 rounded-xl transition-all ${
                              favoriteIds.has(child.id)
                                ? 'bg-gradient-to-r from-sky-50 to-blue-50 ring-2 ring-sky-500'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="w-7" />

                            {/* Icon */}
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm ${
                                favoriteIds.has(child.id)
                                  ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
                                  : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                              }`}
                            >
                              <CategoryIcon
                                iconId={child.icon_id}
                                iconUrl={child.icon_url}
                                className={`h-5 w-5 ${favoriteIds.has(child.id) ? 'text-white' : ''}`}
                                fallback={
                                  <span className={`text-base font-semibold ${
                                    favoriteIds.has(child.id) ? 'text-white' : 'text-slate-600'
                                  }`}>
                                    {child.name[0]?.toUpperCase() || '?'}
                                  </span>
                                }
                              />
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {child.name}
                              </p>
                            </div>

                            {/* Favorite Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleFavorite(child.id)}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                                favoriteIds.has(child.id)
                                  ? 'text-amber-500'
                                  : 'text-slate-300 hover:text-slate-400'
                              }`}
                            >
                              <FaStar
                                className={`h-4 w-4 ${
                                  favoriteIds.has(child.id) ? 'fill-current drop-shadow-sm' : ''
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Footer - Fixed bottom with Save and Reset buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 shrink-0 bg-[#F7F9FC] px-4 py-4 shadow-lg sm:px-6">
        <div className="mx-auto flex w-full max-w-md gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-xl border-2 border-red-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50 sm:py-3 sm:text-base"
            disabled={isSaving}
          >
            Đặt lại
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 sm:py-3 sm:text-base"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu lại'}
          </button>
        </div>
      </div>
    </div>
  )
}

