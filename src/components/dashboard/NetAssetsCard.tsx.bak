import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaWallet, FaEye, FaEyeSlash, FaChevronRight } from 'react-icons/fa'
import { getTotalBalanceWalletIds, fetchWallets } from '../../lib/walletService'
import { fetchTransactions } from '../../lib/transactionService'

type NetAssetsCardProps = {
  className?: string
  refreshTrigger?: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

// Component logo mờ để tái sử dụng
const WalletLogo = ({ className = 'h-36 w-36' }: { className?: string }) => (
  <div className="absolute right-3 top-14 -translate-y-12 z-0 opacity-15">
    <img 
      src="/logo-nontext.png" 
      alt="BO.fin Logo" 
      className={className}
    />
  </div>
)

export const NetAssetsCard = ({ className = '', refreshTrigger = 0 }: NetAssetsCardProps) => {
  const navigate = useNavigate()
  const [totalBalance, setTotalBalance] = useState(0)
  const [income, setIncome] = useState(0)
  const [expense, setExpense] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isBalanceHidden, setIsBalanceHidden] = useState(true) // Mặc định ẩn số dư

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Lấy danh sách ví được chọn
        const walletIds = await getTotalBalanceWalletIds()

        // Load wallets
        const wallets = await fetchWallets()
        const selectedWallets = wallets.filter((w) => walletIds.includes(w.id))
        
        // Lấy tất cả giao dịch từ các ví được chọn (chỉ lấy những giao dịch không bị exclude)
        const allTransactions = await fetchTransactions({ exclude_from_reports: false })
        const selectedTransactions = allTransactions.filter((t) =>
          walletIds.includes(t.wallet_id)
        )

        // Tính thu nhập và chi tiêu từ các ví được chọn
        const totalIncome = selectedTransactions
          .filter((t) => t.type === 'Thu')
          .reduce((sum, t) => sum + t.amount, 0)
        const totalExpense = selectedTransactions
          .filter((t) => t.type === 'Chi')
          .reduce((sum, t) => sum + t.amount, 0)

        // Tính tổng số dư từ balance của các ví được chọn
        // Balance trong database đã được trigger cập nhật = initial_balance + income - expense
        // Vậy tổng số dư = tổng balance của các ví được chọn
        // Điều này đảm bảo hiển thị đúng số dư (có thể âm nếu chi tiêu > thu nhập)
        // Lưu ý: Balance có thể âm nếu chi tiêu lớn hơn thu nhập + số dư ban đầu
        const total = selectedWallets.reduce((sum, w) => {
          const balance = w.balance ?? 0
          return sum + balance
        }, 0)
        setTotalBalance(total)

        setIncome(totalIncome)
        setExpense(totalExpense)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('Error loading total balance data:', errorMessage, error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [refreshTrigger])

  return (
    <div className={className}>
      <div className="relative">
        <div className="relative h-[14rem] w-full overflow-visible rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-5 ring-2 ring-blue-400/50 shadow-lg shadow-blue-900/30 transition-all duration-300">
          {/* Decorative patterns - Kiểu ATM card hiện đại */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {/* Geometric patterns - Blur circles */}
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"></div>
            <div className="absolute -right-8 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-xl"></div>
            <div className="absolute right-0 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-lg"></div>
            <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-2xl"></div>
            
            {/* Wave patterns - Đường viền mờ dưới nền */}
            <svg className="absolute bottom-0 left-0 w-full opacity-15" viewBox="0 0 400 180" preserveAspectRatio="none">
              <path
                d="M0,120 Q100,60 200,120 T400,120 L400,180 L0,180 Z"
                fill="white"
              />
              <path
                d="M0,150 Q150,90 300,150 T400,150 L400,180 L0,180 Z"
                fill="white"
                opacity="0.6"
              />
            </svg>
            
            {/* Thêm đường viền mờ thứ 2 */}
            <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 400 180" preserveAspectRatio="none">
              <path
                d="M0,100 Q120,40 240,100 T400,100 L400,180 L0,180 Z"
                fill="white"
                opacity="0.5"
              />
            </svg>
            
            {/* Thêm đường viền mờ thứ 3 */}
            <svg className="absolute bottom-0 left-0 w-full opacity-8" viewBox="0 0 400 180" preserveAspectRatio="none">
              <path
                d="M0,130 Q80,70 160,130 T400,130 L400,180 L0,180 Z"
                fill="white"
                opacity="0.4"
              />
            </svg>

            {/* Logo mờ ở giữa 1/3 bên phải */}
            <WalletLogo className="h-24 w-24 object-contain sm:h-32 sm:w-32" />
          </div>

          {/* Card content */}
          <div className="relative z-10 flex h-[11.5rem] flex-col justify-between text-white">
            {/* Top section */}
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Icon wallet - Clickable to navigate to Wallets page */}
                <button
                  onClick={() => navigate('/wallets')}
                  className="rounded-xl bg-white/20 p-2 backdrop-blur-sm shrink-0 transition-all hover:bg-white/30 hover:scale-110 active:scale-95 cursor-pointer"
                  title="Xem tất cả ví"
                  aria-label="Mở trang Ví"
                >
                  <FaWallet className="h-5 w-5 text-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-bold uppercase tracking-widest text-white/90 sm:text-xs">
                    TỔNG SỐ DƯ
                  </p>
                  <p className="truncate text-[11px] font-medium text-white/80">
                    Tiền mặt + Ngân hàng
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xl font-semibold text-amber-300 sm:text-xs">BO.fin</span>
                
                {/* Pulsing circle with ripple effect */}
                <div className="relative flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
                  {/* Ripple waves - 3 layers for smooth effect */}
                  <div className="absolute h-full w-full rounded-full bg-white/40 ripple-wave" />
                  <div className="absolute h-full w-full rounded-full bg-white/30 ripple-wave-delay-1" />
                  <div className="absolute h-full w-full rounded-full bg-white/20 ripple-wave-delay-2" />
                  {/* Center circle with glow */}
                  <div className="relative z-10 h-3 w-3 rounded-full bg-white pulse-glow sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="mt-3 min-w-0">
              <div className="flex items-center gap-2">
                <p 
                  className="truncate text-3xl font-bold tracking-tight sm:text-3xl cursor-pointer select-none"
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  title={isBalanceHidden ? 'Nhấn để hiện số dư' : 'Nhấn để ẩn số dư'}
                >
                  {isLoading ? '...' : isBalanceHidden ? '******' : formatCurrency(totalBalance)}
                </p>
                <button
                  onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                  className="shrink-0 rounded-full p-1.5 hover:bg-white/10 transition"
                  title={isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư'}
                >
                  {isBalanceHidden ? (
                    <FaEyeSlash className="h-5 w-5 text-white/70" />
                  ) : (
                    <FaEye className="h-5 w-5 text-white/70" />
                  )}
                </button>
                <button
                  onClick={() => navigate('/wallets')}
                  className="ml-auto shrink-0 rounded-full shadow-md bg-white/30 p-2 backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110 active:scale-95 cursor-pointer"
                  title="Quản lý ví"
                  aria-label="Mở trang Quản lý ví"
                >
                  <FaChevronRight className="h-5 w-5 text-white" />
                </button>
              </div>
              <p className="mt-1 text-xs text-white">
                Số tiền có thể sử dụng
              </p>
            </div>

            {/* Bottom section - Income and Expense */}
            <div className="mt-auto flex items-start justify-between gap-3 border-t border-white/20 pt-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 sm:text-[10px]">Thu nhập</p>
                <p className="mt-1 break-words text-sm font-bold leading-tight sm:text-base">
                  {isLoading ? '...' : isBalanceHidden ? '******' : formatCurrency(income || 0)}
                </p>
              </div>
              <div className="h-12 w-px shrink-0 bg-white/20" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm text-white/70 sm:text-[10px]">Chi tiêu</p>
                <p className="mt-1 break-words text-sm font-bold leading-tight sm:text-base">
                  {isLoading ? '...' : isBalanceHidden ? '******' : formatCurrency(expense || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
