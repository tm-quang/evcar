import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/defaultCategories'
import { queryClient } from './react-query'

export type CategoryType = 'Chi tiêu' | 'Thu nhập'

export type CategoryRecord = {
  id: string
  name: string
  type: CategoryType
  icon_id: string
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
  user_id: string
  parent_id?: string | null
  is_default?: boolean
  default_category_id?: string | null
  display_order?: number
  created_at: string
  updated_at?: string | null
}

export type CategoryWithChildren = CategoryRecord & {
  children?: CategoryRecord[]
}

export type CategoryInsert = {
  name: string
  type: CategoryType
  icon_id: string
  icon_url?: string | null // URL to PNG/SVG image (optional, for custom icons)
  parent_id?: string | null
  display_order?: number
}

export type CategoryUpdate = Partial<CategoryInsert> & {
  icon_id?: string
  icon_url?: string | null
  parent_id?: string | null
  display_order?: number
  is_default?: boolean
}

const TABLE_NAME = 'categories'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

/**
 * Invalidate cả flat và hierarchical categories cache
 */
const invalidateCategoriesCache = async (): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: ['categories'] })
  await queryClient.invalidateQueries({ queryKey: ['categories_hierarchical'] })
}

export const fetchCategories = async (): Promise<CategoryRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem hạng mục.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  throwIfError(error, 'Không thể tải hạng mục.')

  const categories = data ?? []

  // Populate icon_url từ icons table nếu chưa có
  // Chỉ lấy cho những category có icon_id là UUID và chưa có icon_url
  const categoriesNeedingIconUrl = categories.filter(
    cat => !cat.icon_url && cat.icon_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cat.icon_id)
  )

  if (categoriesNeedingIconUrl.length > 0) {
    // Lấy tất cả icons cần thiết trong một query
    const iconIds = categoriesNeedingIconUrl.map(cat => cat.icon_id)
    const { data: iconsData } = await supabase
      .from('icons')
      .select('id, image_url, icon_type')
      .in('id', iconIds)
      .eq('is_active', true)
      .in('icon_type', ['image', 'svg'])

    if (iconsData) {
      const iconUrlMap = new Map<string, string>()
      iconsData.forEach(icon => {
        if (icon.image_url) {
          iconUrlMap.set(icon.id, icon.image_url)
        }
      })

      // Cập nhật icon_url cho categories
      for (const category of categoriesNeedingIconUrl) {
        const iconUrl = iconUrlMap.get(category.icon_id)
        if (iconUrl) {
          category.icon_url = iconUrl

          // Optionally update in database (async, không block)
          Promise.resolve(
            supabase
              .from(TABLE_NAME)
              .update({ icon_url: iconUrl })
              .eq('id', category.id)
          )
            .then(() => {
              // Silently update, không cần log
            })
            .catch(() => {
              // Ignore errors
            })
        }
      }
    }
  }

  return categories
}

/**
 * Lấy hạng mục được tổ chức theo cấu trúc cha-con
 * @param categoryType - Lọc theo loại hạng mục (Chi tiêu hoặc Thu nhập). Nếu không có, lấy tất cả.
 */
export const fetchCategoriesHierarchical = async (categoryType?: CategoryType): Promise<CategoryWithChildren[]> => {
  const allCategories = await fetchCategories()

  // Filter theo type nếu có
  const filteredCategories = categoryType
    ? allCategories.filter(cat => cat.type === categoryType)
    : allCategories

  // Tách hạng mục cha và con
  const parentCategories = filteredCategories.filter(cat => !cat.parent_id)
  const childCategories = filteredCategories.filter(cat => cat.parent_id)

  // Nhóm con theo parent_id
  const childrenByParent = new Map<string, CategoryRecord[]>()
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
        return (a.display_order || 0) - (b.display_order || 0)
      }
      return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
    })
  })).sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return (a.display_order || 0) - (b.display_order || 0)
    }
    return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })
  })
}

export const createCategory = async (payload: CategoryInsert): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo hạng mục.')
  }

  // Kiểm tra nếu có parent_id, đảm bảo parent tồn tại và thuộc cùng user
  if (payload.parent_id) {
    const { data: parent } = await supabase
      .from(TABLE_NAME)
      .select('id, type')
      .eq('id', payload.parent_id)
      .eq('user_id', user.id)
      .single()

    if (!parent) {
      throw new Error('Hạng mục cha không tồn tại hoặc không thuộc về bạn.')
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
      user_id: user.id,
      is_default: false,
      display_order: payload.display_order ?? 0,
    })
    .select()
    .single()

  throwIfError(error, 'Không thể tạo hạng mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục sau khi tạo.')
  }

  await invalidateCategoriesCache()

  return data
}

export const updateCategory = async (
  id: string,
  updates: CategoryUpdate
): Promise<CategoryRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật hạng mục.')
  }

  // Kiểm tra nếu đang thay đổi parent_id
  if (updates.parent_id !== undefined) {
    // Nếu set parent_id = null, nghĩa là chuyển thành mục cha
    if (updates.parent_id === null) {
      // OK, không cần kiểm tra gì
    } else {
      // Kiểm tra parent tồn tại và thuộc cùng user
      const { data: parent } = await supabase
        .from(TABLE_NAME)
        .select('id, type')
        .eq('id', updates.parent_id)
        .eq('user_id', user.id)
        .single()

      if (!parent) {
        throw new Error('Hạng mục cha không tồn tại hoặc không thuộc về bạn.')
      }

      // Lấy type hiện tại của category đang cập nhật
      const { data: currentCategory } = await supabase
        .from(TABLE_NAME)
        .select('type')
        .eq('id', id)
        .eq('user_id', user.id)
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
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật hạng mục.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu hạng mục sau khi cập nhật.')
  }

  await invalidateCategoriesCache()

  return data
}

/**
 * Di chuyển hạng mục con sang mục cha khác
 */
export const moveCategoryToParent = async (
  categoryId: string,
  newParentId: string | null
): Promise<CategoryRecord> => {
  return updateCategory(categoryId, { parent_id: newParentId })
}

/**
 * Đồng bộ hạng mục từ bảng default_categories cho user mới (chỉ 1 lần duy nhất)
 */
export const syncCategoriesFromDefault = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đồng bộ hạng mục mặc định.')
  }

  // Kiểm tra xem user đã có hạng mục chưa
  const { data: existingCategories } = await supabase
    .from(TABLE_NAME)
    .select('id, name, type, parent_id, is_default')
    .eq('user_id', user.id)

  // QUAN TRỌNG: Chỉ sync khi user CHƯA CÓ categories nào cả
  if (existingCategories && existingCategories.length > 0) {
    return
  }

  // User chưa có categories, tiến hành sync từ default_categories
  // Đọc lại categories một lần nữa để đảm bảo không có race condition
  const { data: doubleCheckCategories } = await supabase
    .from(TABLE_NAME)
    .select('id, name, type, parent_id')
    .eq('user_id', user.id)

  if (doubleCheckCategories && doubleCheckCategories.length > 0) {
    console.log('User đã có categories, bỏ qua sync (có thể do race condition)')
    return
  }

  // Tạo map để check duplicate
  const existingCategoryMap = new Map<string, string>()
  if (doubleCheckCategories) {
    doubleCheckCategories.forEach(cat => {
      const key = `${cat.name}_${cat.type}_${cat.parent_id || 'null'}`
      existingCategoryMap.set(key, cat.id)
    })
  }

  // Đọc từ bảng default_categories (database) - source of truth
  let defaultCategories: Array<{
    id?: string
    name: string
    type: CategoryType
    icon_id: string
    icon_url?: string | null
    parent_id?: string | null
    display_order: number
    children?: Array<{
      name: string
      type: CategoryType
      icon_id: string
      icon_url?: string | null
      display_order: number
    }>
  }> = []

  try {
    // Thử đọc từ database trước
    const { fetchDefaultCategoriesHierarchical } = await import('./defaultCategoryService')
    const dbCategories = await fetchDefaultCategoriesHierarchical()

    if (dbCategories && dbCategories.length > 0) {
      defaultCategories = dbCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null,
        parent_id: cat.parent_id,
        display_order: cat.display_order,
        children: cat.children?.map(child => ({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          display_order: child.display_order,
        }))
      }))
    } else {
      console.warn('Database default_categories trống, sử dụng file hardcode làm fallback')
      const allDefaultCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
      defaultCategories = allDefaultCategories.map(cat => ({
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null,
        parent_id: cat.parent_id,
        display_order: cat.display_order,
        children: cat.children?.map(child => ({
          name: child.name,
          type: child.type,
          icon_id: child.icon_id,
          icon_url: child.icon_url || null,
          display_order: child.display_order,
        }))
      }))
    }
  } catch (error) {
    console.warn('Lỗi khi đọc default_categories từ database, sử dụng file hardcode:', error)
    const allDefaultCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
    defaultCategories = allDefaultCategories.map(cat => ({
      name: cat.name,
      type: cat.type,
      icon_id: cat.icon_id,
      icon_url: cat.icon_url || null,
      parent_id: cat.parent_id,
      display_order: cat.display_order,
      children: cat.children?.map(child => ({
        name: child.name,
        type: child.type,
        icon_id: child.icon_id,
        icon_url: child.icon_url || null,
        display_order: child.display_order,
      }))
    }))
  }

  if (!defaultCategories || defaultCategories.length === 0) {
    throw new Error('Hệ thống chưa có hạng mục mặc định.')
  }

  try {
    const parentCategories = defaultCategories.filter(cat => !cat.parent_id)

    const parentInserts = parentCategories
      .filter(cat => {
        const key = `${cat.name}_${cat.type}_null`
        return !existingCategoryMap.has(key)
      })
      .map(cat => ({
        user_id: user.id,
        name: cat.name,
        type: cat.type,
        icon_id: cat.icon_id,
        icon_url: cat.icon_url || null,
        parent_id: null,
        is_default: true,
        display_order: cat.display_order,
      }))

    let insertedParents: Pick<CategoryRecord, 'id' | 'name' | 'type'>[] = []

    if (parentInserts.length > 0) {
      const { data: finalCheck } = await supabase
        .from(TABLE_NAME)
        .select('id, name, type, parent_id')
        .eq('user_id', user.id)
        .is('parent_id', null)

      if (finalCheck && finalCheck.length > 0) {
        console.log('Categories đã tồn tại, bỏ qua insert (race condition)')
        finalCheck.forEach(cat => {
          const key = `${cat.name}_${cat.type}_null`
          existingCategoryMap.set(key, cat.id)
        })
      } else {
        const { data: inserted, error: parentError } = await supabase
          .from(TABLE_NAME)
          .insert(parentInserts)
          .select()

        if (parentError) {
          if (parentError.code === '23505' || parentError.message?.includes('duplicate')) {
            console.warn('Duplicate category detected, reloading existing categories')
            const { data: reloaded } = await supabase
              .from(TABLE_NAME)
              .select('id, name, type, parent_id')
              .eq('user_id', user.id)
              .is('parent_id', null)

            if (reloaded) {
              reloaded.forEach(cat => {
                const key = `${cat.name}_${cat.type}_null`
                existingCategoryMap.set(key, cat.id)
              })
            }
          } else {
            throw parentError
          }
        } else {
          insertedParents = inserted || []
          insertedParents.forEach((inserted) => {
            const key = `${inserted.name}_${inserted.type}_null`
            existingCategoryMap.set(key, inserted.id)
          })
        }
      }
    }

    if (insertedParents.length === 0 && parentInserts.length > 0) {
      const { data: reloaded } = await supabase
        .from(TABLE_NAME)
        .select('id, name, type, parent_id')
        .eq('user_id', user.id)
        .is('parent_id', null)

      if (reloaded) {
        reloaded.forEach(cat => {
          const key = `${cat.name}_${cat.type}_null`
          existingCategoryMap.set(key, cat.id)
        })
        insertedParents = reloaded.map(cat => ({ id: cat.id, name: cat.name, type: cat.type }))
      }
    }

    const nameToCategoryMap = new Map<string, string>()
    insertedParents.forEach(parent => {
      const key = `${parent.name}_${parent.type}`
      nameToCategoryMap.set(key, parent.id)
    })

    const childInserts: Array<{
      user_id: string
      name: string
      type: CategoryType
      icon_id: string
      icon_url?: string | null
      parent_id: string
      is_default: boolean
      display_order: number
    }> = []

    parentCategories.forEach((parentCat) => {
      const parentCategoryId = nameToCategoryMap.get(`${parentCat.name}_${parentCat.type}`)
      if (parentCategoryId && parentCat.children && parentCat.children.length > 0) {
        parentCat.children.forEach(childCat => {
          const key = `${childCat.name}_${childCat.type}_${parentCategoryId}`
          if (!existingCategoryMap.has(key)) {
            childInserts.push({
              user_id: user.id,
              name: childCat.name,
              type: childCat.type,
              icon_id: childCat.icon_id,
              icon_url: childCat.icon_url || null,
              parent_id: parentCategoryId,
              is_default: true,
              display_order: childCat.display_order,
            })
          }
        })
      }
    })

    if (childInserts.length > 0) {
      const { data: insertedChildren, error: childError } = await supabase
        .from(TABLE_NAME)
        .insert(childInserts)
        .select()

      if (childError) {
        console.error('Error inserting child categories:', childError)
      } else if (insertedChildren) {
        insertedChildren.forEach(child => {
          const key = `${child.name}_${child.type}_${child.parent_id}`
          existingCategoryMap.set(key, child.id)
        })
      }
    }

    await invalidateCategoriesCache()
  } catch (error) {
    console.error('Lỗi khi đồng bộ hạng mục mặc định:', error)
    throw error
  }
}

export const initializeDefaultCategories = async (): Promise<void> => {
  return syncCategoriesFromDefault()
}

export const updateCategoriesIconUrlFromDefault = async (): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật icon_url.')
  }

  const { data: userCategories, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, type, parent_id, icon_url')
    .eq('user_id', user.id)

  if (fetchError) {
    console.error('Error fetching categories:', fetchError)
    return
  }

  if (!userCategories || userCategories.length === 0) {
    return
  }

  const defaultIconUrlMap = new Map<string, string | null>()

  DEFAULT_EXPENSE_CATEGORIES.forEach((parentCat) => {
    const parentKey = `${parentCat.name}_${parentCat.type}_null`
    if (parentCat.icon_url) {
      defaultIconUrlMap.set(parentKey, parentCat.icon_url)
    }

    if (parentCat.children) {
      parentCat.children.forEach((child) => {
        const childKey = `${child.name}_${child.type}_${parentCat.name}`
        if (child.icon_url) {
          defaultIconUrlMap.set(childKey, child.icon_url)
        }
      })
    }
  })

  DEFAULT_INCOME_CATEGORIES.forEach((cat) => {
    const key = `${cat.name}_${cat.type}_null`
    if (cat.icon_url) {
      defaultIconUrlMap.set(key, cat.icon_url)
    }
  })

  const parentIdToNameMap = new Map<string, string>()
  userCategories.forEach((cat) => {
    if (!cat.parent_id) {
      parentIdToNameMap.set(cat.id, cat.name)
    }
  })

  const updates: Array<{ id: string; icon_url: string | null }> = []

  for (const category of userCategories) {
    if (!category.icon_url) {
      let key: string

      if (category.parent_id) {
        const parentName = parentIdToNameMap.get(category.parent_id) || 'null'
        key = `${category.name}_${category.type}_${parentName}`
      } else {
        key = `${category.name}_${category.type}_null`
      }

      const defaultIconUrl = defaultIconUrlMap.get(key)

      if (defaultIconUrl) {
        updates.push({
          id: category.id,
          icon_url: defaultIconUrl,
        })
      }
    }
  }

  if (updates.length > 0) {
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update({ icon_url: update.icon_url })
        .eq('id', update.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.warn(`Failed to update icon_url for category ${update.id}:`, updateError)
      }
    }

    await invalidateCategoriesCache()
  }
}

export const deleteCategory = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xoá hạng mục.')
  }

  console.log('Attempting to delete category:', { id, userId: user.id })

  const { data: category, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, is_default, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('Category fetch result:', { category, fetchError, errorCode: fetchError?.code })

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching category:', fetchError)
    throw new Error('Không thể kiểm tra hạng mục. Vui lòng thử lại sau.')
  }

  if (!category) {
    const { data: categoryWithoutUserFilter } = await supabase
      .from(TABLE_NAME)
      .select('id, name, user_id')
      .eq('id', id)
      .maybeSingle()

    console.log('Category without user filter:', categoryWithoutUserFilter)

    if (categoryWithoutUserFilter) {
      throw new Error('Bạn không có quyền xóa hạng mục này. Hạng mục không thuộc về tài khoản của bạn.')
    }

    throw new Error('Không tìm thấy hạng mục cần xóa hoặc đã bị xóa trước đó.')
  }

  const { error: deleteError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error deleting category:', deleteError)
    throw new Error('Không thể xóa hạng mục. Vui lòng thử lại sau.')
  }

  await invalidateCategoriesCache()
}
