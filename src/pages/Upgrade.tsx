import {
  LuCheck,
  LuZap
} from 'react-icons/lu'
import { useAppearance } from '../contexts/AppearanceContext'
import HeaderBar from '../components/layout/HeaderBar'
import { useNotification } from '../contexts/notificationContext.helpers'

const UpgradePage = () => {
  const { isDarkMode } = useAppearance()
  const { success } = useNotification()

  const cardClass = isDarkMode
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200 shadow-xl'

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900'
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500'

  const features = [
    { name: 'Đầy đủ chức năng sạc & chi phí', free: true, premium: true },
    { name: 'Báo cáo chi tiết Excel/PDF', free: false, premium: true },
    { name: 'Đồng bộ & Sao lưu Cloud không giới hạn', free: false, premium: true },
    { name: 'Phân tích xu hướng & Tiết kiệm', free: false, premium: true },
    { name: 'Bản đồ trạm sạc thông minh', free: false, premium: true },
    { name: 'Dung lượng lưu trữ hình ảnh', free: '100MB', premium: 'Không giới hạn' },
    { name: 'Hỗ trợ ưu tiên 24/7', free: false, premium: true },
  ]

  const handleUpgrade = () => {
    success('Cảm ơn bạn! Tính năng thanh toán đang được tích hợp.')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: 'var(--app-home-bg)' }}>
      <HeaderBar variant="page" title="Nâng cấp phiên bản" />

      <main className="flex-1 overflow-y-auto p-4 pb-12">
        <div className="mx-auto max-w-md space-y-6">

          {/* Hero Section */}
          <div className="text-center space-y-2 py-4">
            <h2 className={`text-3xl font-black ${textPrimary}`}>Mở khóa sức mạnh</h2>
            <p className={`text-sm font-medium ${textSecondary}`}>Nâng tầm trải nghiệm xe điện của bạn với phiên bản Premium</p>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-4">

            {/* Free Plan */}
            <div className={`relative overflow-hidden rounded-3xl border-2 p-6 transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-300 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-lg font-bold ${textPrimary}`}>Miễn phí</h3>
                  <p className={`text-xs ${textSecondary}`}>Dành cho người mới bắt đầu</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  Hiện tại
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-3xl font-black ${textPrimary}`}>0đ</span>
                <span className={`text-xs font-bold ${textSecondary}`}>/ tháng</span>
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`relative overflow-hidden rounded-3xl border-4 border-blue-500 p-6 shadow-md transition-all scale-[1.02] ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="absolute top-0 right-0 rounded-bl-2xl bg-blue-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                Khuyên dùng
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`text-xl font-black ${textPrimary}`}>Premium</h3>
                  <LuZap className="h-4 w-4 text-blue-500 fill-blue-500" />
                </div>
                <p className={`text-xs font-medium ${textSecondary}`}>Đầy đủ tính năng & Không giới hạn</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-blue-500">30.000đ</span>
                <span className={`text-xs font-bold ${textSecondary}`}>/ tháng</span>
              </div>

              <button
                onClick={handleUpgrade}
                className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
              >
                NÂNG CẤP NGAY
              </button>
            </div>
          </div>

          {/* Feature Comparison List */}
          <div className={`rounded-3xl border p-6 ${cardClass}`}>
            <h4 className={`mb-6 text-sm font-black uppercase tracking-widest ${textPrimary}`}>So sánh tính năng</h4>
            <div className="space-y-5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{feature.name}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? <LuCheck className="h-4 w-4 text-green-500" /> : <span className="text-slate-400 font-bold">X</span>
                      ) : (
                        <span className="text-[10px] font-black text-slate-400">{feature.free}</span>
                      )}
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col items-center gap-1">
                      {typeof feature.premium === 'boolean' ? (
                        <LuCheck className="h-4 w-4 text-blue-500 stroke-[3px]" />
                      ) : (
                        <span className="text-[10px] font-black text-blue-500">{feature.premium}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Note */}
          <div className={`rounded-2xl p-4 text-center text-[10px] font-medium ${textSecondary}`}>
            <p>Thanh toán an toàn qua chuyển khoản hoặc ví điện tử.</p>
          </div>

        </div>
      </main>
    </div>
  )
}

export default UpgradePage
