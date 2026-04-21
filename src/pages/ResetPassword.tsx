import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle, FaShieldAlt } from 'react-icons/fa'
import { getSupabaseClient } from '../lib/supabaseClient'
import { BrandBadge } from '../components/auth/BrandBadge'
import { AuroraBackground } from '../components/layout/AuroraBackground'

type PageState = 'verifying' | 'ready' | 'loading' | 'success' | 'error' | 'expired'

const PasswordStrength = ({ password }: { password: string }) => {
  const checks = [
    { label: 'Ít nhất 8 ký tự', ok: password.length >= 8 },
    { label: 'Có chữ hoa', ok: /[A-Z]/.test(password) },
    { label: 'Có chữ số', ok: /[0-9]/.test(password) },
    { label: 'Có ký tự đặc biệt', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][score] ?? ''
  const strengthColor = [
    '',
    'bg-red-400',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-emerald-500',
  ][score] ?? ''

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              score >= level ? strengthColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
          {strengthLabel}
        </p>
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <div key={check.label} className={`flex items-center gap-1.5 text-xs ${check.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${check.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            {check.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export const ResetPasswordPage = () => {
  const navigate = useNavigate()
  const [pageState, setPageState] = useState<PageState>('verifying')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Supabase redirect từ email sẽ có #access_token hoặc session TYPE=recovery trong URL
  useEffect(() => {
    const supabase = getSupabaseClient()

    // Supabase tự động xử lý token trong URL hash và set session
    // Lắng nghe event PASSWORD_RECOVERY (event chính thức cho reset password)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Reset password page - auth event:', event)

      if (event === 'PASSWORD_RECOVERY') {
        // Supabase đã xác thực token, user có thể đặt lại mật khẩu
        setUserEmail(session?.user?.email ?? '')
        setPageState('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // SIGNED_IN có thể fire trước PASSWORD_RECOVERY, check thêm
        const hash = window.location.hash
        if (hash.includes('type=recovery')) {
          setUserEmail(session.user.email ?? '')
          setPageState('ready')
        }
      }
    })

    // Kiểm tra URL hash trực tiếp (backup nếu onAuthStateChange miss khi page load nhanh)
    const checkUrlHash = async () => {
      // Hash có thể ở window.location.hash (direct) hoặc đã được React Router xử lý
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace('#', ''))
      const type = params.get('type')
      const accessToken = params.get('access_token')
      const errorCode = params.get('error_code')

      // Trường hợp lỗi trong hash (token hết hạn, invalid)
      if (errorCode || params.get('error')) {
        console.warn('Reset password URL has error:', errorCode)
        setPageState('expired')
        return
      }

      if (type === 'recovery' && accessToken) {
        // Có recovery token hợp lệ, đợi Supabase JS xử lý token và fire event
        // Timeout 1.5s để đợi onAuthStateChange fire trước
        await new Promise((resolve) => setTimeout(resolve, 1500))
        
        // Nếu vẫn đang verifying sau 1.5s, check session manually
        setPageState((current) => {
          if (current === 'verifying') {
            // onAuthStateChange chưa fire, check session manually
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                setUserEmail(session.user.email ?? '')
                setPageState('ready')
              } else {
                setPageState('expired')
              }
            })
          }
          return current
        })
      } else if (!accessToken && !hash.includes('access_token')) {
        // Không có token trong URL → truy cập trực tiếp không qua email link
        await new Promise((resolve) => setTimeout(resolve, 500))
        setPageState('expired')
      }
    }

    void checkUrlHash()

    return () => {
      subscription.unsubscribe()
    }
  }, [])


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setPageState('loading')

    try {
      const supabase = getSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      setPageState('success')

      // Xóa credentials đã lưu (vì mật khẩu đã thay đổi)
      localStorage.removeItem('bofin_saved_credentials')

      // Đăng xuất session recovery, buộc đăng nhập lại với mật khẩu mới
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
      }, 3000)
    } catch (err) {
      setPageState('ready')
      const msg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.'

      if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('at least')) {
        setError('Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự với chữ hoa, chữ số và ký tự đặc biệt.')
      } else if (msg.toLowerCase().includes('same password') || msg.toLowerCase().includes('different')) {
        setError('Mật khẩu mới phải khác mật khẩu cũ.')
      } else {
        setError('Có lỗi xảy ra. Vui lòng thử lại hoặc yêu cầu link mới.')
      }
    }
  }

  return (
    <AuroraBackground>
      <div className="flex min-h-full w-full flex-col items-center justify-between gap-3">
        <div className="flex w-full flex-shrink-0 flex-col items-center gap-4 pt-14 sm:pt-16">
          <BrandBadge />
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 py-4">
          <div className="w-full max-w-lg rounded-3xl shadow-lg bg-white p-6 sm:p-8">

            {/* ── VERIFYING ─────────────────────────────────── */}
            {pageState === 'verifying' && (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
                <p className="text-sm text-slate-500">Đang xác thực link đặt lại mật khẩu...</p>
              </div>
            )}

            {/* ── EXPIRED / INVALID ─────────────────────────── */}
            {pageState === 'expired' && (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
                  <FaExclamationCircle className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Link không hợp lệ</h2>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.
                    <br />
                    Link chỉ có hiệu lực trong <strong>60 phút</strong>.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-2 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            )}

            {/* ── SUCCESS ───────────────────────────────────── */}
            {pageState === 'success' && (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
                  <div className="absolute inset-2 rounded-full bg-emerald-100" />
                  <FaCheckCircle className="relative h-10 w-10 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Mật khẩu đã được đặt lại!</h2>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    Mật khẩu của bạn đã được cập nhật thành công.
                    <br />
                    Đang chuyển về trang đăng nhập...
                  </p>
                </div>
                {/* Progress bar đếm ngược */}
                <div className="w-full rounded-full bg-slate-100 overflow-hidden h-1.5">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 animate-[shrink_3s_linear_forwards]" style={{ width: '100%' }} />
                </div>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white shadow-md"
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}

            {/* ── FORM (ready / loading) ─────────────────────── */}
            {(pageState === 'ready' || pageState === 'loading') && (
              <>
                {/* Header */}
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 shadow-sm">
                    <FaShieldAlt className="h-6 w-6 text-sky-500" />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-slate-800">Đặt lại mật khẩu</h1>
                    {userEmail && (
                      <p className="mt-1 text-xs text-slate-400 break-all">
                        Tài khoản: <span className="font-medium text-sky-600">{userEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <FaLock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Mật khẩu mới"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        disabled={pageState === 'loading'}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  {/* Confirm password */}
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <FaLock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className={`block w-full rounded-2xl border bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-300 focus:ring-red-400'
                          : 'border-slate-200 focus:ring-sky-500'
                      }`}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      disabled={pageState === 'loading'}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirm ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 -mt-1 ml-1">Mật khẩu không khớp</p>
                  )}

                  <button
                    id="reset-password-btn"
                    type="submit"
                    disabled={pageState === 'loading' || !password || !confirmPassword}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pageState === 'loading' ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Đang cập nhật...</span>
                      </>
                    ) : (
                      <span>Xác nhận đặt lại mật khẩu</span>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-center pb-4">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            ← Quay lại đăng nhập
          </button>
        </div>
      </div>
    </AuroraBackground>
  )
}

export default ResetPasswordPage
