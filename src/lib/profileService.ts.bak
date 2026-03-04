import type { PostgrestError, AuthError } from '@supabase/supabase-js'

import { getSupabaseClient } from './supabaseClient'
import { uploadToCloudinary } from './cloudinaryService'
import { getCachedUser } from './userCache'
import { queryClient } from './react-query'

export type ProfileRecord = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export type ProfileUpdate = {
  full_name?: string
  avatar_url?: string | null
  phone?: string
  date_of_birth?: string
}

const TABLE_NAME = 'profiles'

const throwIfError = (error: PostgrestError | AuthError | null, fallbackMessage: string): void => {
  if (error) {
    throw new Error(error.message || fallbackMessage)
  }
}

// Lấy thông tin profile của user hiện tại
export const getCurrentProfile = async (forceRefresh = false): Promise<ProfileRecord | null> => {
  if (forceRefresh) {
    const { invalidateUserCache } = await import('./userCache')
    invalidateUserCache()
  }
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    return null
  }

  // Direct fetch
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    // Log detailed error for debugging
    console.error('Supabase profile query error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      table: TABLE_NAME,
      userId: user.id
    })

    // If profile doesn't exist (PGRST116), try to create it
    if (error.code === 'PGRST116') {
      console.warn('Profile not found, attempting to create default profile...')
      try {
        const { data: newProfile, error: insertError } = await supabase
          .from(TABLE_NAME)
          .insert({
            id: user.id,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || null,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Failed to create profile:', insertError)
          throwIfError(insertError, 'Không thể tạo thông tin cá nhân.')
        }

        // Invalidate cache after creating profile
        await queryClient.invalidateQueries({ queryKey: ['getCurrentProfile'] })

        return newProfile
      } catch (createError) {
        console.error('Failed to bootstrap profile record after missing profile error:', createError)
        throwIfError(error, 'Không thể tải thông tin cá nhân.')
      }
    }

    throwIfError(error, 'Không thể tải thông tin cá nhân.')
  }

  return data
}

// Cập nhật thông tin cá nhân
export const updateProfile = async (updates: ProfileUpdate): Promise<ProfileRecord> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để cập nhật thông tin.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  throwIfError(error, 'Không thể cập nhật thông tin cá nhân.')

  if (!data) {
    throw new Error('Không nhận được dữ liệu sau khi cập nhật.')
  }

  // Invalidate cache khi profile được cập nhật
  await queryClient.invalidateQueries({ queryKey: ['getCurrentProfile'] })

  return data
}

// Đổi mật khẩu
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const supabase = getSupabaseClient()
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để đổi mật khẩu.')
  }

  // Xác thực mật khẩu hiện tại bằng cách đăng nhập lại
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email || '',
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Mật khẩu hiện tại không đúng.')
  }

  // Cập nhật mật khẩu mới
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  throwIfError(updateError, 'Không thể đổi mật khẩu.')
}

// Upload avatar và cập nhật URL
export const uploadAvatar = async (file: File): Promise<string> => {
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để upload avatar.')
  }

  // Xóa avatar cũ nếu có
  const profile = await getCurrentProfile()
  if (profile?.avatar_url) {
    try {
      await deleteAvatar()
    } catch {
      // Ignore error if old avatar doesn't exist
    }
  }

  // Upload file lên Cloudinary
  // Folder structure: {base_folder}/avatars/{user_id}
  // Image is already compressed client-side to 200x200px and max 250KB
  // Note: Transformations should be configured in Upload Preset or applied via URL
  const uploadResult = await uploadToCloudinary(file, {
    folder: `avatars/${user.id}`,
  })

  // Cập nhật avatar_url trong profile
  await updateProfile({ avatar_url: uploadResult.secure_url })

  return uploadResult.secure_url
}

// Xóa avatar
export const deleteAvatar = async (): Promise<void> => {
  const user = await getCachedUser()

  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa avatar.')
  }

  // Note: Cloudinary deletion should be done server-side for security
  // For now, we just remove the URL from the profile
  // The actual image will remain on Cloudinary until manually deleted or expired

  // Cập nhật profile để xóa avatar_url
  await updateProfile({ avatar_url: null })
}
