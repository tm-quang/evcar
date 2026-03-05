import { useState, type ChangeEvent, type FormEvent } from 'react'
import { FaEye, FaEyeSlash, FaLock, FaEnvelope, FaUser } from 'react-icons/fa'

import { getSupabaseClient } from '../../lib/supabaseClient'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { translateAuthError } from '../../utils/authErrorTranslator'

type RegisterFormProps = {
  onSuccess?: (email: string) => void
  onError?: (message: string) => void
}

export const RegisterForm = ({ onSuccess, onError }: RegisterFormProps) => {
  const { success, error: showError } = useNotification()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange =
    (field: keyof typeof formData) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }))
      if (error) {
        setError('')
      }
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      const message = 'Mật khẩu xác nhận không khớp.'
      setError(message)
      showError(message)
      onError?.(message)
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()

      // Get the current origin for redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`

      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
          emailRedirectTo: redirectUrl, // URL để redirect sau khi xác thực email
        },
      })

      if (authError) {
        throw authError
      }

      success('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.')
      onSuccess?.(formData.email)
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin và thử lại.'
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
              <FaUser className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Họ và tên"
              value={formData.name}
              onChange={handleChange('name')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FaEnvelope className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="register-email"
              name="email"
              type="email"
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Email của bạn"
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
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        <div className="space-y-2">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <FaLock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập lại mật khẩu"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full transform rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng ký...' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  )
}

