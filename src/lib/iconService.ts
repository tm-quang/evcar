import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { uploadToCloudinary } from './cloudinaryService'
import { compressImageForIcon, isFileSizeAcceptable } from '../utils/imageCompression'
import { queryClient } from './react-query'

export type IconType = 'react-icon' | 'image' | 'svg' | 'svg-url'

export type IconRecord = {
  id: string
  name: string
  label: string
  icon_type: IconType
  react_icon_name: string | null
  react_icon_library: string | null
  image_url: string | null
  group_id: string
  group_label: string
  is_active: boolean
  display_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type IconInsert = {
  name: string
  label: string
  icon_type: IconType
  react_icon_name?: string | null
  react_icon_library?: string | null
  image_url?: string | null
  group_id: string
  group_label: string
  display_order?: number
}

export type IconUpdate = Partial<Omit<IconInsert, 'name'>> & {
  is_active?: boolean
}

export type IconFilters = {
  group_id?: string
  icon_type?: IconType
  is_active?: boolean
}

const TABLE_NAME = 'icons'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Fetch all active icons
export const fetchIcons = async (filters?: IconFilters): Promise<IconRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    // Không throw error, chỉ return empty array để app không crash
    return []
  }

  try {
    // Build query từng bước để tránh lỗi
    const isActiveFilter = filters?.is_active !== undefined ? filters.is_active : true

    // Bắt đầu với select đơn giản
    let query = supabase
      .from(TABLE_NAME)
      .select('*')

    // Thêm filters
    query = query.eq('is_active', isActiveFilter)

    if (filters?.group_id) {
      query = query.eq('group_id', filters.group_id)
    }
    if (filters?.icon_type) {
      query = query.eq('icon_type', filters.icon_type)
    }

    // Thêm ordering
    query = query
      .order('group_id', { ascending: true })
      .order('display_order', { ascending: true })
      .order('label', { ascending: true })

    const { data, error } = await query

    if (error) {
      // Log error nhưng không throw - có thể do RLS policy hoặc table chưa tồn tại
      // App sẽ fallback về hardcoded icons
      if (error.code !== 'PGRST116') { // PGRST116 = not found, không cần log
        console.warn('Cannot fetch icons from database (will use hardcoded icons):', {
          code: error.code,
          message: error.message,
        })
      }
      return []
    }

    return data ?? []
  } catch (err) {
    // Silently fail - app sẽ dùng hardcoded icons
    // Chỉ log nếu không phải là lỗi network thông thường
    if (err instanceof Error && !err.message.includes('fetch')) {
      console.warn('Error fetching icons (will use hardcoded icons):', err)
    }
    return []
  }
}

/**
 * Get icon by name - sử dụng React Query cache để tránh fetch riêng lẻ
 */
export const getIconByName = async (name: string): Promise<IconRecord | null> => {
  // Use ensureQueryData to get from cache or fetch
  const icons = await queryClient.ensureQueryData({
    queryKey: ['icons', { is_active: true }],
    queryFn: () => fetchIcons({ is_active: true }),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  })

  return icons.find(icon => icon.name === name) || null
}

/**
 * Invalidate icon cache (khi có thay đổi icons)
 */
export const invalidateIconCache = async (): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: ['icons'] })
}

// Get icon by ID
export const getIconById = async (id: string): Promise<IconRecord | null> => {
  try {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle()

    // Nếu không tìm thấy hoặc có lỗi, return null thay vì throw
    if (error) {
      // Không log error nếu là "not found" (PGRST116) - đó là trường hợp bình thường
      if (error.code !== 'PGRST116' && !error.message?.includes('not found')) {
        console.warn('Error fetching icon by ID:', error)
      }
      return null
    }

    return data || null
  } catch (error) {
    // Không log error nếu là lỗi thông thường
    if (error instanceof Error && !error.message.includes('not found') && !error.message.includes('PGRST116')) {
      console.warn('Error in getIconById:', error)
    }
    return null
  }
}

// Create icon
export const createIcon = async (payload: IconInsert, imageFile?: File): Promise<IconRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo icon.')
  }

  // Check if icon name already exists
  const existingIcon = await getIconByName(payload.name)
  if (existingIcon) {
    throw new Error(`Icon với tên "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.`)
  }

  // Upload image nếu có
  let imageUrl: string | null = null
  if (imageFile && (payload.icon_type === 'image' || payload.icon_type === 'svg')) {
    // Compress image before upload (except SVG which is already vector/compressed)
    let fileToUpload = imageFile
    if (payload.icon_type === 'image') {
      try {
        // Check initial file size (max 10MB before compression)
        const maxInitialSize = 10 * 1024 * 1024 // 10MB
        if (imageFile.size > maxInitialSize) {
          throw new Error('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
        }

        // Compress image: PNG (96x96px, max 30KB) or JPEG (128x128px, max 10KB)
        // PNG preserves transparency, JPEG has better compression
        const fileName = imageFile.name.toLowerCase()
        const isPng = fileName.endsWith('.png')

        if (isPng) {
          // PNG: 96x96px, max 30KB (to preserve transparency)
          fileToUpload = await compressImageForIcon(imageFile, 96, 96, 30, 0.6, true)

          // Verify compressed size (PNG is larger, allow up to 30KB)
          if (!isFileSizeAcceptable(fileToUpload, 30)) {
            throw new Error('Không thể nén ảnh PNG xuống dưới 30KB. Vui lòng chọn ảnh đơn giản hơn hoặc giảm kích thước.')
          }
        } else {
          // JPEG: 128x128px, max 10KB
          fileToUpload = await compressImageForIcon(imageFile, 128, 128, 10, 0.6, false)

          // Verify compressed size
          if (!isFileSizeAcceptable(fileToUpload, 10)) {
            throw new Error('Không thể nén ảnh xuống dưới 10KB. Vui lòng chọn ảnh khác')
          }
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Không thể nén ảnh')
      }
    }

    const uploadResult = await uploadToCloudinary(fileToUpload, {
      useDefaultIconFolder: true, // Sử dụng VITE_CLOUDINARY_ICON_FOLDER nếu có, nếu không thì dùng 'icons'
      folder: 'icons', // Fallback nếu không có VITE_CLOUDINARY_ICON_FOLDER
    })
    imageUrl = uploadResult.secure_url

    // Update file type based on compressed file
    if (imageFile) {
      const compressedFileName = fileToUpload.name.toLowerCase()
      if (compressedFileName.endsWith('.png')) {
        // Don't update payload.icon_type, it's already set
      }
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      image_url: imageUrl || payload.image_url,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Handle duplicate key error specifically
    if (error.code === '23505' && error.message.includes('icons_name_key')) {
      throw new Error(`Icon với tên "${payload.name}" đã tồn tại. Vui lòng chọn tên khác.`)
    }
    throwIfError(error, 'Không thể tạo icon.')
  }

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon sau khi tạo.')
  }

  await invalidateIconCache()

  return data
}

// Update icon
export const updateIcon = async (
  id: string,
  updates: IconUpdate,
  imageFile?: File
): Promise<IconRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật icon.')
  }

  // Upload image mới nếu có
  if (imageFile && (updates.icon_type === 'image' || updates.icon_type === 'svg')) {
    // Compress image before upload (except SVG)
    let fileToUpload = imageFile
    if (updates.icon_type === 'image') {
      try {
        // Check initial file size (max 10MB before compression)
        const maxInitialSize = 10 * 1024 * 1024 // 10MB
        if (imageFile.size > maxInitialSize) {
          throw new Error('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
        }

        // Compress image: PNG (96x96px, max 30KB) or JPEG (128x128px, max 10KB)
        // PNG preserves transparency, JPEG has better compression
        const fileName = imageFile.name.toLowerCase()
        const isPng = fileName.endsWith('.png')

        if (isPng) {
          // PNG: 96x96px, max 30KB (to preserve transparency)
          fileToUpload = await compressImageForIcon(imageFile, 96, 96, 30, 0.6, true)

          // Verify compressed size (PNG is larger, allow up to 30KB)
          if (!isFileSizeAcceptable(fileToUpload, 30)) {
            throw new Error('Không thể nén ảnh PNG xuống dưới 30KB. Vui lòng chọn ảnh đơn giản hơn hoặc giảm kích thước.')
          }
        } else {
          // JPEG: 128x128px, max 10KB
          fileToUpload = await compressImageForIcon(imageFile, 128, 128, 10, 0.6, false)

          // Verify compressed size
          if (!isFileSizeAcceptable(fileToUpload, 10)) {
            throw new Error('Không thể nén ảnh xuống dưới 10KB. Vui lòng chọn ảnh khác')
          }
        }
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Không thể nén ảnh')
      }
    }

    const uploadResult = await uploadToCloudinary(fileToUpload, {
      useDefaultIconFolder: true, // Sử dụng VITE_CLOUDINARY_ICON_FOLDER nếu có, nếu không thì dùng 'icons'
      folder: 'icons', // Fallback nếu không có VITE_CLOUDINARY_ICON_FOLDER
    })
    updates.image_url = uploadResult.secure_url
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật icon.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu icon sau khi cập nhật.')
  }

  await invalidateIconCache()

  return data
}

// Delete icon (soft delete - set is_active = false)
export const deleteIcon = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon.')
  }

  // Soft delete
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ is_active: false })
    .eq('id', id)

  throwIfError(error, 'Không thể xóa icon.')

  await invalidateIconCache()
}

// Hard delete icon (permanent)
export const hardDeleteIcon = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa icon.')
  }

  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  throwIfError(error, 'Không thể xóa icon vĩnh viễn.')

  await invalidateIconCache()
}

// Get icon groups
export const getIconGroups = async (): Promise<Array<{ id: string; label: string }>> => {
  const icons = await fetchIcons({ is_active: true })
  const groups = new Map<string, string>()

  icons.forEach((icon) => {
    if (!groups.has(icon.group_id)) {
      groups.set(icon.group_id, icon.group_label)
    }
  })

  return Array.from(groups.entries()).map(([id, label]) => ({ id, label }))
}

