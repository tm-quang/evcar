import { useState, useEffect } from 'react'
import { FaTimes, FaCheck, FaShoppingCart, FaStore, FaSearch } from 'react-icons/fa'
import type { ShoppingListPreset } from '../../constants/shoppingListPresets'
import type { ShoppingItem } from '../../lib/shoppingListService'
import { VoiceInputButton } from './VoiceInputButton'

interface ShoppingListSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  preset: ShoppingListPreset | null
  onConfirm: (selectedItems: Omit<ShoppingItem, 'id' | 'status' | 'display_order' | 'completed_at'>[]) => void
}

export const ShoppingListSelectionModal = ({
  isOpen,
  onClose,
  preset,
  onConfirm,
}: ShoppingListSelectionModalProps) => {
  const [selectedItems, setSelectedItems] = useState<Map<string, { name: string; quantity: string }>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isOpen && preset) {
      setSelectedItems(new Map())
      setSearchTerm('')
    }
  }, [isOpen, preset])

  if (!isOpen || !preset) return null

  const filteredItems = preset.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggleItem = (itemName: string) => {
    const newSelected = new Map(selectedItems)
    if (newSelected.has(itemName)) {
      newSelected.delete(itemName)
    } else {
      // Mặc định số lượng là "1" khi chọn item
      newSelected.set(itemName, { name: itemName, quantity: '1' })
    }
    setSelectedItems(newSelected)
  }

  const handleQuantityChange = (itemName: string, quantity: string) => {
    const newSelected = new Map(selectedItems)
    const existing = newSelected.get(itemName)
    if (existing) {
      newSelected.set(itemName, { ...existing, quantity })
    }
    setSelectedItems(newSelected)
  }

  const handleConfirm = () => {
    const items: Omit<ShoppingItem, 'id' | 'status' | 'display_order' | 'completed_at'>[] = Array.from(selectedItems.entries()).map(
      ([name, data]) => ({
        name,
        quantity: data.quantity && data.quantity.trim() !== '' ? data.quantity : null,
        notes: null,
      })
    )
    onConfirm(items)
    onClose()
  }

  const selectedCount = selectedItems.size

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-end sm:items-center p-0 sm:p-4 pointer-events-none">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 sm:animate-in sm:zoom-in-95 max-h-[90vh] flex flex-col mt-12 sm:mt-0">
        {/* Mobile Handle */}
        <div className="flex w-full justify-center pt-3 pb-2 flex-shrink-0 bg-transparent sm:hidden scroll-none pointer-events-none sticky top-0 z-10 w-full mb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
          <div className="flex items-center gap-3">
            {preset.type === 'market' ? (
              <FaStore className="h-5 w-5 text-emerald-600" />
            ) : (
              <FaShoppingCart className="h-5 w-5 text-blue-600" />
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">{preset.title}</h3>
              <p className="text-xs text-slate-500">Chọn mục cần mua</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Search and Voice Input */}
        <div className="px-4 pt-4 shrink-0 space-y-3">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <VoiceInputButton
            onItemsRecognized={(items) => {
              // Tự động chọn các items được nhận diện từ giọng nói
              // Cố gắng match với preset items nếu có thể
              const newSelected = new Map(selectedItems)
              
              items.forEach((voiceItem) => {
                // Tìm item tương tự trong preset
                const matchedPresetItem = preset.items.find((presetItem) => {
                  const voiceNameLower = voiceItem.name.toLowerCase().trim()
                  const presetNameLower = presetItem.name.toLowerCase().trim()
                  
                  // Exact match
                  if (voiceNameLower === presetNameLower) return true
                  
                  // Partial match (chứa một trong hai)
                  if (voiceNameLower.includes(presetNameLower) || presetNameLower.includes(voiceNameLower)) {
                    return true
                  }
                  
                  // Match các từ khóa phổ biến
                  const commonWords = ['chai', 'gói', 'hộp', 'kg', 'cái', 'quả', 'trái', 'con', 'bịch', 'túi']
                  const voiceWords = voiceNameLower.split(/\s+/)
                  const presetWords = presetNameLower.split(/\s+/)
                  
                  // Kiểm tra xem có từ nào giống nhau không (loại bỏ các từ thông dụng)
                  const voiceKeywords = voiceWords.filter(w => !commonWords.includes(w) && w.length > 2)
                  const presetKeywords = presetWords.filter(w => !commonWords.includes(w) && w.length > 2)
                  
                  return voiceKeywords.some(vw => presetKeywords.some(pw => 
                    vw.includes(pw) || pw.includes(vw) || vw === pw
                  ))
                })
                
                // Sử dụng tên từ preset nếu match được, nếu không thì dùng tên từ voice
                const finalName = matchedPresetItem ? matchedPresetItem.name : voiceItem.name
                const finalQuantity = voiceItem.quantity || '1'
                
                newSelected.set(finalName, {
                  name: finalName,
                  quantity: finalQuantity,
                })
              })
              
              setSelectedItems(newSelected)
              
              // Scroll to top để người dùng thấy các items đã được chọn
              const itemsList = document.querySelector('[class*="overflow-y-auto"]')
              if (itemsList) {
                itemsList.scrollTop = 0
              }
            }}
          />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {filteredItems.map((item, index) => {
              const isSelected = selectedItems.has(item.name)
              const quantity = selectedItems.get(item.name)?.quantity || ''

              return (
                <div
                  key={index}
                  onClick={() => handleToggleItem(item.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center transition shrink-0 ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'border-2 border-slate-300'
                    }`}
                  >
                    {isSelected && <FaCheck className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {item.name}
                    </p>
                  </div>
                  {isSelected && (
                    <input
                      type="text"
                      placeholder="Số lượng"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(item.name, e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation() // Ngăn không cho toggle khi click vào input
                      }}
                      onFocus={(e) => {
                        e.stopPropagation() // Ngăn không cho toggle khi focus vào input
                      }}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-400"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">
              Đã chọn: <span className="font-bold text-sky-600">{selectedCount}</span> mục
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="flex-1 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Tạo checklist ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

