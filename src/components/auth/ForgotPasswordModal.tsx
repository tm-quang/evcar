import { useState, type FormEvent } from 'react'
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaPaperPlane, FaTimes } from 'react-icons/fa'
import { getSupabaseClient } from '../../lib/supabaseClient'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

type ModalState = 'idle' | 'loading' | 'success'

export const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState(initialEmail)
  const [state, setState] = useState<ModalState>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setState('loading')

    try {
      const supabase = getSupabaseClient()
      const redirectTo = `${window.location.origin}/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      )

      if (resetError) {
        throw resetError
      }

      setState('success')
    } catch (err) {
      setState('idle')
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.'

      // Translate common errors
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setError('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.')
      } else if (msg.toLowerCase().includes('invalid email') || msg.toLowerCase().includes('email format')) {
        setError('Địa chỉ email không hợp lệ.')
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.')
      } else {
        // Không tiết lộ email có tồn tại hay không (bảo mật)
        // Vẫn show success để tránh email enumeration attack
        setState('success')
      }
    }
  }

  const handleClose = () => {
    onClose()
    // Reset sau khi animation close xong
    setTimeout(() => {
      setState('idle')
      setError('')
      if (!initialEmail) setEmail('')
    }, 300)
  }

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal card */}
      <div
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header gradient bar */}

        <div className="px-6 pb-8 pt-5">
          {/* Close button (desktop) */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
            aria-label="Đóng"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>

          {/* ── SUCCESS STATE ─────────────────────────────── */}
          {state === 'success' ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              {/* Animated success icon */}
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
                <div className="absolute inset-2 rounded-full bg-emerald-100" />
                <FaCheckCircle className="relative h-10 w-10 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800">Email đã được gửi!</h2>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Chúng tôi đã gửi link đặt lại mật khẩu đến
                </p>
                <p className="mt-1 font-semibold text-sky-600 break-all">{email}</p>
                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  Kiểm tra hộp thư đến (và thư mục Spam). Link có hiệu lực trong <strong>60 phút</strong>.
                </p>
              </div>

              <div className="w-full space-y-2.5 mt-2">
                <button
                  onClick={() => { setState('idle'); setError('') }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Gửi lại email khác
                </button>
                <button
                  onClick={handleClose}
                  className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </div>
          ) : (
            /* ── FORM STATE ───────────────────────────────── */
            <>
              {/* Icon + Title */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 shadow-inner">
                  <FaEnvelope className="h-6 w-6 text-sky-500" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">Quên mật khẩu?</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Nhập email đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
                  </p>
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
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <FaEnvelope className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Nhập địa chỉ Email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    disabled={state === 'loading'}
                  />
                </div>

                {/* Action buttons */}
                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={state === 'loading' || !email.trim()}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-sky-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === 'loading' ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="h-3.5 w-3.5" />
                      <span>Đặt lại mật khẩu</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                >
                  <FaArrowLeft className="h-3 w-3" />
                  Quay lại đăng nhập
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
