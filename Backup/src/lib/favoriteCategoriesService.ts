import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

const TABLE_NAME = 'favorite_categories'

export type FavoriteCategoryType = 'Chi tiêu' | 'Thu nhập'

export type FavoriteCategoriesRecord = {
  id: string
  user_id: string
  category_type: FavoriteCategoryType
  category_ids: string[]
  created_at: string
  updated_at: string
}

/**
 * Lấy danh sách hạng mục thường dùng theo loại (Chi tiêu hoặc Thu nhập)
 * Lưu trong database với fallback về localStorage
 */
export const getFavoriteCategories = async (categoryType: FavoriteCategoryType): Promise<string[]> => {
  const user = await getCachedUser()

  if (!user) {
    // Fallback to localStorage if not logged in
    try {
      const stored = localStorage.getItem(`bofin_favorite_categories_${categoryType}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('category_ids')
    .eq('user_id', user.id)
    .eq('category_type', categoryType)
    .maybeSingle()

  if (error) {
    // If table doesn't exist, fallback to localStorage
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Favorite categories table may not exist, using localStorage:', error.message)
      return getFromLocalStorage(categoryType)
    }
    console.error('Error fetching favorite categories:', error)
    return getFromLocalStorage(categoryType)
  }

  if (data && data.category_ids) {
    return data.category_ids
  }

  // If no data in database, try localStorage and migrate if found
  const localData = getFromLocalStorage(categoryType)
  if (localData.length > 0) {
    // Migrate from localStorage to database
    try {
      await saveFavoriteCategories(categoryType, localData)
    } catch (migrateError) {
      console.warn('Error migrating from localStorage:', migrateError)
    }
  }

  return localData
}

/**
 * Lưu danh sách hạng mục thường dùng
 * Lưu vào database với fallback về localStorage
 */
export const saveFavoriteCategories = async (
  categoryType: FavoriteCategoryType,
  categoryIds: string[]
): Promise<void> => {
  const user = await getCachedUser()

  // Save to localStorage immediately (optimistic update)
  saveToLocalStorage(categoryType, categoryIds)

  if (!user) {
    return
  }

  const supabase = getSupabaseClient()

  try {
    // Use upsert to either insert or update
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        user_id: user.id,
        category_type: categoryType,
        category_ids: categoryIds,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,category_type',
      })

    if (error) {
      // If table doesn't exist, just use localStorage
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Favorite categories table may not exist, using localStorage only:', error.message)
        return
      }
      console.error('Error saving favorite categories:', error)
      throw new Error('Không thể lưu danh sách hạng mục thường dùng')
    }

    // Invalidate cache
    await queryClient.invalidateQueries({ queryKey: ['favoriteCategories', { categoryType }] })
  } catch (error) {
    console.error('Error in saveFavoriteCategories:', error)
    // Already saved to localStorage, so continue
    throw error
  }
}

/**
 * Helper: Get from localStorage
 */
function getFromLocalStorage(categoryType: FavoriteCategoryType): string[] {
  try {
    const stored = localStorage.getItem(`bofin_favorite_categories_${categoryType}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Helper: Save to localStorage
 */
function saveToLocalStorage(categoryType: FavoriteCategoryType, categoryIds: string[]): void {
  try {
    localStorage.setItem(`bofin_favorite_categories_${categoryType}`, JSON.stringify(categoryIds))
  } catch (error) {
    console.warn('Error saving to localStorage:', error)
  }
}

/**
 * Khởi tạo hạng mục yêu thích mặc định cho người dùng mới
 * Tự động set 7 hạng mục hay dùng nhất
 */
export const initializeDefaultFavorites = async (categoryType: FavoriteCategoryType): Promise<void> => {
  const user = await getCachedUser()

  if (!user) {
    return
  }

  const supabase = getSupabaseClient()

  // Check if user already has favorite categories
  const { data: existing } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('user_id', user.id)
    .eq('category_type', categoryType)
    .maybeSingle()

  // If already exists, don't initialize
  if (existing) {
    return
  }

  // Get user's categories
  const { data: userCategories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('user_id', user.id)
    .eq('type', categoryType)

  if (categoriesError || !userCategories) {
    console.error('Error fetching user categories:', categoriesError)
    return
  }

  // Define default favorite category names for Chi tiêu
  const defaultExpenseFavorites = [
    'Đi chợ, Nấu ăn',
    'Tiền thuê nhà / Trả góp nhà',
    'Xăng, Dầu',
    'Tả, sữa',
    'Tiền ra',
    'Quần áo, Giày dép',
    'Thuốc men, Dược phẩm',
  ]

  // TODO: Add default income favorites if needed
  const defaultIncomeFavorites: string[] = [
    'Lương',
    'Thưởng',
    'Tiền lãi',
  ]

  const defaultNames = categoryType === 'Chi tiêu' ? defaultExpenseFavorites : defaultIncomeFavorites

  // Find matching categories by name
  const favoriteIds: string[] = []

  for (const name of defaultNames) {
    const category = userCategories.find((cat) => cat.name === name)
    if (category) {
      favoriteIds.push(category.id)
    }

    // Stop if we have 7 favorites
    if (favoriteIds.length >= 7) {
      break
    }
  }

  // Save to database if we found at least one
  if (favoriteIds.length > 0) {
    try {
      await saveFavoriteCategories(categoryType, favoriteIds)
      console.log(`Initialized ${favoriteIds.length} default favorite categories for ${categoryType}`)
    } catch (error) {
      console.error('Error initializing default favorites:', error)
    }
  }
}

