import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { getCachedUser } from './userCache'
import { getNowUTC7 } from '../utils/dateUtils'
import { generateUUID } from '../utils/uuid'
import { queryClient } from './react-query'
import { applyArchiveFilter } from '../store/useArchiveStore'

export type ShoppingItemStatus = 'pending' | 'completed'

export type ShoppingItem = {
  id: string
  name: string
  status: ShoppingItemStatus
  quantity?: string | null
  notes?: string | null
  display_order: number
  completed_at?: string | null // Thời gian hoàn thành mục này
}

export type ShoppingListRecord = {
  id: string
  user_id: string
  title: string
  type: 'market' | 'supermarket' | 'custom' // Đi chợ, Siêu thị, Tùy chỉnh
  items: ShoppingItem[]
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type ShoppingListInsert = {
  title: string
  type: 'market' | 'supermarket' | 'custom'
  items?: ShoppingItem[]
}

export type ShoppingListUpdate = {
  title?: string
  type?: 'market' | 'supermarket' | 'custom'
  items?: ShoppingItem[]
  completed_at?: string | null
}

const TABLE_NAME = 'shopping_lists'

const throwIfError = (error: PostgrestError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Fetch all shopping lists
export const fetchShoppingLists = async (includeCompleted: boolean = true): Promise<ShoppingListRecord[]> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem danh sách mua sắm.')
  }

  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', user.id)

  query = applyArchiveFilter(query, 'created_at')

  query = query.order('created_at', { ascending: false })

  if (!includeCompleted) {
    query = query.is('completed_at', null)
  }

  const { data, error } = await query

  throwIfError(error, 'Không thể tải danh sách mua sắm.')

  return data || []
}

// Fetch a single shopping list by ID
export const fetchShoppingList = async (id: string): Promise<ShoppingListRecord | null> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xem danh sách mua sắm.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throwIfError(error, 'Không thể tải danh sách mua sắm.')
  }

  return data
}

// Create a new shopping list
export const createShoppingList = async (list: ShoppingListInsert): Promise<ShoppingListRecord> => {
  try {
    const supabase = getSupabaseClient()
    const user = await getCachedUser()

    if (!user) {
      throw new Error('Bạn cần đăng nhập để tạo danh sách mua sắm.')
    }

    const now = getNowUTC7().toISOString()

    // Clean items: remove undefined fields and ensure proper structure for JSONB
    const cleanedItems = (list.items || []).map(item => {
      const cleaned: Record<string, unknown> = {
        id: item.id,
        name: item.name,
        status: item.status,
        display_order: item.display_order,
      }
      // Chỉ thêm các field optional nếu chúng có giá trị
      if (item.quantity !== undefined && item.quantity !== null && item.quantity !== '') {
        cleaned.quantity = item.quantity
      }
      if (item.notes !== undefined && item.notes !== null && item.notes !== '') {
        cleaned.notes = item.notes
      }
      if (item.completed_at !== undefined && item.completed_at !== null) {
        cleaned.completed_at = item.completed_at
      }
      return cleaned
    })

    console.log('Creating shopping list with data:', {
      title: list.title,
      type: list.type,
      itemsCount: cleanedItems.length,
      userId: user.id,
      items: cleanedItems.slice(0, 3), // Log first 3 items only
    })

    const insertData = {
      user_id: user.id,
      title: list.title,
      type: list.type,
      items: cleanedItems,
      created_at: now,
      updated_at: now,
      completed_at: null,
    }

    console.log('Insert data structure:', {
      hasItems: !!insertData.items,
      itemsType: Array.isArray(insertData.items),
      itemsLength: insertData.items.length,
    })

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('=== SUPABASE ERROR ===')
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Full error object:', error)

      // Provide more user-friendly error messages
      let errorMessage = 'Không thể tạo danh sách mua sắm.'

      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        errorMessage = 'Bảng shopping_lists chưa được tạo. Vui lòng chạy migration SQL trong Supabase Dashboard → SQL Editor.'
      } else if (error.message?.includes('column') && error.message?.includes('not found')) {
        errorMessage = 'Lỗi cấu hình database. Vui lòng kiểm tra lại schema của bảng shopping_lists.'
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng và thử lại.'
      } else if (error.code === '42501') {
        errorMessage = 'Bạn không có quyền tạo danh sách mua sắm. Vui lòng kiểm tra RLS policies trong Supabase.'
      } else if (error.code === '23503') {
        errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.'
      } else if (error.message) {
        errorMessage = `Lỗi: ${error.message}`
      } else if (error.details) {
        errorMessage = `Lỗi: ${error.details}`
      }

      throw new Error(errorMessage)
    }

    if (!data) {
      throw new Error('Không nhận được dữ liệu danh sách mua sắm sau khi tạo.')
    }

    // Invalidate queries
    await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] })

    return data
  } catch (err) {
    // Re-throw nếu đã là Error với message
    if (err instanceof Error) {
      console.error('Error in createShoppingList:', err.message)
      throw err
    }
    // Nếu không phải Error, tạo Error mới
    console.error('Unknown error in createShoppingList:', err)
    throw new Error(`Không thể tạo danh sách mua sắm: ${String(err)}`)
  }
}

// Update a shopping list
export const updateShoppingList = async (
  id: string,
  updates: ShoppingListUpdate
): Promise<ShoppingListRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật danh sách mua sắm.')
  }

  const now = getNowUTC7().toISOString()

  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: now,
  }

  // Handle completed_at
  if (updates.completed_at !== undefined) {
    updateData.completed_at = updates.completed_at
  }

  // Check if all items are completed to auto-complete the list
  if (updates.items && updates.items.length > 0) {
    const allCompleted = updates.items.every(item => item.status === 'completed')
    if (allCompleted && updates.completed_at === undefined) {
      updateData.completed_at = now
    } else if (!allCompleted && updates.completed_at) {
      updateData.completed_at = null
    }
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật danh sách mua sắm.')

  // Invalidate queries
  await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] })
  await queryClient.invalidateQueries({ queryKey: ['shoppingList', id] })

  return data
}

// Delete a shopping list
export const deleteShoppingList = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa danh sách mua sắm.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  throwIfError(error, 'Không thể xóa danh sách mua sắm.')

  // Invalidate queries
  await queryClient.invalidateQueries({ queryKey: ['shoppingLists'] })
}

// Toggle item status
export const toggleShoppingItem = async (
  listId: string,
  itemId: string,
  status: ShoppingItemStatus
): Promise<ShoppingListRecord> => {
  const list = await fetchShoppingList(listId)
  if (!list) {
    throw new Error('Không tìm thấy danh sách mua sắm.')
  }

  const now = getNowUTC7().toISOString()

  const updatedItems = list.items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        status,
        completed_at: status === 'completed' ? now : null,
      }
    }
    return item
  })

  return updateShoppingList(listId, { items: updatedItems })
}

// Add item to shopping list
export const addShoppingItem = async (
  listId: string,
  item: Omit<ShoppingItem, 'id' | 'status' | 'display_order'>
): Promise<ShoppingListRecord> => {
  const list = await fetchShoppingList(listId)
  if (!list) {
    throw new Error('Không tìm thấy danh sách mua sắm.')
  }

  const newItem: ShoppingItem = {
    id: generateUUID(),
    name: item.name,
    status: 'pending',
    quantity: item.quantity || null,
    notes: item.notes || null,
    display_order: list.items.length,
  }

  const updatedItems = [...list.items, newItem]

  return updateShoppingList(listId, { items: updatedItems })
}

// Remove item from shopping list
export const removeShoppingItem = async (listId: string, itemId: string): Promise<ShoppingListRecord> => {
  const list = await fetchShoppingList(listId)
  if (!list) {
    throw new Error('Không tìm thấy danh sách mua sắm.')
  }

  const updatedItems = list.items.filter(item => item.id !== itemId)

  return updateShoppingList(listId, { items: updatedItems })
}


