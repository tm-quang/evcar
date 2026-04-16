import { useEffect, useState } from 'react'
import { FaTimes, FaWallet, FaTag, FaClock, FaChevronDown, FaUser, FaPhone, FaMoneyBillWave, FaChartLine, FaExternalLinkAlt, FaTrash, FaEye } from 'react-icons/fa'
import type { TransactionRecord } from '../../lib/transactionService'
import { updateTransaction } from '../../lib/transactionService'
import { getDateComponentsUTC7 } from '../../utils/dateUtils'
import { getIconNode } from '../../utils/iconLoader'
import { CATEGORY_ICON_MAP } from '../../constants/categoryIcons'
import { isCoordinates, parseCoordinates, getMapsUrl } from '../../utils/geocoding'
import { useNotification } from '../../contexts/notificationContext.helpers'

type TransactionDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionRecord | null
  categoryInfo?: {
    name: string
    icon: React.ReactNode | null
    iconId?: string
    iconUrl?: string | null
  }
  walletInfo?: {
    name: string
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export const TransactionDetailModal = ({
  isOpen,
  onClose,
  transaction,
  categoryInfo,
  walletInfo,
}: TransactionDetailModalProps) => {
  const [categoryIcon, setCategoryIcon] = useState<React.ReactNode | null>(null)
  const [isExpandedSectionOpen, setIsExpandedSectionOpen] = useState(false)
  const [isDeletingImage, setIsDeletingImage] = useState<number | null>(null)
  const [localTransaction, setLocalTransaction] = useState<TransactionRecord | null>(transaction)
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const { success, error: showError } = useNotification()

  // Update local transaction when prop changes
  useEffect(() => {
    setLocalTransaction(transaction)
  }, [transaction])

  useEffect(() => {
    const loadIcon = async () => {
      if (!categoryInfo) {
        setCategoryIcon(null)
        return
      }

      // Nếu có iconId hoặc iconUrl, load icon với kích thước phù hợp
      if (categoryInfo.iconId || categoryInfo.iconUrl) {
        try {
          const iconNode = await getIconNode(categoryInfo.iconId || '')
          if (iconNode) {
            // Wrap icon với kích thước phù hợp cho modal
            setCategoryIcon(
              <span className="h-6 w-6 flex items-center justify-center overflow-hidden rounded-full">
                {iconNode}
              </span>
            )
          } else if (categoryInfo.iconUrl) {
            // Nếu có iconUrl, sử dụng trực tiếp
            setCategoryIcon(
              <img
                src={categoryInfo.iconUrl}
                alt=""
                className="h-6 w-6 object-cover rounded-full"
                onError={() => setCategoryIcon(null)}
              />
            )
          } else {
            // Fallback to hardcoded icon
            const hardcodedIcon = CATEGORY_ICON_MAP[categoryInfo.iconId || '']
            if (hardcodedIcon?.icon) {
              const IconComponent = hardcodedIcon.icon
              setCategoryIcon(<IconComponent className="h-6 w-6" />)
            } else {
              setCategoryIcon(null)
            }
          }
        } catch (error) {
          console.error('Error loading category icon:', error)
          // Fallback to hardcoded icon
          const hardcodedIcon = CATEGORY_ICON_MAP[categoryInfo.iconId || '']
          if (hardcodedIcon?.icon) {
            const IconComponent = hardcodedIcon.icon
            setCategoryIcon(<IconComponent className="h-6 w-6" />)
          } else {
            setCategoryIcon(null)
          }
        }
      } else if (categoryInfo.icon) {
        // Nếu đã có icon từ props, sử dụng nó nhưng resize
        setCategoryIcon(
          <div className="h-6 w-6 flex items-center justify-center [&>span]:!h-6 [&>span]:!w-6 [&>span>img]:!h-6 [&>span>img]:!w-6 [&>svg]:!h-6 [&>svg]:!w-6 [&>span>svg]:!h-6 [&>span>svg]:!w-6">
            {categoryInfo.icon}
          </div>
        )
      } else {
        setCategoryIcon(null)
      }
    }

    loadIcon()
  }, [categoryInfo])

  // Handle image deletion
  const handleDeleteImage = async (index: number) => {
    if (!localTransaction || !localTransaction.image_urls) return

    setIsDeletingImage(index)
    try {
      const updatedImageUrls = localTransaction.image_urls.filter((_, i) => i !== index)
      await updateTransaction(localTransaction.id, {
        image_urls: updatedImageUrls.length > 0 ? updatedImageUrls : undefined,
      })

      // Update local transaction state immediately
      setLocalTransaction({
        ...localTransaction,
        image_urls: updatedImageUrls.length > 0 ? updatedImageUrls : null,
      })

      success('Đã xóa ảnh thành công')
    } catch (error) {
      showError('Không thể xóa ảnh. Vui lòng thử lại.')
    } finally {
      setIsDeletingImage(null)
    }
  }

  // Parse location to get display address and coordinates
  const parseLocation = () => {
    if (!localTransaction?.location) return { address: '', hasCoordinates: false, coordinates: null }

    let displayLocation = localTransaction.location
    let hasCoordinates = false
    let coordinates: { lat: number; lng: number } | null = null

    if (displayLocation.includes('|')) {
      const parts = displayLocation.split('|')
      displayLocation = parts[0]
      if (parts[1]) {
        coordinates = parseCoordinates(parts[1])
        hasCoordinates = coordinates !== null
      }
    } else if (isCoordinates(displayLocation)) {
      coordinates = parseCoordinates(displayLocation)
      hasCoordinates = coordinates !== null
    }

    return { address: displayLocation, hasCoordinates, coordinates }
  }

  if (!isOpen || !localTransaction) return null

  const isIncome = localTransaction.type === 'Thu'
  const locationData = parseLocation()

  // Format created_at date and time for display
  const formatCreatedAt = () => {
    try {
      const createdDate = new Date(localTransaction.created_at)
      const components = getDateComponentsUTC7(createdDate)
      const dateStr = `${String(components.day).padStart(2, '0')}/${String(components.month).padStart(2, '0')}/${components.year}`
      const timeStr = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`
      return `${dateStr} - ${timeStr}`
    } catch {
      return localTransaction.created_at
    }
  }

  // Format borrow date
  const formatBorrowDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const components = getDateComponentsUTC7(date)
      return `${String(components.day).padStart(2, '0')}/${String(components.month).padStart(2, '0')}/${components.year}`
    } catch {
      return dateStr
    }
  }

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[3px] transition-all duration-300 animate-in fade-in" onClick={onClose}>
        <div className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-slate-200 overflow-hidden animate-in slide-in-from-bottom-full duration-300 mt-12 sm:mt-0 safe-area-bottom" onClick={e => e.stopPropagation()}>
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Chi tiết giao dịch</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {isIncome ? 'Khoản thu' : 'Khoản chi'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 hover:scale-110 active:scale-95 sm:h-10 sm:w-10"
            >
              <FaTimes className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4">
              {/* Amount - Large Display */}
              <div className="text-center py-4">
                <div className={`text-3xl font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                  {isIncome ? '+' : '-'}
                  {formatCurrency(localTransaction.amount)}
                </div>
              </div>

              {/* Main Info - 2 Column Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Description */}
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Mô tả
                  </label>
                  <p className="text-base font-semibold text-slate-900">
                    {localTransaction.description || categoryInfo?.name || 'Không có mô tả'}
                  </p>
                </div>

                {/* Category */}
                {categoryInfo && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Hạng mục
                    </label>
                    <div className="flex items-center gap-2">
                      {categoryIcon && (
                        <div className="flex items-center justify-center">
                          {categoryIcon}
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900 truncate">{categoryInfo.name}</span>
                    </div>
                  </div>
                )}

                {/* Wallet */}
                {walletInfo && (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Ví
                    </label>
                    <div className="flex items-center gap-2">
                      <FaWallet className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-900 truncate">{walletInfo.name}</span>
                    </div>
                  </div>
                )}

                {/* Created At - Combined date and time */}
                {localTransaction.created_at && (
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Ngày Tạo giao dịch
                    </label>
                    <div className="flex items-center gap-2">
                      <FaClock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-900">{formatCreatedAt()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {localTransaction.tags && localTransaction.tags.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {localTransaction.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700"
                      >
                        <FaTag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              {localTransaction.image_urls && Array.isArray(localTransaction.image_urls) && localTransaction.image_urls.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ảnh/Hóa đơn ({localTransaction.image_urls.length})
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {localTransaction.image_urls.filter(url => url && url.trim() !== '').map((url, index) => {
                      const isActive = activeImageIndex === index
                      return (
                        <div
                          key={index}
                          className="relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setActiveImageIndex(isActive ? null : index)}
                        >
                          <img
                            src={url}
                            alt={`Receipt ${index + 1}`}
                            className="h-48 w-full object-cover transition-transform"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback nếu ảnh không load được
                              const target = e.target as HTMLImageElement
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex h-48 w-full items-center justify-center bg-slate-100 rounded-xl">
                                    <div class="text-center">
                                      <svg class="h-12 w-12 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <p class="text-xs text-slate-500">Không thể tải ảnh</p>
                                    </div>
                                  </div>
                                `
                              }
                            }}
                          />
                          {/* Overlay with buttons - shown when clicked */}
                          {isActive && (
                            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 transition-all">
                              {/* View button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(url, '_blank', 'noopener,noreferrer')
                                }}
                                className="flex items-center justify-center rounded-full bg-white/90 p-3 text-slate-700 transition-all hover:bg-white hover:scale-110 active:scale-95"
                                title="Xem ảnh"
                              >
                                <FaEye className="h-5 w-5" />
                              </button>
                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteImage(index)
                                  setActiveImageIndex(null)
                                }}
                                disabled={isDeletingImage === index}
                                className="flex items-center justify-center rounded-full bg-red-500 p-3 text-white transition-all hover:bg-red-600 hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="Xóa ảnh"
                              >
                                {isDeletingImage === index ? (
                                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                  <FaTrash className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Expanded Section - Additional Info */}
              {(localTransaction.location || localTransaction.recipient_name || (localTransaction.is_borrowed && !isIncome) || localTransaction.exclude_from_reports) && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setIsExpandedSectionOpen(!isExpandedSectionOpen)}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="text-sm font-semibold text-slate-900">Thông tin mở rộng</span>
                    <FaChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${isExpandedSectionOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpandedSectionOpen && (
                    <div className="mt-4 space-y-4">
                      {/* Location */}
                      {localTransaction.location && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-700">
                            Địa điểm, chuyến đi
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
                              {locationData.address || localTransaction.location}
                            </div>
                            {locationData.hasCoordinates && (
                              <button
                                type="button"
                                onClick={() => {
                                  const locationToUse = localTransaction.location || ''
                                  let mapsUrl = ''

                                  if (locationToUse.includes('|')) {
                                    const parts = locationToUse.split('|')
                                    if (parts[1]) {
                                      mapsUrl = getMapsUrl(parts[1])
                                    } else {
                                      mapsUrl = getMapsUrl(locationToUse)
                                    }
                                  } else if (locationData.coordinates) {
                                    mapsUrl = getMapsUrl(`${locationData.coordinates.lat},${locationData.coordinates.lng}`)
                                  } else {
                                    mapsUrl = getMapsUrl(locationToUse)
                                  }

                                  window.open(mapsUrl, '_blank', 'noopener,noreferrer')
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-green-200 bg-green-50 text-green-600 transition-all hover:border-green-300 hover:bg-green-100"
                                title="Mở bản đồ"
                              >
                                <FaExternalLinkAlt className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Recipient/Payer Name */}
                      {localTransaction.recipient_name && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-700">
                            {isIncome ? 'Thu từ ai' : 'Chi cho ai'}
                          </label>
                          <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
                            <FaUser className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-900">{localTransaction.recipient_name}</span>
                          </div>
                        </div>
                      )}

                      {/* Is Borrowed Section - Only for expenses */}
                      {!isIncome && localTransaction.is_borrowed && (
                        <div className="rounded-xl border-2 border-sky-100 bg-sky-50 p-3">
                          <div className="mb-3 flex items-center gap-2">
                            <FaMoneyBillWave className="h-4 w-4 text-sky-600" />
                            <span className="text-xs font-semibold text-slate-900">Đi vay để chi cho khoản này</span>
                          </div>
                          <div className="space-y-3">
                            {/* Lender Name */}
                            {localTransaction.lender_name && (
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                  Người cho vay
                                </label>
                                <div className="flex items-center gap-2 rounded-lg border-2 border-sky-200 bg-white p-2.5">
                                  <FaMoneyBillWave className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-sm text-slate-900">{localTransaction.lender_name}</span>
                                </div>
                              </div>
                            )}

                            {/* Lender Phone */}
                            {localTransaction.lender_phone && (
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                  Số điện thoại
                                </label>
                                <div className="flex items-center gap-2 rounded-lg border-2 border-sky-200 bg-white p-2.5">
                                  <FaPhone className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-sm text-slate-900">{localTransaction.lender_phone}</span>
                                </div>
                              </div>
                            )}

                            {/* Borrow Date */}
                            {localTransaction.borrow_date && (
                              <div>
                                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                  Ngày vay
                                </label>
                                <div className="flex items-center gap-2 rounded-lg border-2 border-sky-200 bg-white p-2.5">
                                  <FaClock className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-sm text-slate-900">{formatBorrowDate(localTransaction.borrow_date)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Exclude from Reports */}
                      {localTransaction.exclude_from_reports && (
                        <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
                          <div className="flex items-center gap-2">
                            <FaChartLine className="h-4 w-4 text-amber-600 shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-slate-900">Không tính vào báo cáo</span>
                              <p className="mt-1 text-xs text-slate-600">
                                Chỉ ghi nhớ lịch sử, không tính vào báo cáo, số dư hoặc bất kỳ thống kê nào
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {localTransaction.notes && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Ghi chú
                  </label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">
                    {localTransaction.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-center border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-600 active:scale-95"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


