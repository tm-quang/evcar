import { AuthFooter } from '../components/auth/AuthFooter'
import { BrandBadge } from '../components/auth/BrandBadge'
import { RegisterForm } from '../components/auth/RegisterForm'
import { AuroraBackground } from '../components/layout/AuroraBackground'
import { useSupabaseHealth } from '../hooks/useSupabaseHealth'

export const RegisterPage = () => {
  const { refresh } = useSupabaseHealth()

  return (
    <AuroraBackground>
      <div className="flex min-h-full w-full flex-col items-center justify-between gap-3">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-4 sm:gap-6 pt-20 sm:pt-16 md:pt-20">
          <BrandBadge />

          <div className="text-center mt-2 sm:mt-4">
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-sm sm:text-2xl md:text-3xl">
              Tạo tài khoản BoFin
            </h1>
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
          <RegisterForm
            onSuccess={() => {
              void refresh()
            }}
            onError={() => {
              // Error handling is done in RegisterForm component
            }}
          />
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center pb-4">
          <AuthFooter prompt="Đã có tài khoản?" linkTo="/login" linkLabel="Đăng nhập ngay" />
        </div>
      </div>
    </AuroraBackground>
  )
}

export default RegisterPage

