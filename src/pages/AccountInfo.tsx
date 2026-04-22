import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaCamera, FaEnvelope, FaPhone, FaUser, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa'

import HeaderBar from '../components/layout/HeaderBar'
import { deleteAvatar, getCurrentProfile, updateProfile, uploadAvatar, changePassword, type ProfileRecord } from '../lib/profileService'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useNotification } from '../contexts/notificationContext.helpers'
import { AccountInfoSkeleton } from '../components/skeletons'
import { compressImageForAvatar, isFileSizeAcceptable } from '../utils/imageCompression'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'

const AccountInfoPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAvatarProcessing, setIsAvatarProcessing] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          setUserEmail(user.email || '')
        }

        const profileData = await getCurrentProfile()
        if (profileData) {
          setProfile(profileData)
          setAvatarPreview(null)
          setPendingAvatarFile(null)
          setFormData({
            full_name: profileData.full_name || '',
            phone: profileData.phone || '',
            date_of_birth: profileData.date_of_birth || '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) {
        // User cancelled or no file selected - this is normal, just reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      const maxInitialSize = 10 * 1024 * 1024 // 10MB max before compression
      if (file.size > maxInitialSize) {
        setError('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 10MB')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      setIsAvatarProcessing(true)
      setError(null)
      try {
        const compressedFile = await compressImageForAvatar(file, 200, 200, 250, 0.8)

        if (!isFileSizeAcceptable(compressedFile, 250)) {
          setError('Không thể nén ảnh xuống dưới 250KB. Vui lòng chọn ảnh khác')
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }

        setPendingAvatarFile(compressedFile)
        const newPreviewUrl = URL.createObjectURL(compressedFile)
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview)
        }
        setAvatarPreview(newPreviewUrl)
        success('Ảnh đã sẵn sàng, nhấn "Lưu thay đổi" để cập nhật.')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể upload avatar'
        setError(message)
        showError(message)
      } finally {
        setIsAvatarProcessing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Error handling file change:', error)
      showError('Có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    setPendingAvatarFile(null)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await deleteAvatar()
      const updatedProfile = await getCurrentProfile()
      if (updatedProfile) {
        setProfile(updatedProfile)
        success('Đã xóa ảnh đại diện thành công!')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xóa avatar'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (pendingAvatarFile) {
        setIsAvatarUploading(true)
        await uploadAvatar(pendingAvatarFile)
        setPendingAvatarFile(null)
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview)
          setAvatarPreview(null)
        }
      }

      await updateProfile({
        full_name: formData.full_name || undefined,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
      })
      const updatedProfile = await getCurrentProfile()
      if (updatedProfile) {
        setProfile(updatedProfile)
        success('Đã cập nhật thông tin thành công!')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật thông tin'
      setError(message)
      showError(message)
    } finally {
      setIsAvatarUploading(false)
      setIsSubmitting(false)
    }
  }

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      const message = 'Vui lòng điền đầy đủ thông tin'
      setError(message)
      showError(message)
      setIsSubmitting(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      const message = 'Mật khẩu mới phải có ít nhất 6 ký tự'
      setError(message)
      showError(message)
      setIsSubmitting(false)
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      const message = 'Mật khẩu xác nhận không khớp'
      setError(message)
      showError(message)
      setIsSubmitting(false)
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      const message = 'Mật khẩu mới phải khác mật khẩu hiện tại'
      setError(message)
      showError(message)
      setIsSubmitting(false)
      return
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      success('Đã đổi mật khẩu thành công!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể đổi mật khẩu'
      setError(message)
      showError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden text-slate-900" style={{ backgroundColor: 'var(--app-home-bg)' }}>
      <HeaderBar variant="page" title="Thông tin tài khoản" />
      <main className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-2 pb-4 sm:pt-2 sm:pb-4">
          {/* Tab Selector */}
          <div className="flex gap-2 rounded-xl bg-white p-1 shadow-md border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'info'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Thông tin cá nhân
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'password'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Đổi mật khẩu
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {isLoading ? (
            <AccountInfoSkeleton />
          ) : activeTab === 'info' ? (
            <form onSubmit={handleSubmitInfo} id="account-form" className="space-y-4 rounded-3xl bg-white p-5 shadow-md sm:p-6 border border-slate-300">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {avatarPreview || profile?.avatar_url ? (
                    <img
                      src={avatarPreview || profile?.avatar_url || ''}
                      alt="Avatar"
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100 sm:h-28 sm:w-28"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white ring-4 ring-slate-100 sm:h-28 sm:w-28">
                      <FaUser className="h-12 w-12 sm:h-14 sm:w-14" />
                    </div>
                  )}
                  {(isAvatarProcessing || isAvatarUploading) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-xs font-semibold text-slate-700">
                      {isAvatarProcessing ? 'Đang xử lý ảnh...' : 'Đang tải ảnh lên...'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        fileInputRef.current?.click()
                      } catch (error) {
                        console.error('Error opening file picker:', error)
                        showError('Không thể mở bộ sưu tập. Vui lòng thử lại.')
                      }
                    }}
                    disabled={isSubmitting || isAvatarProcessing || isAvatarUploading}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition hover:bg-sky-600 disabled:opacity-50 sm:h-10 sm:w-10"
                  >
                    <FaCamera className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {pendingAvatarFile && !isAvatarProcessing && !isAvatarUploading && (
                  <p className="text-xs text-slate-500">
                    Ảnh sẽ được cập nhật sau khi bạn nhấn "Lưu thay đổi".
                  </p>
                )}
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isSubmitting || isAvatarProcessing || isAvatarUploading}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Xóa ảnh đại diện
                  </button>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaUser className="mr-1.5 inline h-4 w-4" />
                  Họ và tên
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Nhập họ và tên"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaEnvelope className="mr-1.5 inline h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={userEmail}
                  disabled
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-500 sm:p-4"
                />
                <p className="mt-1 text-xs text-slate-400">Email không thể thay đổi</p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaPhone className="mr-1.5 inline h-4 w-4" />
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Nhập số điện thoại"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="date_of_birth" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Ngày sinh
                </label>
                <input
                  type="date"
                  id="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                />
              </div>

            </form>
          ) : (
            <form onSubmit={handleSubmitPassword} id="password-form" className="space-y-4 rounded-3xl bg-white p-5 shadow-md sm:p-6 border border-slate-300">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  <FaLock className="mr-1.5 inline h-4 w-4" />
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.current ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3.5 pr-12 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      {activeTab === 'info' ? (
        <ModalFooterButtons
          onCancel={() => navigate('/settings')}
          onConfirm={() => { }}
          confirmText={isSubmitting ? (isAvatarUploading ? 'Đang tải ảnh...' : 'Đang lưu...') : 'Lưu thay đổi'}
          isSubmitting={isSubmitting}
          disabled={isSubmitting || isLoading || isAvatarProcessing}
          confirmButtonType="submit"
          formId="account-form"
          fixed={true}
        />
      ) : (
        <ModalFooterButtons
          onCancel={() => navigate('/settings')}
          onConfirm={() => { }}
          confirmText={isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
          isSubmitting={isSubmitting}
          disabled={isSubmitting}
          confirmButtonType="submit"
          formId="password-form"
          fixed={true}
        />
      )}
    </div>
  )
}

export default AccountInfoPage


