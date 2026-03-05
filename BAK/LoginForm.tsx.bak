import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { FaEye, FaEyeSlash, FaLock, FaEnvelope } from 'react-icons/fa'

import { getSupabaseClient } from '../../lib/supabaseClient'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { translateAuthError } from '../../utils/authErrorTranslator'

type LoginFormProps = {
  onSuccess?: (email: string) => void
  onError?: (message: string) => void
}

const REMEMBER_EMAIL_KEY = 'bofin_remembered_email'

export const LoginForm = ({ onSuccess, onError }: LoginFormProps) => {
  const { success, error: showError } = useNotification()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleChange =
    (field: 'email' | 'password') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }))
      if (error) {
        setError('')
      }
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      // Log full response để debug
      console.log('Login response:', { data: data ? 'session exists' : 'no session', error: authError })

      if (authError) {
        // Log chi tiết error object
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          error: authError,
        })
        throw authError
      }

      // Kiểm tra xem có session không
      if (!data?.session) {
        throw new Error('Đăng nhập thất bại. Không nhận được session.')
      }

      // Save or remove email based on remember me checkbox
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }

      // Set flag để đánh dấu đây là login mới (không phải refresh)
      // useAuthState sẽ xử lý clear cache khi nhận được SIGNED_IN event
      sessionStorage.setItem('bofin_just_logged_in', 'true')

      // Set flag to show welcome modal after navigation
      sessionStorage.setItem('showWelcomeModal', 'true')

      success('Đăng nhập thành công!')
      onSuccess?.(formData.email)
    } catch (error) {
      // Log chi tiết lỗi để debug
      console.error('Login error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', error && typeof error === 'object' ? Object.keys(error) : 'N/A')
      
      let rawMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin và thử lại.'
      
      // Xử lý Supabase AuthError
      if (error && typeof error === 'object') {
        // Supabase error thường có cấu trúc: { message, status, name, ... }
        if ('message' in error && typeof error.message === 'string') {
          rawMessage = error.message
        } else if ('error' in error && typeof error.error === 'string') {
          rawMessage = error.error
        } else if ('statusText' in error && typeof error.statusText === 'string') {
          rawMessage = error.statusText
        }
      } else if (error instanceof Error) {
        rawMessage = error.message
      } else if (typeof error === 'string') {
        rawMessage = error
      }
      
      const message = translateAuthError(rawMessage)
      setError(message)
      showError(message)
      onError?.(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl shadow-lg bg-white p-6 sm:p-8">
      {error && (
        <div className="mb-5 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-10 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FaEnvelope className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập địa chỉ Email"
              value={formData.email}
              onChange={handleChange('email')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FaLock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleChange('password')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer transition"
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
              Ghi nhớ đăng nhập
            </span>
          </label>
          <button
            className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-500"
            type="button"
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full transform rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}

