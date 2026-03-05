import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

export type DefaultCategoryType = 'Chi tiêu' | 'Thu nhập'

export type DefaultCategoryRecord = {
  id: string
  name: string
  type: DefaultCategoryType
  icon_id: string
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
  parent_id?: string | null
  display_order: number
  created_at: string
  updated_at?: string | null
}

export type DefaultCategoryWithChildren = DefaultCategoryRecord & {
  children?: DefaultCategoryRecord[]
}

export type DefaultCategoryInsert = {
  name: string
  type: DefaultCategoryType
  icon_id: string
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
  parent_id?: string | null
  display_order?: number
}

export type DefaultCategoryUpdate = Partial<Omit<DefaultCategoryInsert, 'name'>> & {
  name?: string
  icon_id?: string
  icon_url?: string | null
  parent_id?: string | null
  display_order?: number
}

const TABLE_NAME = 'default_categories'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

/**
 * Lấy tất cả default categories (flat list)
 */
export const fetchDefaultCategories = async (): Promise<DefaultCategoryRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem hạng mục mặc định.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('type', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải hạng mục mặc định.')

  return data ?? []
}

/**
 * Lấy default categories theo cấu trúc phân cấp (cha-con)
 */
export const fetchDefaultCategoriesHierarchical = async (): Promise<DefaultCategoryWithChildren[]> => {
  const allCategories = await fetchDefaultCategories()

  // Tách hạng mục cha và con
  const parentCategories = allCategories.filter(cat => !cat.parent_id)
  const childCategories = allCategories.filter(cat => cat.parent_id)

  // Nhóm con theo parent_id
  const childrenByParent = new Map<string, DefaultCategoryRecord[]>()
  childCategories.forEach(child => {
    const parentId = child.parent_id!
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, [])
    }
    childrenByParent.get(parentId)!.push(child)
  })

  // Tạo cấu trúc phân cấp
  return parentCategories.map(parent => ({
    ...parent,
    children: (childrenByParent.get(parent.id) || []).sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order
      }
      return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
    })
  })).sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order
    }
    return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
  })
}

/**
 * Tạo default category mới
 */
export const createDefaultCategory = async (payload: DefaultCategoryInsert): Promise<DefaultCategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo hạng mục mặc định.')
  }

  // Kiểm tra nếu có parent_id, đảm bảo parent tồn tại
  if (payload.parent_id) {
    const { data: parent } = await supabase
      .from(TABLE_NAME)
      .select('id, type')
      .eq('id', payload.parent_id)
      .single()

    if (!parent) {
      throw new Error('Hạng mục cha không tồn tại.')
    }

    // Đảm bảo type giống nhau
    if (parent.type !== payload.type) {
      throw new Error('Hạng mục con phải cùng loại với hạng mục cha.')
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...payload,
      display_order: payload.display_order ?? 0,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo hạng mục mặc định.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục mặc định sau khi tạo.')
  }

  await queryClient.invalidateQueries({ queryKey: ['default_categories'] })

  return data
}

/**
 * Cập nhật default category
 */
export const updateDefaultCategory = async (
  id: string,
  updates: DefaultCategoryUpdate
): Promise<DefaultCategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật hạng mục mặc định.')
  }

  // Kiểm tra nếu đang thay đổi parent_id
  if (updates.parent_id !== undefined) {
    if (updates.parent_id === null) {
      // OK, chuyển thành mục cha
    } else {
      // Kiểm tra parent tồn tại
      const { data: parent } = await supabase
        .from(TABLE_NAME)
        .select('id, type')
        .eq('id', updates.parent_id)
        .single()

      if (!parent) {
        throw new Error('Hạng mục cha không tồn tại.')
      }

      // Lấy type hiện tại của category đang cập nhật
      const { data: currentCategory } = await supabase
        .from(TABLE_NAME)
        .select('type')
        .eq('id', id)
        .single()

      if (!currentCategory) {
        throw new Error('Không tìm thấy hạng mục cần cập nhật.')
      }

      const categoryType = updates.type || currentCategory.type

      // Đảm bảo type giống nhau
      if (parent.type !== categoryType) {
        throw new Error('Hạng mục con phải cùng loại với hạng mục cha.')
      }

      // Không cho phép set parent là chính nó
      if (updates.parent_id === id) {
        throw new Error('Không thể đặt hạng mục làm cha của chính nó.')
      }
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật hạng mục mặc định.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục mặc định sau khi cập nhật.')
  }

  await queryClient.invalidateQueries({ queryKey: ['default_categories'] })

  return data
}

/**
 * Xóa default category
 */
export const deleteDefaultCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xoá hạng mục mặc định.')
  }

  // Kiểm tra xem hạng mục có con không
  const { data: children } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('parent_id', id)
    .limit(1)

  if (children && children.length > 0) {
    throw new Error('Không thể xóa hạng mục cha khi còn hạng mục con. Vui lòng xóa hoặc di chuyển các hạng mục con trước.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)

  throwIfError(error, 'Không thể xoá hạng mục mặc định.')

  await queryClient.invalidateQueries({ queryKey: ['default_categories'] })
}
