import { useState, useRef, useEffect } from 'react'
import { FaEdit, FaTrash, FaCalculator, FaExchangeAlt } from 'react-icons/fa'
import type { WalletRecord } from '../../lib/walletService'

type WalletCardItemProps = {
  wallet: WalletRecord
  colors: {
    bg: string
    border: string
    text: string
    badge: string
    shadow: string
  }
  isNegative: boolean
  totalBalanceWalletIds: string[]
  availableWalletsCount: number
  onEdit: (wallet: WalletRecord) => void
  onDelete: (id: string) => void
  onToggleActive: (wallet: WalletRecord) => void
  onToggleTotalBalance: (wallet: WalletRecord) => void
  onTransfer: (wallet: WalletRecord) => void
  formatCurrency: (value: number) => string
  formatDate: (dateString: string) => string
}

const WalletLogo = ({ className = 'h-32 w-32' }: { className?: string }) => (
  <div className="absolute right-2 top-16 -translate-y-16 z-0 opacity-15">
    <img
      src="/logo-nontext.png"
      alt="BO.fin Logo"
      className={className}
    />
  </div>
)

export const WalletCardItem = ({
  wallet,
  colors,
  isNegative,
  totalBalanceWalletIds,
  availableWalletsCount,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleTotalBalance,
  onTransfer,
  formatCurrency,
  formatDate,
}: WalletCardItemProps) => {
  const [isLongPressed, setIsLongPressed] = useState(false)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasLongPressRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  // Handle click outside to close
  useEffect(() => {
    if (!isLongPressed) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsLongPressed(false)
        wasLongPressRef.current = false
      }
    }

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isLongPressed])

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    wasLongPressRef.current = false
    longPressTimerRef.current = window.setTimeout(() => {
      wasLongPressRef.current = true
      setIsLongPressed(true)
    }, 500)
  }

  const handleLongPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    // Only cancel timer if long press hasn't been activated yet
    if (longPressTimerRef.current && !wasLongPressRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    // Don't auto-hide if long press was successful - keep it visible
  }

  const handleLongPressCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    // Only cancel if long press hasn't been activated
    if (!wasLongPressRef.current) {
      wasLongPressRef.current = false
      setIsLongPressed(false)
    }
  }

  const handleTransferClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLongPressed(false)
    wasLongPressRef.current = false
    onTransfer(wallet)
  }

  return (
    <div className="relative" ref={cardRef}>
      <div
        className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${colors.bg} p-5 ring-2 ${colors.border} ${colors.shadow} ring-1 transition-all duration-300 ${!wallet.is_active ? 'opacity-60' : ''}`}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressCancel}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressCancel}
      >
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
          <WalletLogo className="h-32 w-32 object-contain" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Top section */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`truncate text-lg font-bold ${colors.text}`}>{wallet.name}</h3>
                {!wallet.is_active && (
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white/80 backdrop-blur-sm">
                    Đã ẩn
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm font-medium ${colors.text} opacity-70`}>{wallet.type}</p>
              <p className={`mt-2 text-2xl font-bold ${isNegative ? 'text-red-300' : colors.text}`}>
                {formatCurrency(wallet.balance)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(wallet)}
                className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <FaEdit className="h-5 w-5" />
              </button>
              <button
                onClick={() => onDelete(wallet.id)}
                className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-red-300"
              >
                <FaTrash className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Description section - luôn có không gian */}
          <div className="mt-3 min-h-[2.5rem]">
            <div className="flex items-start justify-between gap-2">
              {wallet.description ? (
                <p className={`flex-1 line-clamp-2 text-xs leading-relaxed ${colors.text} opacity-60`}>
                  {wallet.description}
                </p>
              ) : (
                <div className="flex-1 h-10"></div>
              )}
              <span className={`shrink-0 text-[10px] font-medium ${colors.text} opacity-60`}>
                Ngày tạo ví: {formatDate(wallet.created_at)}
              </span>
            </div>
          </div>

          {/* Bottom section */}
          <div className={`mt-auto flex items-center justify-between border-t ${colors.text} border-opacity-20 pt-4`}>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleActive(wallet)
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${wallet.is_active
                  ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  : 'bg-sky-500/50 text-white hover:bg-sky-500/70 backdrop-blur-sm'
                  }`}
              >
                {wallet.is_active ? 'Ẩn ví' : 'Hiện ví'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Icon chọn ví vào tổng số dư */}
              {wallet.is_active && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTotalBalance(wallet)
                  }}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${totalBalanceWalletIds.includes(wallet.id)
                    ? 'bg-sky-400/90 text-white shadow-lg hover:bg-sky-400'
                    : 'bg-white/20 text-white/80 hover:bg-white/30 hover:text-white backdrop-blur-sm'
                    }`}
                  title={totalBalanceWalletIds.includes(wallet.id) ? 'Đã chọn vào tổng số dư' : 'Chọn vào tổng số dư'}
                >
                  <FaCalculator className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">
                    {totalBalanceWalletIds.includes(wallet.id) ? 'Đã tính tổng số dư' : 'Tính tổng số dư'}
                  </span>
                </button>
              )}
              <span className={`text-xs font-medium ${colors.text} opacity-70`}>{wallet.currency}</span>
            </div>
          </div>
        </div>

        {/* Transfer button overlay - appears in center when long pressed */}
        {isLongPressed && wallet.is_active && availableWalletsCount > 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/20 backdrop-blur-sm">
            <button
              onClick={handleTransferClick}
              className="rounded-full px-8 py-4 text-base font-bold bg-green-500 text-white hover:bg-green-600 backdrop-blur-sm transition-all shadow-2xl flex items-center gap-3 transform hover:scale-105 active:scale-95"
              title="Chuyển đổi số dư"
            >
              <FaExchangeAlt className="h-5 w-5" />
              <span>Chuyển đổi</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


