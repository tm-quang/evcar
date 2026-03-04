/**
 * Icon Loader Utility
 * Load icons from database hoặc fallback về hardcoded icons
 */

import React from 'react'
import type { IconType } from 'react-icons'
import { getIconByName, fetchIcons, type IconRecord } from '../lib/iconService'
import { CATEGORY_ICON_MAP } from '../constants/categoryIcons'

// Lazy load icon libraries to avoid bundling all icons at once
const getIconLibrary = async (library: string): Promise<Record<string, IconType> | null> => {
  try {
    let module
    switch (library) {
      case 'fa':
        module = await import('react-icons/fa')
        break
      case 'bs':
        module = await import('react-icons/bs')
        break
      case 'lu':
        module = await import('react-icons/lu')
        break
      case 'hi2':
        module = await import('react-icons/hi2')
        break
      case 'md':
        module = await import('react-icons/md')
        break
      default:
        return null
    }
    // Remove default export and return only icon components
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { default: _unused, ...icons } = module
    return icons as unknown as Record<string, IconType>
  } catch {
    return null
  }
}

// Cache for loaded libraries
const libraryCache: Record<string, Record<string, IconType>> = {}

// Get icon library with caching
export const getCachedIconLibrary = async (library: string): Promise<Record<string, IconType> | null> => {
  if (libraryCache[library]) {
    return libraryCache[library]
  }

  const lib = await getIconLibrary(library)
  if (lib) {
    libraryCache[library] = lib
  }
  return lib
}

/**
 * Get icon component from database hoặc fallback
 */
export const getIconComponent = async (iconId: string): Promise<IconType | null> => {
  try {
    // Try to get from database first
    const icon = await getIconByName(iconId)

    if (icon) {
      if (icon.icon_type === 'react-icon' && icon.react_icon_name && icon.react_icon_library) {
        const library = await getCachedIconLibrary(icon.react_icon_library)
        if (library && library[icon.react_icon_name]) {
          return library[icon.react_icon_name]
        }
      }
      // If image type, return null (will be handled by image rendering)
      return null
    }
  } catch {
    // Fallback to hardcoded icons
  }

  // Fallback to hardcoded CATEGORY_ICON_MAP
  const hardcodedIcon = CATEGORY_ICON_MAP[iconId]
  return hardcodedIcon?.icon || null
}

/**
 * Get icon as ReactNode từ category (ưu tiên icon_url nếu có)
 * @param iconId - ID của icon
 * @param iconUrl - URL ảnh trực tiếp từ category (optional, ưu tiên nếu có)
 * @param className - CSS class cho ảnh (optional, default: 'h-6 w-6 object-contain')
 */
export const getIconNodeFromCategory = async (
  iconId: string,
  iconUrl?: string | null,
  className?: string
): Promise<React.ReactNode> => {
  // Nếu có icon_url trực tiếp, sử dụng nó
  if (iconUrl) {
    console.log('getIconNodeFromCategory: Using iconUrl:', iconUrl)
    // Sử dụng className được truyền vào hoặc default (fill vừa vặn container)
    const imgClassName = className || 'h-full w-full object-cover rounded-full'
    return React.createElement('img', {
      src: iconUrl,
      alt: '',
      className: imgClassName,
      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
        console.warn(`Failed to load category icon_url: ${iconUrl} for iconId: ${iconId}`)
        e.currentTarget.style.display = 'none'
      },
      onLoad: () => {
        console.log('Successfully loaded icon from iconUrl:', iconUrl)
      },
    })
  }

  // Nếu không có icon_url, fallback về getIconNode
  console.log('getIconNodeFromCategory: No iconUrl, falling back to getIconNode for iconId:', iconId)
  return getIconNode(iconId, className)
}

/**
 * Get icon as ReactNode - chỉ sử dụng image_url từ icons_images
 * @param iconId - ID của icon (UUID từ bảng icons)
 * @param className - CSS class cho ảnh (optional, default: 'h-6 w-6 object-contain')
 */
export const getIconNode = async (iconId: string, className?: string): Promise<React.ReactNode> => {
  // Sử dụng className được truyền vào hoặc default (fill vừa vặn container)
  const imgClassName = className || 'h-full w-full object-cover rounded-full'

  // Load từ database - chỉ lấy icons có icon_type = 'image' hoặc 'svg'
  try {
    // iconId có thể là UUID (từ bảng icons) hoặc name (legacy)
    // Thử getIconById trước (UUID), nếu không có thì thử getIconByName (name)
    let icon: IconRecord | null = null

    // Kiểm tra xem iconId có phải là UUID không (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(iconId)

    if (isUUID) {
      // Lấy từ bảng icons bằng id
      const { getIconById } = await import('../lib/iconService')
      icon = await getIconById(iconId)
    } else {
      // Fallback: thử getIconByName (legacy support)
      icon = await getIconByName(iconId)
    }

    if (icon) {
      // Chỉ sử dụng icons có icon_type = 'image' hoặc 'svg'
      if ((icon.icon_type === 'svg' || icon.icon_type === 'image') && icon.image_url) {
        return React.createElement('img', {
          src: icon.image_url,
          alt: icon.label,
          className: imgClassName,
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            // Fallback nếu image không load được
            console.warn(`Failed to load image icon: ${icon.image_url} for iconId: ${iconId}`)
            e.currentTarget.style.display = 'none'
          },
        })
      }
    }
  } catch (error) {
    // Chỉ log error nếu không phải là lỗi "not found" (đó là trường hợp bình thường)
    if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
      console.error('Error loading icon from database:', iconId, error)
    }
  }

  // Return null để component tự xử lý fallback
  return null
}

/**
 * Load all icons grouped by group_id
 */
export const loadIconsGrouped = async (): Promise<Record<string, IconRecord[]>> => {
  try {
    const icons = await fetchIcons({ is_active: true })
    const grouped: Record<string, IconRecord[]> = {}

    icons.forEach((icon) => {
      if (!grouped[icon.group_id]) {
        grouped[icon.group_id] = []
      }
      grouped[icon.group_id].push(icon)
    })

    // Sắp xếp icons trong mỗi group theo display_order
    Object.keys(grouped).forEach((groupId) => {
      grouped[groupId].sort((a, b) =>
        (a.display_order || 0) - (b.display_order || 0)
      )
    })

    return grouped
  } catch {
    // Fallback to empty
    return {}
  }
}

/**
 * Get available react-icon libraries
 */
export const getAvailableIconLibraries = async () => {
  const [fa, bs, lu, hi2, md] = await Promise.all([
    getCachedIconLibrary('fa'),
    getCachedIconLibrary('bs'),
    getCachedIconLibrary('lu'),
    getCachedIconLibrary('hi2'),
    getCachedIconLibrary('md'),
  ])

  return [
    { value: 'fa', label: 'Font Awesome 5 (Fa)', icons: fa ? Object.keys(fa).slice(0, 50) : [] },
    { value: 'bs', label: 'Bootstrap Icons (Bs)', icons: bs ? Object.keys(bs).slice(0, 50) : [] },
    { value: 'lu', label: 'Lucide Icons (Lu)', icons: lu ? Object.keys(lu).slice(0, 50) : [] },
    { value: 'hi2', label: 'Heroicons 2 (Hi2)', icons: hi2 ? Object.keys(hi2).slice(0, 50) : [] },
    { value: 'md', label: 'Material Design (Md)', icons: md ? Object.keys(md).slice(0, 50) : [] },
  ]
}

/**
 * Search react-icons by name
 */
export const searchReactIcons = async (library: string, searchTerm: string): Promise<string[]> => {
  const libraryMap = await getCachedIconLibrary(library)
  if (!libraryMap) return []

  const searchLower = searchTerm.toLowerCase()
  return Object.keys(libraryMap)
    .filter((name) => name.toLowerCase().includes(searchLower))
    .slice(0, 100) // Limit results
}

