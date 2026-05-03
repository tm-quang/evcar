import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { FaEye, FaEyeSlash, FaLock, FaUser, FaCheckCircle } from 'react-icons/fa'

import { getSupabaseClient } from '../../lib/supabaseClient'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { translateAuthError } from '../../utils/authErrorTranslator'
import { setAuthStateOnLogin } from '../../hooks/useAuthState'
import { ForgotPasswordModal } from './ForgotPasswordModal'

type LoginFormProps = {
  onSuccess?: (email: string) => void
  onError?: (message: string) => void
}

// Keys cho saved credentials
const REMEMBER_CREDENTIALS_KEY = 'bofin_saved_credentials'

// Mã hóa nhẹ để không lưu plaintext (không phải bảo mật cao, chỉ che khuất)
const encodeCredentials = (email: string, password: string): string => {
  const payload = JSON.stringify({ e: email, p: password, ts: Date.now() })
  return btoa(encodeURIComponent(payload))
}

const decodeCredentials = (encoded: string): { email: string; password: string } | null => {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(encoded)))
    return { email: payload.e || '', password: payload.p || '' }
  } catch {
    return null
  }
}

export const LoginForm = ({ onSuccess, onError }: LoginFormProps) => {
  const { success, error: showError } = useNotification()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [hasRememberedCredentials, setHasRememberedCredentials] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Load remembered credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_CREDENTIALS_KEY)
    if (saved) {
      const credentials = decodeCredentials(saved)
      if (credentials && credentials.email) {
        setFormData({ email: credentials.email, password: credentials.password })
        setRememberMe(true)
        setHasRememberedCredentials(true)
      }
    }
  }, [])

  // L\u1eafng nghe event t\u1eeb Login page \u0111\u1ec3 m\u1edf modal forgot password
  // (trigger khi user click "G\u1eedi l\u1ea1i link" t\u1eeb banner l\u1ed7i)
  useEffect(() => {
    const handler = () => setShowForgotPassword(true)
    window.addEventListener('open-forgot-password', handler)
    return () => window.removeEventListener('open-forgot-password', handler)
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

      const identifier = formData.email.trim();
      const isEmail = identifier.includes('@');

      let loginEmail = identifier;

      // Nếu là số điện thoại, tìm email tương ứng trong bảng profiles để đăng nhập "miễn phí"
      if (!isEmail && /^[0-9+\-\s()]+$/.test(identifier)) {
        const phoneClean = identifier.replace(/[\s()-]/g, '');
        console.log('🔍 Đang tìm email cho SĐT:', phoneClean);

        const { data: profile, error: pError } = await supabase
          .from('profiles')
          .select('email')
          .or(`phone.eq.${phoneClean},phone.eq.0${phoneClean.slice(-9)},phone.eq.+84${phoneClean.slice(-9)}`)
          .maybeSingle();

        if (pError) {
          console.error('❌ Lỗi truy vấn dữ liệu:', pError.message);
        }

        if (profile?.email) {
          console.log('✅ Tìm thấy email liên kết:', profile.email);
          loginEmail = profile.email;
        } else {
          console.warn('⚠️ Không tìm thấy email liên kết với SĐT này.');
        }
      }

      const res = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: formData.password,
      });

      const { data, error: authError } = res;

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
        throw new Error('Đăng nhập thất bại.')
      }

      // Update auth singleton TRƯỚC KHI navigate để ProtectedRoute thấy user ngay
      setAuthStateOnLogin(data.session.user, data.session)

      // Populate user cache
      const { setCachedUser } = await import('../../lib/userCache')
      setCachedUser(data.session.user)

      // Save or clear credentials based on remember me checkbox
      if (rememberMe) {
        const encoded = encodeCredentials(formData.email.trim(), formData.password)
        localStorage.setItem(REMEMBER_CREDENTIALS_KEY, encoded)
      } else {
        localStorage.removeItem(REMEMBER_CREDENTIALS_KEY)
      }

      // Set flags
      sessionStorage.setItem('bofin_just_logged_in', 'true')
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

  return (<>
    <div className="w-full max-w-lg rounded-3xl shadow-lg bg-white p-6 sm:p-8">
      {/* Banner thông báo đã ghi nhớ thông tin */}
      {hasRememberedCredentials && !error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <FaCheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          <span>Nhấn <strong>Đăng nhập</strong> để tiếp tục.</span>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-3xl border border-red-200 bg-red-50 px-4 py-10 text-sm text-red-700">
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
              id="email"
              name="email"
              type="text"
              required
              autoComplete="username"
              className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập Email hoặc Số điện thoại"
              value={formData.email}
              onChange={(e) => { handleChange('email')(e); setHasRememberedCredentials(false) }}
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
              className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={(e) => { handleChange('password')(e); setHasRememberedCredentials(false) }}
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
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-0 cursor-pointer transition"
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
              Ghi nhớ tài khoản
            </span>
          </label>
          <button
            id="forgot-password-btn"
            className="text-sm font-medium text-sky-600 transition-colors hover:text-sky-500 active:text-sky-700"
            type="button"
            onClick={() => setShowForgotPassword(true)}
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="w-full transform rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg transition duration-200 hover:scale-[1.02] hover:shadow-xl hover:from-sky-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>

    {/* Forgot Password Modal */}
    <ForgotPasswordModal
      isOpen={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
      initialEmail={formData.email}
    />
  </>)
}


