import React, { useEffect, useState, useRef } from 'react'
import { FaSearch, FaArrowLeft } from 'react-icons/fa'
import { fetchIcons } from '../../lib/iconService'
import { LoadingRing } from '../ui/LoadingRing'

type IconPickerProps = {
    isOpen: boolean
    onClose: () => void
    onSelect: (iconId: string) => void
    selectedIconId?: string
    usedIconIds?: Set<string>
}

type IconItem = {
    id: string
    label: string
    groupId: string
    iconNode: React.ReactNode | null
    isUsed?: boolean
}

export const IconPicker: React.FC<IconPickerProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedIconId,
    usedIconIds = new Set(),
}: IconPickerProps) => {
    const [iconSearchTerm, setIconSearchTerm] = useState('')
    const [allIcons, setAllIcons] = useState<IconItem[]>([])
    const [isLoadingIcons, setIsLoadingIcons] = useState(false)
    const loadingRef = useRef(false)

    // Load all icons when modal opens - chỉ lấy từ icons_images (image hoặc svg)
    useEffect(() => {
        if (!isOpen) {
            // Reset when closing
            setIconSearchTerm('')
            setAllIcons([])
            loadingRef.current = false
            return
        }

        // Tránh load nhiều lần cùng lúc
        if (loadingRef.current) {
            return
        }

        let isCancelled = false
        loadingRef.current = true

        const loadAllIcons = async () => {
            setIsLoadingIcons(true)
            try {
                // Chỉ fetch icons từ database có icon_type = 'image' hoặc 'svg'
                const dbIconsData = await fetchIcons({ is_active: true })

                if (isCancelled) {
                    loadingRef.current = false
                    return
                }

                const imageIcons = dbIconsData.filter(
                    icon => icon.icon_type === 'image' || icon.icon_type === 'svg'
                )

                if (isCancelled) {
                    loadingRef.current = false
                    return
                }

                // Chuyển đổi sang IconItem format
                // Tạo một Set từ usedIconIds để check nhanh hơn và tránh re-render
                const usedIdsSet = usedIconIds instanceof Set ? usedIconIds : new Set(Array.isArray(usedIconIds) ? usedIconIds : [])
                const iconItems: IconItem[] = imageIcons.map((dbIcon) => {
                    let iconNode: React.ReactNode = null
                    if (dbIcon.image_url) {
                        iconNode = (
                            <img
                                src={dbIcon.image_url}
                                alt={dbIcon.label}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                onError={(e) => {
                                    // Hide image if it fails to load
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        )
                    }

                    return {
                        id: dbIcon.id, // Sử dụng id (UUID) thay vì name
                        label: dbIcon.label,
                        groupId: dbIcon.group_id,
                        iconNode,
                        isUsed: usedIdsSet.has(dbIcon.id),
                    }
                })

                if (isCancelled) {
                    loadingRef.current = false
                    return
                }

                // Sort: used icons first, then by group, then by display_order, then by label
                iconItems.sort((a, b) => {
                    if (a.isUsed !== b.isUsed) {
                        return a.isUsed ? -1 : 1
                    }
                    if (a.groupId !== b.groupId) {
                        return a.groupId.localeCompare(b.groupId)
                    }
                    // Tìm display_order từ dbIconsData
                    const iconA = imageIcons.find(i => i.id === a.id)
                    const iconB = imageIcons.find(i => i.id === b.id)
                    const orderA = iconA?.display_order || 0
                    const orderB = iconB?.display_order || 0
                    if (orderA !== orderB) {
                        return orderA - orderB
                    }
                    return a.label.localeCompare(b.label)
                })

                if (!isCancelled) {
                    setAllIcons(iconItems)
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error loading icons:', error)
                    setAllIcons([])
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingIcons(false)
                    loadingRef.current = false
                }
            }
        }

        loadAllIcons()

        // Cleanup function
        return () => {
            isCancelled = true
            loadingRef.current = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]) // Chỉ depend on isOpen, không depend on usedIconIds để tránh infinite loop

    const handleIconSelect = (iconId: string) => {
        onSelect(iconId)
        onClose()
        setIconSearchTerm('')
    }

    const filteredIcons = allIcons.filter((icon) => {
        // Filter by search term
        if (iconSearchTerm) {
            const searchLower = iconSearchTerm.toLowerCase()
            return (
                icon.label.toLowerCase().includes(searchLower) ||
                icon.id.toLowerCase().includes(searchLower)
            )
        }
        return true
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-x-0 bottom-0 sm:inset-0 mt-12 sm:mt-0 z-[60] flex flex-col bg-white rounded-t-3xl sm:rounded-none max-h-[calc(100vh-3rem)] sm:max-h-[100vh] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none bg-[#F7F9FC] sm:bg-[#F7F9FC] safe-area-bottom pointer-events-auto">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

            {/* Header - Giống HeaderBar */}
            <header className="pointer-events-none relative z-10 flex-shrink-0 bg-[#F7F9FC]">
                <div className="relative px-1 py-1">
                    <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between px-4 py-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100"
                            aria-label="Đóng"
                        >
                            <FaArrowLeft className="h-5 w-5" />
                        </button>
                        <p className="flex-1 px-4 text-center text-base font-semibold uppercase tracking-[0.2em] text-slate-800">
                            Chọn biểu tượng
                        </p>
                        <div className="flex h-11 w-11 items-center justify-center text-slate-500">
                            {/* Empty space để cân bằng layout */}
                        </div>
                    </div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={iconSearchTerm}
                        onChange={(e) => setIconSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm biểu tượng..."
                        className="w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Icons Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 min-h-0">
                {isLoadingIcons ? (
                    <div className="flex items-center justify-center py-12">
                        <LoadingRing size="md" />
                    </div>
                ) : filteredIcons.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <span className="text-sm text-slate-500">
                            Không tìm thấy biểu tượng
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                        {filteredIcons.map((icon) => {
                            const isSelected = selectedIconId === icon.id
                            return (
                                <button
                                    key={icon.id}
                                    type="button"
                                    onClick={() => handleIconSelect(icon.id)}
                                    className={`flex h-16 w-16 items-center justify-center rounded-lg transition-all active:scale-95 ${isSelected
                                            ? 'ring-2 ring-sky-500 ring-offset-1'
                                            : 'hover:opacity-80'
                                        }`}
                                    title={icon.label}
                                >
                                    {icon.iconNode || (
                                        <span className="text-lg text-slate-400">
                                            ?
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

