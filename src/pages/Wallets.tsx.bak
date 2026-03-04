import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { FaPlus, FaWallet, FaCalculator, FaEdit, FaTrash, FaChevronDown, FaCheck } from 'react-icons/fa'
import { useDataPreloader } from '../hooks/useDataPreloader'

import FooterNav from '../components/layout/FooterNav'
import HeaderBar from '../components/layout/HeaderBar'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import { WalletListSkeleton } from '../components/skeletons'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { LoadingRing } from '../components/ui/LoadingRing'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { WalletTransferModal } from '../components/wallets/WalletTransferModal'
import { WalletCardItem } from '../components/wallets/WalletCardItem'
import {
  fetchWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  getTotalBalanceWalletIds,
  setTotalBalanceWalletIds,
  type WalletRecord,
  type WalletType,
} from '../lib/walletService'
import { getLatestBalanceHistory, createBalanceHistory } from '../lib/walletBalanceHistoryService'
import { transferWalletBalance } from '../lib/walletTransferService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import { formatVNDInput, parseVNDInput } from '../utils/currencyInput'


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Component logo mờ để tái sử dụng
const WalletLogo = ({ className = 'h-32 w-32' }: { className?: string }) => (
  <div className="absolute right-2 top-16 -translate-y-16 z-0 opacity-15">
    <img
      src="/logo-nontext.png"
      alt="BO.fin Logo"
      className={className}
    />
  </div>
)

const WALLET_TYPES: WalletType[] = ['Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác']

// Màu sắc theo loại ví - Nâng cấp với gradient đẹp hơn, hiện đại hơn, màu đậm hơn
const getWalletTypeColors = (type: WalletType) => {
  const colors = {
    'Tiền mặt': {
      bg: 'from-slate-900 via-slate-800 to-slate-950', // Gradient 3 màu đậm hơn nữa
      border: 'border-slate-400/50',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: 'shadow-xl shadow-black/20',
    },
    'Ngân hàng': {
      bg: 'from-blue-700 via-blue-800 to-indigo-900', // Gradient xanh dương đậm hơn nữa
      border: 'border-blue-400/50',
      text: 'text-white',
      badge: 'bg-blue-500',
      shadow: 'shadow-xl shadow-black/20',
    },
    'Tiết kiệm': {
      bg: 'from-emerald-700 via-teal-800 to-cyan-900', // Gradient xanh lá đậm hơn nữa
      border: 'border-emerald-400/50',
      text: 'text-white',
      badge: 'bg-emerald-500',
      shadow: 'shadow-xl shadow-black/20',
    },
    'Tín dụng': {
      bg: 'from-purple-700 via-violet-800 to-fuchsia-900', // Gradient tím đậm hơn nữa
      border: 'border-purple-400/50',
      text: 'text-white',
      badge: 'bg-purple-500',
      shadow: 'shadow-xl shadow-black/20',
    },
    'Đầu tư': {
      bg: 'from-amber-700 via-orange-800 to-rose-900', // Gradient vàng cam đậm hơn nữa
      border: 'border-amber-400/50',
      text: 'text-white',
      badge: 'bg-amber-500',
      shadow: 'shadow-xl shadow-black/20',
    },
    'Khác': {
      bg: 'from-slate-800 via-gray-900 to-slate-950', // Gradient xám đậm hơn nữa
      border: 'border-slate-400/50',
      text: 'text-white',
      badge: 'bg-slate-500',
      shadow: 'shadow-xl shadow-black/20',
    },
  }
  return colors[type] || colors['Khác']
}

export const WalletsPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const { showDialog } = useDialog()
  useDataPreloader() // Preload data khi vào trang
  const [wallets, setWallets] = useState<WalletRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingInactive, setIsLoadingInactive] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null)
  const [totalBalanceWalletIds, setTotalBalanceWalletIdsState] = useState<string[]>([])
  const [showHiddenWallets, setShowHiddenWallets] = useState(false)
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWalletTypeDropdownOpen, setIsWalletTypeDropdownOpen] = useState(false)
  const walletTypeButtonRef = useRef<HTMLButtonElement>(null)
  const walletTypeDropdownRef = useRef<HTMLDivElement>(null)
  const [walletTypeDropdownPosition, setWalletTypeDropdownPosition] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  }>({ top: 0, left: 0, width: 0, maxHeight: 400 })
  const [transferModal, setTransferModal] = useState<{
    isOpen: boolean
    sourceWallet: WalletRecord | null
  }>({
    isOpen: false,
    sourceWallet: null,
  })
  const [confirmToggleBalance, setConfirmToggleBalance] = useState<{
    isOpen: boolean
    wallet: WalletRecord | null
    isEnabling: boolean
  }>({
    isOpen: false,
    wallet: null,
    isEnabling: false,
  })
  const [confirmSyncBalance, setConfirmSyncBalance] = useState<{
    isOpen: boolean
    wallet: WalletRecord | null
    oldBalance: number
    newBalance: number
  }>({
    isOpen: false,
    wallet: null,
    oldBalance: 0,
    newBalance: 0,
  })
  const [balanceHistory, setBalanceHistory] = useState<{
    oldBalance: number | null
    historyId: string | null
  }>({
    oldBalance: null,
    historyId: null,
  })
  const [formData, setFormData] = useState({
    name: '',
    type: 'Tiền mặt' as WalletType,
    balance: '',
    currency: 'VND',
    description: '',
  })

  useEffect(() => {
    // Chỉ load một lần khi mount, cache sẽ được sử dụng
    // Nếu đã preload, dữ liệu sẽ lấy từ cache ngay lập tức
    loadWallets().catch((error) => {
      console.error('Error loading wallets on mount:', error)
      // Error already handled in loadWallets
    })
  }, []) // Chỉ load một lần, cache sẽ được sử dụng cho các lần sau

  const loadWallets = async () => {
    setIsLoading(true)
    try {
      // Tối ưu: Load song song các operations không phụ thuộc
      // Load active wallets trước để hiển thị nhanh, sau đó load inactive
      const [activeWallets, totalBalanceIds] = await Promise.all([
        fetchWallets(false), // Load active wallets trước (nhanh hơn)
        getTotalBalanceWalletIds().catch(() => []), // Load total balance wallet ids từ database (có cache)
      ])

      // Hiển thị active wallets ngay lập tức (progressive loading)
      setWallets(activeWallets)
      setIsLoading(false) // Cho phép hiển thị ngay

      // Xử lý total balance wallet ids
      setTotalBalanceWalletIdsState(totalBalanceIds)

      // Load inactive wallets trong background (không block UI)
      setIsLoadingInactive(true)
      fetchWallets(true)
        .then((allWallets) => {
          // Chỉ cập nhật nếu có thay đổi (có inactive wallets)
          if (allWallets.length !== activeWallets.length) {
            setWallets(allWallets)
          }
        })
        .catch((error) => {
          console.error('Error loading inactive wallets:', error)
          // Không ảnh hưởng đến UI, vì active wallets đã hiển thị
        })
        .finally(() => {
          setIsLoadingInactive(false)
        })
    } catch (error) {
      console.error('Error loading wallets:', error)
      setIsLoading(false)
    }
  }

  const handleOpenForm = async (wallet?: WalletRecord) => {
    if (wallet) {
      setEditingWallet(wallet)
      setFormData({
        name: wallet.name,
        type: wallet.type,
        balance: formatVNDInput(wallet.balance.toString()), // Format với phần nghìn
        currency: wallet.currency,
        description: wallet.description || '',
      })
      // Load lịch sử số dư gần nhất để có thể hoàn tác
      try {
        const latestHistory = await getLatestBalanceHistory(wallet.id)
        if (latestHistory) {
          setBalanceHistory({
            oldBalance: latestHistory.old_balance,
            historyId: latestHistory.id,
          })
        } else {
          setBalanceHistory({ oldBalance: null, historyId: null })
        }
      } catch (error) {
        console.error('Error loading balance history:', error)
        setBalanceHistory({ oldBalance: null, historyId: null })
      }
    } else {
      setEditingWallet(null)
      setFormData({
        name: '',
        type: 'Tiền mặt',
        balance: '',
        currency: 'VND',
        description: '',
      })
      setBalanceHistory({ oldBalance: null, historyId: null })
    }
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingWallet(null)
    setIsNumberPadOpen(false)
    setIsWalletTypeDropdownOpen(false)
  }

  // Lock body scroll when form modal is open
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isFormOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation: Kiểm tra tất cả các trường bắt buộc
    if (!formData.name.trim()) {
      showError('Vui lòng nhập tên ví')
      return
    }

    if (!editingWallet && !formData.type) {
      showError('Vui lòng chọn loại ví')
      return
    }

    const balance = parseVNDInput(formData.balance)
    if (balance <= 0) {
      showError('Vui lòng nhập số dư ban đầu hợp lệ (lớn hơn 0)')
      return
    }

    if (!formData.description.trim()) {
      showError('Vui lòng nhập mô tả cho ví')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingWallet) {
        const oldBalance = editingWallet.balance
        const balanceChanged = oldBalance !== balance

        await updateWallet(editingWallet.id, {
          name: formData.name.trim(),
          balance,
          currency: formData.currency,
          description: formData.description.trim() || undefined,
        })

        // Lưu lịch sử thay đổi số dư nếu có thay đổi
        if (balanceChanged) {
          // Xác định loại thay đổi: sync nếu có balanceHistory.oldBalance (đã đồng bộ), manual nếu không
          const changeType = balanceHistory.oldBalance !== null ? 'sync' : 'manual'

          try {
            await createBalanceHistory({
              wallet_id: editingWallet.id,
              old_balance: oldBalance,
              new_balance: balance,
              change_type: changeType,
              description: changeType === 'sync'
                ? `Đồng bộ số dư từ giao dịch. Số dư cũ: ${oldBalance.toLocaleString('vi-VN')} ₫, Số dư mới: ${balance.toLocaleString('vi-VN')} ₫`
                : `Cập nhật thủ công số dư. Số dư cũ: ${oldBalance.toLocaleString('vi-VN')} ₫, Số dư mới: ${balance.toLocaleString('vi-VN')} ₫`,
            })

            // Cập nhật lịch sử để có thể hoàn tác
            setBalanceHistory({
              oldBalance,
              historyId: null,
            })
          } catch (historyError) {
            // Lỗi lịch sử không ảnh hưởng đến việc cập nhật ví
            console.warn('Không thể lưu lịch sử số dư (có thể do RLS policy chưa được cấu hình):', historyError)
          }
        }

        success('Đã cập nhật ví thành công!')
      } else {
        await createWallet({
          name: formData.name.trim(),
          type: formData.type,
          balance,
          currency: formData.currency,
          description: formData.description.trim() || undefined,
        })
        success('Đã tạo ví mới thành công!')
      }
      await loadWallets()
      handleCloseForm()
    } catch (error) {
      console.error('Error saving wallet:', error)
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Không thể lưu ví. Vui lòng thử lại.'
      showError(errorMessage || 'Không thể lưu ví. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Kiểm tra xem ví có giao dịch không để hiển thị cảnh báo chính xác
    try {
      const { fetchTransactions } = await import('../lib/transactionService')
      const transactions = await fetchTransactions({ wallet_id: id })
      const transactionCount = transactions.length

      const wallet = wallets.find((w) => w.id === id)
      const walletName = wallet?.name || 'ví này'

      await showDialog({
        message: transactionCount > 0
          ? `Xóa ví "${walletName}" và ${transactionCount} giao dịch liên quan?\n\n` +
          `⚠️ Xóa vĩnh viễn, không thể phục hồi`
          : `Xóa ví "${walletName}"?\n\n` +
          `⚠️ Xóa vĩnh viễn, không thể phục hồi`,
        type: 'error',
        title: 'Xóa ví',
        confirmText: 'Đồng ý xóa',
        cancelText: 'Hủy bỏ',
        middleText: 'Ẩn ví',
        onConfirm: async () => {
          try {
            // Hard delete: xóa ví và tất cả giao dịch (do ON DELETE CASCADE)
            await deleteWallet(id, true)
            if (transactionCount > 0) {
              success(`Đã xóa ví "${walletName}" và ${transactionCount} giao dịch liên quan!`)
            } else {
              success(`Đã xóa ví "${walletName}"!`)
            }
            await loadWallets()
          } catch (error) {
            console.error('Error deleting wallet:', error)
            showError('Không thể xóa ví. Vui lòng thử lại.')
          }
        },
        onMiddle: async () => {
          // Soft delete: chỉ ẩn ví, giữ lại giao dịch
          try {
            await deleteWallet(id, false)
            success(`Đã ẩn ví "${walletName}"!`)
            await loadWallets()
          } catch (error) {
            console.error('Error hiding wallet:', error)
            showError('Không thể ẩn ví. Vui lòng thử lại.')
          }
        },
      })
    } catch (error) {
      console.error('Error checking transactions:', error)
      // Fallback: vẫn cho phép xóa với cảnh báo
      await showDialog({
        message: `Xóa ví?\n\n⚠️ Xóa vĩnh viễn, không thể phục hồi`,
        type: 'error',
        title: 'Xóa ví',
        confirmText: 'Đồng ý xóa',
        cancelText: 'Hủy bỏ',
        middleText: 'Ẩn ví',
        onConfirm: async () => {
          try {
            await deleteWallet(id, true)
            success('Đã xóa ví!')
            await loadWallets()
          } catch (error) {
            console.error('Error deleting wallet:', error)
            showError('Không thể xóa ví. Vui lòng thử lại.')
          }
        },
        onMiddle: async () => {
          try {
            await deleteWallet(id, false)
            success('Đã ẩn ví!')
            await loadWallets()
          } catch (error) {
            console.error('Error hiding wallet:', error)
            showError('Không thể ẩn ví. Vui lòng thử lại.')
          }
        },
      })
    }
  }

  const handleToggleActive = async (wallet: WalletRecord) => {
    try {
      await updateWallet(wallet.id, { is_active: !wallet.is_active })
      if (wallet.is_active) {
        success(`Đã ẩn ví "${wallet.name}". Ví này sẽ không hiển thị và không được tính vào số dư.`)
      } else {
        success(`Đã khôi phục ví "${wallet.name}". Ví này đã có thể sử dụng lại.`)
      }
      await loadWallets()
    } catch (error) {
      console.error('Error toggling wallet:', error)
      showError('Không thể thay đổi trạng thái ví')
    }
  }

  const handleToggleTotalBalance = (wallet: WalletRecord) => {
    const isSelected = totalBalanceWalletIds.includes(wallet.id)
    // Mở modal xác nhận
    setConfirmToggleBalance({
      isOpen: true,
      wallet,
      isEnabling: !isSelected, // true nếu đang bật, false nếu đang tắt
    })
  }

  const handleConfirmToggleBalance = async () => {
    if (!confirmToggleBalance.wallet) return

    try {
      const wallet = confirmToggleBalance.wallet
      const isSelected = totalBalanceWalletIds.includes(wallet.id)
      let newSelectedIds: string[]

      if (isSelected) {
        // Tắt - Bỏ chọn khỏi tổng số dư
        newSelectedIds = totalBalanceWalletIds.filter((id) => id !== wallet.id)
      } else {
        // Bật - Thêm vào danh sách tính tổng số dư
        newSelectedIds = [...totalBalanceWalletIds, wallet.id]
      }

      // Lưu vào SQL database
      await setTotalBalanceWalletIds(newSelectedIds)

      // Invalidate cache để đảm bảo reload dữ liệu mới
      const { queryClient } = await import('../lib/react-query')
      await queryClient.invalidateQueries({ queryKey: ['getTotalBalanceWalletIds'] })

      // Reload lại từ database để đảm bảo dữ liệu mới nhất
      const freshTotalBalanceIds = await getTotalBalanceWalletIds()

      // Cập nhật state với dữ liệu mới nhất từ database
      setTotalBalanceWalletIdsState(freshTotalBalanceIds)

      // Đóng modal
      setConfirmToggleBalance({
        isOpen: false,
        wallet: null,
        isEnabling: false,
      })

      // Hiển thị thông báo thành công
      if (isSelected) {
        success(`Đã tắt tính tổng số dư cho "${wallet.name}"`)
      } else {
        success(`Đã bật tính tổng số dư cho "${wallet.name}"`)
      }
    } catch (error) {
      console.error('Error toggling total balance wallet:', error)
      const message = error instanceof Error ? error.message : 'Không thể cập nhật cài đặt'
      showError(message)
      // Đóng modal nếu có lỗi
      setConfirmToggleBalance({
        isOpen: false,
        wallet: null,
        isEnabling: false,
      })
    }
  }

  const handleOpenTransferModal = (wallet: WalletRecord) => {
    setTransferModal({
      isOpen: true,
      sourceWallet: wallet,
    })
  }

  const handleCloseTransferModal = () => {
    setTransferModal({
      isOpen: false,
      sourceWallet: null,
    })
  }

  const handleTransfer = async (sourceWalletId: string, targetWalletId: string, amount: number) => {
    await transferWalletBalance(sourceWalletId, targetWalletId, amount)
    success(`Đã chuyển đổi ${new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount)} thành công!`)
    await loadWallets()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar variant="page" title="VÍ CỦA BẠN" />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-2 pb-24 sm:pt-2 sm:pb-28">
          {/* Add button */}
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-600 hover:to-blue-700 hover:shadow-xl active:scale-95"
          >
            <FaPlus className="h-5 w-5" />
            Thêm ví mới
          </button>

          {/* Wallets list */}
          {isLoading ? (
            <WalletListSkeleton count={5} />
          ) : wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-lg border border-slate-100">
              <FaWallet className="mb-4 h-16 w-16 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Chưa có ví nào</p>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xs">
                Tạo ví đầu tiên để bắt đầu quản lý tài chính
              </p>
              <div className="mt-4 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 p-4 border border-sky-100 max-w-xs">
                <div className="flex items-start gap-3">
                  <FaCalculator className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-sky-900 mb-1">
                      💡 Tổng số dư
                    </p>
                    <p className="text-xs text-sky-700 leading-relaxed">
                      Sau khi tạo ví, bạn có thể chọn ví vào <span className="font-semibold">"Tổng số dư"</span> để hiển thị trên trang Tổng quan. Số dư từ các ví được chọn sẽ được tính vào tổng tài sản của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Active Wallets */}
              {(() => {
                const activeWallets = wallets.filter((w) => w.is_active)
                return activeWallets.length > 0 ? (
                  <div className="space-y-4">
                    {activeWallets.map((wallet) => {
                      const colors = getWalletTypeColors(wallet.type)
                      const isNegative = wallet.balance < 0
                      const availableWalletsCount = wallets.filter((w) => w.id !== wallet.id && w.is_active).length

                      return (
                        <WalletCardItem
                          key={wallet.id}
                          wallet={wallet}
                          colors={colors}
                          isNegative={isNegative}
                          totalBalanceWalletIds={totalBalanceWalletIds}
                          availableWalletsCount={availableWalletsCount}
                          onEdit={handleOpenForm}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                          onToggleTotalBalance={handleToggleTotalBalance}
                          onTransfer={handleOpenTransferModal}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                        />
                      )
                    })}
                  </div>
                ) : null
              })()}

              {/* Hidden Wallets Section */}
              {(() => {
                const hiddenWallets = wallets.filter((w) => !w.is_active)
                return hiddenWallets.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-600">
                        Ví đã ẩn ({hiddenWallets.length})
                        {isLoadingInactive && (
                          <span className="ml-2 inline-flex items-center">
                            <LoadingRing size="sm" className="mr-1" />
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowHiddenWallets(!showHiddenWallets)}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
                      >
                        {showHiddenWallets ? 'Ẩn' : 'Hiển thị'}
                      </button>
                    </div>
                    {showHiddenWallets && (
                      <div className="space-y-4">
                        {hiddenWallets.map((wallet) => {
                          const colors = getWalletTypeColors(wallet.type)
                          const isNegative = wallet.balance < 0

                          return (
                            <div key={wallet.id} className="relative">
                              <div
                                className={`relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br ${colors.bg} p-5 ring-2 ring-slate-300 opacity-70 transition-all duration-300 ${colors.shadow}`}
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
                                        <span className="shrink-0 rounded-full bg-white/30 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                                          Đã ẩn
                                        </span>
                                      </div>
                                      <p className={`mt-1 text-sm font-medium ${colors.text} opacity-70`}>{wallet.type}</p>
                                      <p className={`mt-2 text-2xl font-bold ${isNegative ? 'text-rose-300' : colors.text}`}>
                                        {formatCurrency(wallet.balance)}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleOpenForm(wallet)}
                                        className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                                      >
                                        <FaEdit className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(wallet.id)}
                                        className="rounded-full p-2 text-white/70 transition hover:bg-white/20 hover:text-rose-300"
                                      >
                                        <FaTrash className="h-5 w-5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Description */}
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
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleActive(wallet)
                                      }}
                                      className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 shadow-sm"
                                    >
                                      Khôi phục
                                    </button>
                                    <span className={`text-xs font-medium ${colors.text} opacity-70`}>{wallet.currency}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>
      </main>

      <FooterNav onAddClick={() => navigate('/add-transaction')} />

      {/* Form Modal - Full Screen */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F9FC] overflow-hidden">
          {/* Header - Sử dụng HeaderBar cho đồng bộ */}
          <HeaderBar
            variant="page"
            title={editingWallet ? 'CHỈNH SỬA VÍ' : 'THÊM VÍ MỚI'}
            onBack={handleCloseForm}
          />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overscroll-contain bg-[#F7F9FC]">
            <div className="mx-auto w-full max-w-md px-4 pt-2 pb-4 sm:px-6 sm:pt-2 sm:pb-5">
              <form onSubmit={handleSubmit} id="wallet-form" className="space-y-4">
                {/* Tên ví */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Tên ví <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-3xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:p-4 sm:text-base"
                    placeholder="Nhập tên ví (ví dụ: Ví chính, Ví tiết kiệm...)"
                    required
                  />
                </div>

                {/* Loại ví - Chỉ hiển thị khi tạo mới */}
                {!editingWallet && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                      Loại ví <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        ref={walletTypeButtonRef}
                        type="button"
                        onClick={() => {
                          if (walletTypeButtonRef.current) {
                            const rect = walletTypeButtonRef.current.getBoundingClientRect()
                            const viewportHeight = window.innerHeight
                            const dropdownHeight = Math.min(300, WALLET_TYPES.length * 64 + 16)
                            const spaceBelow = viewportHeight - rect.bottom
                            const spaceAbove = rect.top

                            let top = rect.bottom + 8
                            let maxHeight = dropdownHeight

                            // If not enough space below, show above
                            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                              top = rect.top - dropdownHeight - 8
                              maxHeight = Math.min(dropdownHeight, spaceAbove - 16)
                            } else {
                              maxHeight = Math.min(dropdownHeight, spaceBelow - 16)
                            }

                            setWalletTypeDropdownPosition({
                              top,
                              left: rect.left,
                              width: rect.width,
                              maxHeight,
                            })
                          }
                          setIsWalletTypeDropdownOpen(!isWalletTypeDropdownOpen)
                        }}
                        className={`flex w-full items-center justify-between rounded-3xl bg-white p-4 text-left transition-all min-h-[64px] shadow-md ${isWalletTypeDropdownOpen
                          ? 'shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/20'
                          : 'hover:shadow-lg'
                          }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className={`h-12 w-12 shrink-0 rounded-3xl bg-gradient-to-br ${getWalletTypeColors(formData.type).bg} flex items-center justify-center shadow-md`}>
                            <FaWallet className="h-6 w-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="text-sm font-bold text-slate-900">{formData.type}</div>
                          </div>
                        </div>
                        <FaChevronDown
                          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isWalletTypeDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isWalletTypeDropdownOpen && typeof document !== 'undefined' && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsWalletTypeDropdownOpen(false)}
                            aria-hidden="true"
                          />

                          <div
                            ref={walletTypeDropdownRef}
                            className="fixed z-[110] rounded-3xl bg-white shadow-2xl overflow-hidden"
                            style={{
                              top: `${Math.max(0, walletTypeDropdownPosition.top)}px`,
                              left: `${Math.max(0, walletTypeDropdownPosition.left)}px`,
                              width: `${Math.max(200, walletTypeDropdownPosition.width || 200)}px`,
                              maxHeight: `${Math.max(200, walletTypeDropdownPosition.maxHeight || 400)}px`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div
                              className="overflow-y-auto overscroll-contain py-2 custom-scrollbar w-full"
                              style={{
                                maxHeight: `${Math.max(184, (walletTypeDropdownPosition.maxHeight || 400) - 16)}px`,
                                WebkitOverflowScrolling: 'touch',
                                minHeight: '200px',
                              }}
                            >
                              {WALLET_TYPES.map((type) => {
                                const colors = getWalletTypeColors(type)
                                const isSelected = formData.type === type
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, type })
                                      setIsWalletTypeDropdownOpen(false)
                                    }}
                                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all hover:scale-[1.02] active:scale-100 ${isSelected
                                      ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 font-semibold'
                                      : 'text-slate-700 hover:bg-slate-50'
                                      }`}
                                  >
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${colors.bg} shadow-sm`}>
                                      <FaWallet className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <div className="text-sm font-medium leading-relaxed break-words">{type}</div>
                                    </div>
                                    {isSelected && (
                                      <FaCheck className="h-5 w-5 shrink-0 text-sky-600 drop-shadow-sm" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                )}

                {/* Số dư */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 sm:text-sm">
                      {editingWallet ? 'Số dư hiện tại' : 'Số dư ban đầu'} <span className="text-rose-500">*</span>
                    </label>
                    {editingWallet && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingWallet) return
                            try {
                              // Tính toán số dư mới trước để hiển thị trong popup
                              const { calculateWalletBalanceFromTransactions } = await import('../lib/walletBalanceService')
                              const initialBalance = editingWallet.initial_balance ?? editingWallet.balance ?? 0
                              const newBalance = await calculateWalletBalanceFromTransactions(editingWallet.id, initialBalance)

                              // Hiển thị popup xác nhận
                              setConfirmSyncBalance({
                                isOpen: true,
                                wallet: editingWallet,
                                oldBalance: editingWallet.balance,
                                newBalance,
                              })
                            } catch (error) {
                              console.error('Error calculating balance:', error)
                              showError('Không thể tính toán số dư. Vui lòng thử lại.')
                            }
                          }}
                          className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline transition"
                        >
                          Đồng bộ từ giao dịch
                        </button>
                        {balanceHistory.oldBalance !== null && balanceHistory.oldBalance !== undefined && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingWallet || balanceHistory.oldBalance === null || balanceHistory.oldBalance === undefined) return

                              // Chỉ cập nhật form, không cập nhật database
                              const oldBalanceValue = balanceHistory.oldBalance

                              // Cập nhật form
                              setFormData((prev) => ({
                                ...prev,
                                balance: formatVNDInput(oldBalanceValue.toString()),
                              }))

                              success('Đã hoàn tác số dư trong form. Nhấn "Cập nhật" để lưu thay đổi.')
                            }}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline transition"
                            title="Hoàn tác về số dư trước đó (chỉ trong form)"
                          >
                            Hoàn tác
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.balance}
                      onChange={(e) => {
                        const formatted = formatVNDInput(e.target.value)
                        setFormData({ ...formData, balance: formatted })
                      }}
                      onFocus={() => setIsNumberPadOpen(true)}
                      className={`w-full rounded-3xl border-2 p-3.5 pr-12 text-sm placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 cursor-pointer sm:p-4 sm:text-base ${(() => {
                        const balanceValue = parseVNDInput(formData.balance)
                        return balanceValue < 0
                          ? 'border-rose-500 bg-rose-50 text-rose-700 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 bg-white text-slate-900 focus:border-sky-500 focus:ring-sky-500/20'
                      })()
                        }`}
                      placeholder={editingWallet ? "Nhập số dư hiện tại (ví dụ: 1.000.000)" : "Nhập số dư ban đầu (ví dụ: 1.000.000)"}
                      required
                      readOnly
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-sm sm:text-base ${(() => {
                      const balanceValue = parseVNDInput(formData.balance)
                      return balanceValue < 0 ? 'text-rose-600' : 'text-slate-500'
                    })()
                      }`}>
                      ₫
                    </span>
                  </div>
                  {(() => {
                    const balanceValue = parseVNDInput(formData.balance)
                    const isNegative = balanceValue < 0
                    return (
                      <p className={`mt-1.5 text-xs ${isNegative ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                        {isNegative ? (
                          <>
                            <span className="font-bold">⚠️ Cảnh báo: </span>
                            Số dư đang âm. Vui lòng kiểm tra lại các giao dịch hoặc điều chỉnh số dư ban đầu.
                          </>
                        ) : editingWallet ? (
                          'Số dư được cập nhật tự động theo các giao dịch thu/chi. Bạn có thể chỉnh sửa số dư tại đây hoặc nhấn "Đồng bộ từ giao dịch" để tính lại từ các giao dịch.'
                        ) : (
                          'Nhấn vào ô để mở bàn phím số. Số dư sẽ được cập nhật tự động theo các giao dịch thu/chi.'
                        )}
                      </p>
                    )
                  })()}
                </div>

                {/* Mô tả */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm">
                    Mô tả <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-3xl border-2 border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none sm:p-4 sm:text-base"
                    rows={4}
                    placeholder="Nhập mô tả cho ví (ví dụ: Ví dùng cho chi tiêu hàng ngày, Ví tiết kiệm dài hạn...)"
                    required
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Mô tả giúp bạn dễ dàng phân biệt và quản lý các ví
                  </p>
                </div>
              </form>
            </div>
          </main>

          {/* Footer - Fixed - Giống TransactionModal */}
          <ModalFooterButtons
            onCancel={handleCloseForm}
            onConfirm={() => { }}
            confirmText={isSubmitting ? 'Đang lưu...' : editingWallet ? 'Cập nhật' : 'Tạo ví'}
            isSubmitting={isSubmitting}
            disabled={isSubmitting}
            confirmButtonType="submit"
            formId="wallet-form"
            className="safe-area-bottom"
          />
        </div>
      )}

      {/* Number Pad Modal */}
      <NumberPadModal
        isOpen={isNumberPadOpen && isFormOpen}
        onClose={() => setIsNumberPadOpen(false)}
        value={formData.balance}
        onChange={(value) => setFormData({ ...formData, balance: value })}
        onConfirm={() => setIsNumberPadOpen(false)}
      />

      {/* Wallet Transfer Modal */}
      {transferModal.sourceWallet && (
        <WalletTransferModal
          isOpen={transferModal.isOpen}
          onClose={handleCloseTransferModal}
          sourceWallet={transferModal.sourceWallet}
          wallets={wallets}
          onTransfer={handleTransfer}
        />
      )}

      {/* Confirm Toggle Total Balance Dialog */}
      <ConfirmDialog
        isOpen={confirmToggleBalance.isOpen}
        onClose={() => setConfirmToggleBalance({
          isOpen: false,
          wallet: null,
          isEnabling: false,
        })}
        onConfirm={handleConfirmToggleBalance}
        type={confirmToggleBalance.isEnabling ? 'confirm' : 'warning'}
        title={confirmToggleBalance.isEnabling ? 'Bật tính tổng số dư' : 'Tắt tính tổng số dư'}
        message={
          confirmToggleBalance.wallet
            ? confirmToggleBalance.isEnabling
              ? `Bạn có chắc chắn muốn bật tính tổng số dư cho ví "${confirmToggleBalance.wallet.name}"? Ví này sẽ được tính vào tổng số dư của bạn.`
              : `Bạn có chắc chắn muốn tắt tính tổng số dư cho ví "${confirmToggleBalance.wallet.name}"? Ví này sẽ không được tính vào tổng số dư nữa.`
            : ''
        }
        confirmText={confirmToggleBalance.isEnabling ? 'Bật' : 'Tắt'}
        cancelText="Hủy"
      />

      {/* Confirm Sync Balance Dialog */}
      <ConfirmDialog
        isOpen={confirmSyncBalance.isOpen}
        onClose={() => setConfirmSyncBalance({
          isOpen: false,
          wallet: null,
          oldBalance: 0,
          newBalance: 0,
        })}
        onConfirm={() => {
          if (!confirmSyncBalance.wallet) return

          // Chỉ cập nhật form, không cập nhật database
          // Lưu số dư cũ vào state để có thể hoàn tác
          setBalanceHistory({
            oldBalance: confirmSyncBalance.oldBalance,
            historyId: null,
          })

          // Cập nhật form với số dư mới
          setFormData((prev) => ({
            ...prev,
            balance: formatVNDInput(confirmSyncBalance.newBalance.toString()),
          }))

          if (confirmSyncBalance.newBalance < 0) {
            showError(`Số dư sẽ bị âm: ${formatCurrency(confirmSyncBalance.newBalance)}. Vui lòng kiểm tra lại các giao dịch.`)
          } else {
            success('Đã tính toán số dư từ giao dịch. Nhấn "Cập nhật" để lưu thay đổi.')
          }

          setConfirmSyncBalance({
            isOpen: false,
            wallet: null,
            oldBalance: 0,
            newBalance: 0,
          })
        }}
        type="warning"
        title="Xác nhận đồng bộ số dư"
        message={
          confirmSyncBalance.wallet
            ? `Bạn có chắc chắn muốn đồng bộ số dư từ giao dịch?\n\nSố dư hiện tại: ${formatCurrency(confirmSyncBalance.oldBalance)}\nSố dư sau đồng bộ: ${formatCurrency(confirmSyncBalance.newBalance)}\n\n${confirmSyncBalance.newBalance < 0 ? '⚠️ Cảnh báo: Số dư sẽ bị âm!' : ''}\n\nLưu ý: Thay đổi chỉ có hiệu lực sau khi nhấn "Cập nhật".`
            : ''
        }
        confirmText="Đồng bộ"
        cancelText="Hủy"
      />
    </div>
  )
}

export default WalletsPage



