import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    FaPlus,
    FaSearch,
    FaArrowLeft,
    FaFolder,
    FaChevronRight,
    FaTrash,
} from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { CategoryListSkeleton } from '../components/skeletons'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import {
    CATEGORY_ICON_GROUPS,
    CATEGORY_ICON_MAP,
} from '../constants/categoryIcons'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { fetchIcons, type IconRecord } from '../lib/iconService'
import { IconPicker } from '../components/categories/IconPicker'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { SearchableSelect } from '../components/ui/SearchableSelect'
import {
    createCategory,
    deleteCategory as deleteCategoryFromDb,
    fetchCategories,
    fetchCategoriesHierarchical,
    updateCategory,
    initializeDefaultCategories,
    updateCategoriesIconUrlFromDefault,
    type CategoryRecord,
    type CategoryType,
    type CategoryWithChildren,
} from '../lib/categoryService'

type Category = {
    id: string
    name: string
    type: CategoryType
    iconId: string
    iconUrl?: string | null
    parentId?: string | null
    isDefault?: boolean
    children?: Category[]
}

type CategoryFormState = {
    name: string
    type: CategoryType
    iconId: string
    iconUrl?: string | null
    parentId?: string | null
}

const mapRecordToCategory = (record: CategoryRecord, children?: CategoryRecord[]): Category => ({
    id: record.id,
    name: record.name,
    type: record.type,
    iconId: record.icon_id,
    iconUrl: record.icon_url,
    parentId: record.parent_id,
    isDefault: record.is_default,
    children: Array.isArray(children) ? children.map(c => mapRecordToCategory(c)) : undefined,
})

const sortCategories = (items: Category[]) =>
    [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }))

export const CategoriesPage = () => {
    // const navigate = useNavigate()
    const { success, error: showError } = useNotification()
    const { showDialog } = useDialog()
    const [categories, setCategories] = useState<Category[]>([])
    const [hierarchicalCategories, setHierarchicalCategories] = useState<CategoryWithChildren[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
    const [formState, setFormState] = useState<CategoryFormState>({
        name: '',
        type: 'Chi tiêu',
        iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
        parentId: null,
    })
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [dbIcons, setDbIcons] = useState<IconRecord[]>([])

    const [searchParams, setSearchParams] = useSearchParams()

    // Lấy hạng mục phân cấp theo tab hiện tại
    const currentHierarchicalCategories = useMemo(() => {
        return hierarchicalCategories.filter(cat =>
            cat.type === (activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập')
        )
    }, [hierarchicalCategories, activeTab])

    // Filter categories by search term
    const filteredHierarchicalCategories = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        if (!normalizedSearch) {
            return currentHierarchicalCategories
        }

        return currentHierarchicalCategories
            .map(parent => {
                // Check if parent matches
                const parentMatches = parent.name.toLowerCase().includes(normalizedSearch)

                // Filter children
                const childrenArray = Array.isArray(parent.children) ? parent.children : []
                const filteredChildren = childrenArray.filter(child =>
                    child.name.toLowerCase().includes(normalizedSearch)
                )

                // If parent matches or has matching children, include it
                if (parentMatches || filteredChildren.length > 0) {
                    const result: CategoryWithChildren = {
                        ...parent,
                        children: parentMatches ? childrenArray : filteredChildren
                    }
                    return result
                }
                return null
            })
            .filter((cat): cat is CategoryWithChildren => cat !== null && cat !== undefined)
    }, [currentHierarchicalCategories, searchTerm])


    // Lấy tất cả hạng mục cha để chọn làm parent
    const parentCategoriesForForm = useMemo(() => {
        const allParents = categories.filter(cat => !cat.parentId && cat.type === formState.type)
        return allParents.filter(cat => !editingId || cat.id !== editingId) // Loại bỏ chính nó khi edit
    }, [categories, formState.type, editingId])

    const openCreateForm = useCallback((parentId?: string | null) => {
        setEditingId(null)
        // Tự động set type dựa trên tab hiện tại
        const categoryType: CategoryType = activeTab === 'expense' ? 'Chi tiêu' : 'Thu nhập'
        setFormState({
            name: '',
            type: categoryType,
            iconId: CATEGORY_ICON_GROUPS[0]?.icons[0]?.id ?? 'other',
            iconUrl: null,
            parentId: parentId ?? null,
        })
        setFormError(null)
        setIsFormOpen(true)
    }, [activeTab])

    // Lock body scroll when form modal is open
    useEffect(() => {
        if (isFormOpen || isIconPickerOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }
    }, [isFormOpen, isIconPickerOpen])

    useEffect(() => {
        if (searchParams.get('mode') === 'create') {
            startTransition(() => {
                openCreateForm()
                const next = new URLSearchParams(searchParams)
                next.delete('mode')
                setSearchParams(next, { replace: true })
            })
        }
    }, [openCreateForm, searchParams, setSearchParams])

    // Helper function để reload categories
    const reloadCategories = useCallback(async () => {
        setIsLoading(true)
        try {
            // Invalidate cache trước khi fetch
            const { queryClient } = await import('../lib/react-query')
            await queryClient.invalidateQueries({ queryKey: ['categories'] })

            // Đợi một chút để cache được clear
            await new Promise(resolve => setTimeout(resolve, 150))

            const [flatData, hierarchicalData] = await Promise.all([
                fetchCategories(),
                fetchCategoriesHierarchical(),
            ])

            setCategories(sortCategories(flatData.map(record => mapRecordToCategory(record))))
            setHierarchicalCategories(hierarchicalData.map(cat => ({
                ...cat,
                children: Array.isArray(cat.children) ? cat.children : [],
            })))
        } catch (error) {
            console.error('Error reloading categories:', error)
            showError('Không thể tải danh sách hạng mục. Vui lòng thử lại.')
        } finally {
            setIsLoading(false)
        }
    }, [showError])

    useEffect(() => {
        const loadCategories = async () => {
            setIsLoading(true)
            try {
                // Load categories từ cache/database (cache sẽ được dùng tự động)
                // cacheFirstWithRefresh sẽ trả về cache ngay nếu có, fetch trong background nếu stale
                const [flatData, hierarchicalData] = await Promise.all([
                    fetchCategories(),
                    fetchCategoriesHierarchical(),
                ])

                // Chỉ sync default categories nếu user CHƯA CÓ categories nào cả (lần đầu tiên)
                // Không sync lại nếu user đã có categories (kể cả khi xóa một số)
                if (flatData.length === 0) {
                    // User chưa có categories nào, sync từ default
                    initializeDefaultCategories().catch((initError) => {
                        // Không báo lỗi nếu đã có hạng mục mặc định
                        console.log('Default categories check:', initError)
                    })

                    // Reload lại sau khi sync
                    const [reloadedFlat, reloadedHierarchical] = await Promise.all([
                        fetchCategories(),
                        fetchCategoriesHierarchical(),
                    ])

                    setCategories(sortCategories(reloadedFlat.map(record => mapRecordToCategory(record))))
                    setHierarchicalCategories(reloadedHierarchical.map(cat => ({
                        ...cat,
                        children: Array.isArray(cat.children) ? cat.children : [],
                    })))
                } else {
                    // User đã có categories, update icon_url nếu chưa có
                    // Chạy async, không block UI, sau đó reload categories
                    updateCategoriesIconUrlFromDefault()
                        .then(async () => {
                            // Sau khi update xong, reload categories để lấy icon_url mới
                            const [reloadedFlat, reloadedHierarchical] = await Promise.all([
                                fetchCategories(),
                                fetchCategoriesHierarchical(),
                            ])

                            setCategories(sortCategories(reloadedFlat.map(record => mapRecordToCategory(record))))
                            setHierarchicalCategories(reloadedHierarchical.map(cat => ({
                                ...cat,
                                children: Array.isArray(cat.children) ? cat.children : [],
                            })))
                        })
                        .catch((error) => {
                            console.log('Update icon_url check:', error)
                        })

                    // Hiển thị categories hiện tại ngay lập tức (không đợi update)
                    setCategories(sortCategories(flatData.map(record => mapRecordToCategory(record))))
                    setHierarchicalCategories(hierarchicalData.map(cat => ({
                        ...cat,
                        children: Array.isArray(cat.children) ? cat.children : [],
                    })))
                }

                // Mặc định tất cả categories đều thu gọn
                setExpandedParents(new Set())

                setLoadError(null)
            } catch (error) {
                console.error('Không thể tải hạng mục:', error)
                setLoadError(
                    error instanceof Error
                        ? `Không thể tải hạng mục: ${error.message}`
                        : 'Không thể tải hạng mục. Vui lòng thử lại sau.'
                )
            } finally {
                setIsLoading(false)
            }
        }

        const loadIcons = async () => {
            try {
                // Chỉ load icons từ database để check icon exists trong form validation
                // Nếu fail, sẽ fallback về hardcoded icons (không ảnh hưởng đến app)
                const icons = await fetchIcons({ is_active: true })
                setDbIcons(icons)
            } catch {
                // Silently fail - app sẽ dùng hardcoded icons từ CATEGORY_ICON_MAP
                // Không cần log vì fetchIcons đã handle error và return empty array
                setDbIcons([])
            }
        }

        void loadCategories()
        void loadIcons()
    }, [])

    const openEditForm = (category: Category) => {
        setEditingId(category.id)
        setFormState({
            name: category.name,
            type: category.type,
            iconId: category.iconId,
            iconUrl: category.iconUrl,
            parentId: category.parentId ?? null,
        })
        setFormError(null)
        setIsFormOpen(true)
    }

    const toggleParentExpanded = (parentId: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev)
            if (next.has(parentId)) {
                // Đóng category hiện tại
                next.delete(parentId)
            } else {
                // Mở category mới, tự động đóng category khác (chỉ mở 1 category tại một thời điểm)
                next.clear()
                next.add(parentId)
            }
            return next
        })
    }

    // Đóng tất cả categories khi click ra ngoài
    const handleClickOutside = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        // Nếu click vào category item hoặc button, không đóng
        if (target.closest('[data-category-item]') || target.closest('button')) {
            return
        }
        setExpandedParents(new Set())
    }

    const closeForm = () => {
        setIsFormOpen(false)
        setFormError(null)
    }

    const handleIconSelect = (iconId: string) => {
        // Tìm icon trong dbIcons để lấy iconUrl nếu có
        const selectedIcon = dbIcons.find(icon => icon.id === iconId)
        const iconUrl = selectedIcon?.image_url || null

        setFormState((prev) => ({
            ...prev,
            iconId,
            iconUrl,
        }))
    }

    // Get icons used in current category type for prioritization
    const usedIconIds = useMemo(() => {
        return new Set(
            categories
                .filter(cat => cat.type === formState.type)
                .map(cat => cat.iconId)
        )
    }, [categories, formState.type])

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const trimmedName = formState.name.trim()

        if (!trimmedName) {
            setFormError('Vui lòng nhập tên hạng mục.')
            return
        }

        // Check if icon exists in hardcoded map or database
        // Nếu không có trong cả hai, vẫn cho phép submit (sẽ fallback về chữ cái đầu khi hiển thị)
        // Nhưng cảnh báo user nếu icon không hợp lệ
        const iconExists = !!CATEGORY_ICON_MAP[formState.iconId] || dbIcons.some(icon => icon.name === formState.iconId)
        if (!iconExists) {
            // Cảnh báo nhưng không block - icon sẽ fallback về chữ cái đầu khi hiển thị
            console.warn(`Icon "${formState.iconId}" not found in hardcoded map or database. Will use fallback display.`)
            // Vẫn cho phép submit - app sẽ tự động fallback
        }

        setFormError(null)
        setIsSubmitting(true)

        try {
            if (editingId) {
                await updateCategory(editingId, {
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                    icon_url: formState.iconUrl,
                    parent_id: formState.parentId,
                })
                success('Đã cập nhật hạng mục thành công!')
            } else {
                await createCategory({
                    name: trimmedName,
                    type: formState.type,
                    icon_id: formState.iconId,
                    parent_id: formState.parentId,
                })
                success('Đã tạo hạng mục mới thành công!')
            }

            // Reload categories để cập nhật
            closeForm()
            // Reload sau khi đóng form để UI mượt hơn
            await reloadCategories()
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Đã xảy ra lỗi khi lưu hạng mục. Vui lòng thử lại sau.'
            setFormError(message)
            showError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar
                variant="page"
                title="Hạng mục - Thu - Chi"
                onReload={reloadCategories}
                isReloading={isLoading}
            />
            <main className="flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
                    {/* Tab Navigation */}
                    <div className="flex gap-2 rounded-2xl bg-white p-1.5 shadow-lg border border-slate-100 sm:gap-2.5 sm:p-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('expense')}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-5 sm:py-3 ${activeTab === 'expense'
                                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Khoản chi
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('income')}
                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-5 sm:py-3 ${activeTab === 'income'
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/30'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Khoản thu
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm theo tên hạng mục"
                            className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-lg border border-slate-100 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 sm:h-11"
                        />
                    </div>

                    {/* Category List */}
                    <section
                        className="rounded-2xl bg-white border border-slate-100 shadow-lg overflow-hidden"
                        onClick={handleClickOutside}
                    >
                        {loadError && (
                            <div className="m-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                                {loadError}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="py-2 rounded-2xl mx-4 bg-white">
                                <CategoryListSkeleton count={6} />
                            </div>
                        ) : filteredHierarchicalCategories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                                <div className="mb-4 rounded-full bg-slate-100 p-4">
                                    <FaFolder className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-base font-semibold text-slate-700 sm:text-lg">
                                    Chưa có hạng mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
                                </p>
                                <p className="mt-1.5 text-sm text-slate-500">
                                    Hãy tạo hạng mục mới để bắt đầu quản lý
                                </p>
                            </div>
                        ) : (
                            <div className="py-2 rounded-2xl mx-4 bg-white">
                                {filteredHierarchicalCategories.map((parentCategory, index) => {
                                    const isExpanded = expandedParents.has(parentCategory.id)
                                    const childrenArray = Array.isArray(parentCategory.children) ? parentCategory.children : []
                                    const hasChildren = childrenArray.length > 0

                                    return (
                                        <div key={parentCategory.id}>
                                            {/* Divider */}
                                            {index > 0 && (
                                                <div className="mx-4 border-t border-slate-200" />
                                            )}
                                            <div className="px-4 py-1">
                                                {/* Parent Category */}
                                                <div
                                                    className="group flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                                                    onClick={() => openEditForm({
                                                        id: parentCategory.id,
                                                        name: parentCategory.name,
                                                        type: parentCategory.type,
                                                        iconId: parentCategory.icon_id,
                                                        iconUrl: parentCategory.icon_url,
                                                        parentId: parentCategory.parent_id,
                                                        isDefault: parentCategory.is_default,
                                                    })}
                                                >
                                                    {/* Expand/Collapse Button */}
                                                    {hasChildren ? (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleParentExpanded(parentCategory.id)
                                                            }}
                                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${isExpanded
                                                                ? 'bg-sky-200 text-sky-600'
                                                                : 'bg-slate-200 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                                                                }`}
                                                        >
                                                            <FaChevronRight
                                                                className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                                                                    }`}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="w-7" />
                                                    )}

                                                    {/* Icon */}
                                                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition-all">
                                                        <CategoryIcon
                                                            iconId={parentCategory.icon_id}
                                                            iconUrl={parentCategory.icon_url}
                                                            className="h-14 w-14"
                                                            fallback={
                                                                <span className="text-3xl font-semibold text-slate-400">
                                                                    {parentCategory.name[0]?.toUpperCase() || '?'}
                                                                </span>
                                                            }
                                                        />
                                                    </div>

                                                    {/* Name */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate text-base font-semibold text-slate-900">
                                                            {parentCategory.name}
                                                        </p>
                                                        {hasChildren && childrenArray.length > 0 && (
                                                            <p className="text-xs text-slate-500">
                                                                {childrenArray.length} {childrenArray.length === 1 ? 'hạng mục con' : 'hạng mục con'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Children Categories - Only show if expanded */}
                                                {hasChildren && isExpanded && childrenArray.length > 0 && (
                                                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-1">
                                                        {childrenArray.map((child, childIndex) => (
                                                            <div
                                                                key={child.id}
                                                                className="group flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-slate-50 active:bg-slate-100"
                                                                onClick={() => openEditForm({
                                                                    id: child.id,
                                                                    name: child.name,
                                                                    type: child.type,
                                                                    iconId: child.icon_id,
                                                                    iconUrl: child.icon_url,
                                                                    parentId: child.parent_id,
                                                                    isDefault: child.is_default,
                                                                })}
                                                                style={{ animationDelay: `${childIndex * 30}ms` }}
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
                                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                                        {child.name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Floating Action Button for Add Category */}
            <button
                type="button"
                onClick={() => openCreateForm()}
                className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/40 transition-all hover:scale-110 hover:shadow-xl hover:shadow-sky-500/50 active:scale-95 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
                aria-label="Thêm hạng mục mới"
            >
                <FaPlus className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>

            {/* Create/Edit Form Modal - Full Screen */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 bg-[#F7F9FC]">
                    {/* Header - Giống HeaderBar */}
                    <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
                        <div className="relative px-1 py-1">
                            <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100"
                                    aria-label="Đóng"
                                >
                                    <FaArrowLeft className="h-5 w-5" />
                                </button>
                                <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                                    {editingId ? 'Cập nhật hạng mục' : 'Thêm hạng mục mới'}
                                </p>
                                {editingId ? (
                                    <button
                                        type="button"
                                        onClick={async (e) => {
                                            e.preventDefault()
                                            e.stopPropagation()

                                            const editingCategory = categories.find(c => c.id === editingId)
                                            if (!editingCategory) return

                                            await showDialog({
                                                message: `Bạn có chắc muốn xóa hạng mục "${editingCategory.name}"? Tất cả giao dịch liên quan sẽ không còn hạng mục.`,
                                                type: 'warning',
                                                title: 'Xóa hạng mục',
                                                confirmText: 'Xóa',
                                                cancelText: 'Hủy',
                                                onConfirm: async () => {
                                                    try {
                                                        setIsDeleting(true)
                                                        await deleteCategoryFromDb(editingId)

                                                        success('Đã xóa hạng mục thành công!')
                                                        closeForm()
                                                        // Reload sau khi đóng form
                                                        await reloadCategories()
                                                    } catch (error) {
                                                        setIsLoading(false)
                                                        const message =
                                                            error instanceof Error
                                                                ? `Không thể xóa hạng mục: ${error.message}`
                                                                : 'Không thể xóa hạng mục. Vui lòng thử lại sau.'
                                                        setFormError(message)
                                                        showError(message)
                                                    } finally {
                                                        setIsDeleting(false)
                                                    }
                                                },
                                            })
                                        }}
                                        disabled={isSubmitting || isDeleting}
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 text-rose-600 transition-all hover:bg-rose-50 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                                        aria-label="Xóa hạng mục"
                                    >
                                        <FaTrash className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <div className="flex h-11 w-11 items-center justify-center text-slate-500">
                                        {/* Empty space để cân bằng layout */}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Form Content */}
                    <form id="category-form" className="flex h-full flex-col" onSubmit={handleSubmit}>
                        <div className={`flex-1 overflow-y-auto overscroll-contain bg-[#F7F9FC] p-4 space-y-4 ${editingId ? 'pb-24' : 'pb-24'}`}>
                            {/* Category Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Tên hạng mục <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    value={formState.name}
                                    onChange={(event) =>
                                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                                    }
                                    placeholder="Ví dụ: Ăn sáng, Tiền điện..."
                                    className="h-12 w-full rounded-xl border-0 bg-slate-50 px-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                                />
                            </div>

                            {/* Category Type */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Loại hạng mục <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormState((prev) => ({ ...prev, type: 'Chi tiêu' }))}
                                        className={`group relative h-14 rounded-2xl border-2 px-4 text-sm font-bold transition-all active:scale-[0.98] ${formState.type === 'Chi tiêu'
                                            ? 'border-rose-500 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/20'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="relative z-10">Chi tiêu</span>
                                        {formState.type === 'Chi tiêu' && (
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormState((prev) => ({ ...prev, type: 'Thu nhập' }))}
                                        className={`group relative h-14 rounded-2xl border-2 px-4 text-sm font-bold transition-all active:scale-[0.98] ${formState.type === 'Thu nhập'
                                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="relative z-10">Thu nhập</span>
                                        {formState.type === 'Thu nhập' && (
                                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Parent Category Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Hạng mục cha (tùy chọn)
                                </label>
                                <SearchableSelect
                                    options={[
                                        { value: '', label: 'Không có (Hạng mục cha)' },
                                        ...parentCategoriesForForm.map((parent) => ({
                                            value: parent.id,
                                            label: parent.name,
                                            icon: (
                                                <CategoryIcon
                                                    iconId={parent.iconId}
                                                    iconUrl={parent.iconUrl}
                                                    className="h-5 w-5"
                                                />
                                            ),
                                        })),
                                    ]}
                                    value={formState.parentId || ''}
                                    onChange={(value) =>
                                        setFormState((prev) => ({
                                            ...prev,
                                            parentId: value || null
                                        }))
                                    }
                                    placeholder="Chọn hạng mục cha"
                                    searchPlaceholder="Tìm kiếm hạng mục cha..."
                                    emptyMessage="Chưa có hạng mục cha"
                                />
                                <p className="text-xs text-slate-500">
                                    {formState.parentId
                                        ? 'Hạng mục này sẽ là mục con của hạng mục cha đã chọn'
                                        : 'Để trống để tạo hạng mục cha (có thể thêm mục con sau)'}
                                </p>
                            </div>

                            {/* Icon Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Biểu tượng hiển thị <span className="text-rose-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsIconPickerOpen(true)}
                                    className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 transition-all hover:border-sky-400 hover:from-sky-50 hover:to-blue-50/50 hover:shadow-lg active:scale-[0.98]"
                                >
                                    {/* Icon Preview */}
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden">
                                        <CategoryIcon
                                            iconId={formState.iconId}
                                            iconUrl={formState.iconUrl}
                                            className="h-16 w-16"
                                            fallback={
                                                <span className="text-lg font-semibold text-slate-400">
                                                    {formState.iconId?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            }
                                        />
                                    </div>

                                    {/* Icon Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-semibold text-slate-900">
                                            {CATEGORY_ICON_MAP[formState.iconId]?.label ?? dbIcons.find(i => i.name === formState.iconId)?.label ?? 'Chưa chọn biểu tượng'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Nhấn để chọn biểu tượng
                                        </p>
                                    </div>

                                    {/* Change Button */}
                                    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700 transition-all group-hover:bg-sky-200 group-hover:text-sky-800">
                                        <span>Thay đổi</span>
                                        <FaChevronRight className="h-3 w-3" />
                                    </div>
                                </button>
                            </div>

                            {/* Error Message */}
                            {formError && (
                                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">
                                    {formError}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons - Fixed at bottom */}
                        <ModalFooterButtons
                            onCancel={closeForm}
                            onConfirm={() => {
                                // Chỉ trigger form submit, không làm gì khác
                                // Form submit sẽ gọi handleSubmit để lưu
                                const form = document.getElementById('category-form') as HTMLFormElement
                                if (form) {
                                    form.requestSubmit()
                                }
                            }}
                            confirmText={isSubmitting
                                ? 'Đang lưu...'
                                : editingId
                                    ? 'Lưu thay đổi'
                                    : 'Thêm hạng mục'}
                            isSubmitting={isSubmitting}
                            disabled={isSubmitting || isDeleting}
                            confirmButtonType="button"
                            fixed={true}
                        />
                    </form>
                </div>
            )}

            {/* Icon Picker Component */}
            <IconPicker
                isOpen={isIconPickerOpen}
                onClose={() => setIsIconPickerOpen(false)}
                onSelect={handleIconSelect}
                selectedIconId={formState.iconId}
                usedIconIds={usedIconIds}
            />

        </div>
    )
}



export default CategoriesPage
