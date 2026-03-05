import { useNavigate, useLocation } from 'react-router-dom'

import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { LoginForm } from '../components/auth/LoginForm'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth } from '../hooks/useSupabaseHealth'

export const LoginPage = () => {
  const { refresh } = useSupabaseHealth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get the page user was trying to access before login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  return (
    <AuroraBackground>
      <div className="flex min-h-full w-full flex-col items-center justify-between gap-3">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-4 sm:gap-6 pt-20 sm:pt-16 md:pt-20">
          <BrandBadge />

          <div className="text-center mt-2 sm:mt-4">
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-sm sm:text-2xl md:text-3xl">Chào mừng trở lại!</h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
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

