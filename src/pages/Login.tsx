import { useNavigate, useLocation } from 'react-router-dom'
import { FaExclamationTriangle, FaLink } from 'react-icons/fa'

import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { LoginForm } from '../components/auth/LoginForm'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth } from '../hooks/useSupabaseHealth'

// Translate Supabase error codes sang tiếng Việt
const translateAuthErrorCode = (code: string, desc: string): { title: string; message: string; showRequest: boolean } => {
  if (code === 'otp_expired') {
    return {
      title: 'Link đã hết hạn',
      message: 'Link đặt lại mật khẩu chỉ có hiệu lực trong 60 phút. Vui lòng yêu cầu gửi lại link mới.',
      showRequest: true,
    }
  }
  if (code === 'access_denied') {
    return {
      title: 'Không có quyền truy cập',
      message: desc || 'Link không hợp lệ hoặc đã được sử dụng. Vui lòng yêu cầu link mới.',
      showRequest: true,
    }
  }
  if (code === 'invalid_token' || code === 'bad_otp') {
    return {
      title: 'Link không hợp lệ',
      message: 'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu gửi lại.',
      showRequest: true,
    }
  }
  return {
    title: 'Lỗi xác thực',
    message: desc || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    showRequest: false,
  }
}

export const LoginPage = () => {
  const { refresh } = useSupabaseHealth()
  const navigate = useNavigate()
  const location = useLocation()

  // Lấy trang user đang truy cập trước khi bị redirect về login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/ev'

  // Detect auth error từ URL params (do RootRedirect chuyển qua)
  const searchParams = new URLSearchParams(location.search)
  const authErrorCode = searchParams.get('auth_error') ?? ''
  const authErrorMsg = searchParams.get('msg') ?? ''
  const authError = authErrorCode
    ? translateAuthErrorCode(authErrorCode, decodeURIComponent(authErrorMsg))
    : null

  return (
    <AuroraBackground>
      <div className="flex min-h-full w-full flex-col items-center justify-between gap-3">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-4 sm:gap-6 pt-14 sm:pt-16 md:pt-20">
          <BrandBadge />

          <div className="text-center mt-2 sm:mt-4">
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-sm sm:text-2xl md:text-3xl">
              {authError ? 'Đặt lại mật khẩu' : 'Chào mừng trở lại!'}
            </h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
          {/* Banner lỗi từ email link */}
          {authError && (
            <div className="w-full max-w-lg rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100">
                  {authErrorCode === 'otp_expired'
                    ? <FaLink className="h-4 w-4 text-orange-500" />
                    : <FaExclamationTriangle className="h-4 w-4 text-orange-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">{authError.title}</p>
                  <p className="mt-0.5 text-xs text-orange-600 leading-relaxed">{authError.message}</p>
                  {authError.showRequest && (
                    <button
                      className="mt-2 text-xs font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-700"
                      onClick={() => {
                        // Xóa error params khỏi URL
                        navigate('/login', { replace: true })
                        // Trigger mở ForgotPasswordModal — dùng custom event
                        window.dispatchEvent(new CustomEvent('open-forgot-password'))
                      }}
                    >
                      → Gửi lại link đặt lại mật khẩu
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <LoginForm
            onSuccess={() => {
              void refresh()
              navigate(from, { replace: true })
            }}
            onError={() => {
              // Error handling is done in LoginForm component
            }}
          />
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center pb-4">
          <AuthFooter prompt="Chưa có tài khoản?" linkTo="/register" linkLabel="Đăng ký ngay" />
        </div>
      </div>
    </AuroraBackground>
  )
}

export default LoginPage
