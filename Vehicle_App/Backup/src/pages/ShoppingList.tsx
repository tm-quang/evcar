import { useEffect, useState } from 'react'
import { FaSearch, FaCheck, FaTimes, FaTrash, FaShoppingCart, FaStore, FaList } from 'react-icons/fa'
import HeaderBar from '../components/layout/HeaderBar'
import { LoadingRing } from '../components/ui/LoadingRing'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  fetchShoppingLists,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  toggleShoppingItem,
  type ShoppingListRecord,
  type ShoppingItem,
} from '../lib/shoppingListService'
import { useNotification } from '../contexts/notificationContext.helpers'
import { MARKET_SHOPPING_PRESET, SUPERMARKET_SHOPPING_PRESET, type ShoppingListPreset } from '../constants/shoppingListPresets'
import { ShoppingListSelectionModal } from '../components/shoppingList/ShoppingListSelectionModal'
import { getDateComponentsUTC7 } from '../utils/dateUtils'
import { generateUUID } from '../utils/uuid'

// Format datetime for display (DD/MM/YYYY HH:MM:SS)
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const components = getDateComponentsUTC7(date)
    const hours = String(components.hour).padStart(2, '0')
    const minutes = String(components.minute).padStart(2, '0')
    const seconds = String(components.second).padStart(2, '0')
    const day = String(components.day).padStart(2, '0')
    const month = String(components.month).padStart(2, '0')
    const year = components.year
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateStr
  }
}

// Format time only (HH:MM:SS)
const formatTime = (dateStr: string | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const components = getDateComponentsUTC7(date)
    const hours = String(components.hour).padStart(2, '0')
    const minutes = String(components.minute).padStart(2, '0')
    const seconds = String(components.second).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  } catch {
    return ''
  }
}

const ShoppingListPage = () => {
  const { success, error: showError } = useNotification()
  const [lists, setLists] = useState<ShoppingListRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [listToDelete, setListToDelete] = useState<ShoppingListRecord | null>(null)
  const [expandedListId, setExpandedListId] = useState<string | null>(null)
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<ShoppingListPreset | null>(null)

  useEffect(() => {
    loadLists()
  }, [showCompleted])

  const loadLists = async () => {
    setIsLoading(true)
    try {
      const data = await fetchShoppingLists(showCompleted)
      setLists(data)
    } catch (err) {
      console.error('Error loading shopping lists:', err)
      showError('Không thể tải danh sách mua sắm')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenPresetSelection = (preset: ShoppingListPreset) => {
    setSelectedPreset(preset)
    setIsSelectionModalOpen(true)
  }

  const handleCreateFromSelectedItems = async (selectedItems: Omit<ShoppingItem, 'id' | 'status' | 'display_order' | 'completed_at'>[]) => {
    if (!selectedPreset) {
      showError('Không có preset được chọn')
      return
    }

    if (!selectedItems || selectedItems.length === 0) {
      showError('Vui lòng chọn ít nhất một mục để tạo danh sách')
      return
    }

    try {
      const items: ShoppingItem[] = selectedItems.map((item, index) => {
        if (!item.name || item.name.trim() === '') {
          throw new Error(`Mục thứ ${index + 1} không có tên`)
        }
        
        const newItem: ShoppingItem = {
          id: generateUUID(),
          name: item.name.trim(),
          status: 'pending' as const,
          display_order: index,
        }
        
        // Chỉ thêm quantity nếu có giá trị
        if (item.quantity && item.quantity.trim() !== '') {
          newItem.quantity = item.quantity.trim()
        }
        
        // Chỉ thêm notes nếu có giá trị
        if (item.notes && item.notes.trim() !== '') {
          newItem.notes = item.notes.trim()
        }
        
        // Không thêm completed_at khi tạo mới (optional field)
        return newItem
      })

      console.log('Creating shopping list:', {
        title: selectedPreset.title,
        type: selectedPreset.type,
        itemsCount: items.length,
        items: items.map(i => ({ name: i.name, quantity: i.quantity })),
      })

      await createShoppingList({
        title: selectedPreset.title,
        type: selectedPreset.type,
        items,
      })
      success(`Đã tạo ${selectedPreset.title} thành công!`)
      await loadLists()
    } catch (err) {
      console.error('=== ERROR CREATING SHOPPING LIST ===')
      console.error('Error type:', typeof err)
      console.error('Error constructor:', err?.constructor?.name)
      
      if (err instanceof Error) {
        console.error('Error message:', err.message)
        console.error('Error stack:', err.stack)
        showError(err.message || 'Không thể tạo danh sách mua sắm')
      } else {
        console.error('Error object:', err)
        console.error('Error stringified:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
        showError('Không thể tạo danh sách mua sắm. Vui lòng kiểm tra console để xem chi tiết.')
      }
      
      console.error('Selected preset:', selectedPreset)
      console.error('Selected items:', selectedItems)
    }
  }


  const handleToggleItem = async (listId: string, itemId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      await toggleShoppingItem(listId, itemId, newStatus as 'pending' | 'completed')
      await loadLists()
    } catch (err) {
      console.error('Error toggling item:', err)
      showError('Không thể cập nhật mục')
    }
  }

  const handleDeleteList = async () => {
    if (!listToDelete) return

    try {
      await deleteShoppingList(listToDelete.id)
      success('Đã xóa danh sách mua sắm!')
      setIsDeleteConfirmOpen(false)
      setListToDelete(null)
      await loadLists()
    } catch (err) {
      console.error('Error deleting shopping list:', err)
      showError('Không thể xóa danh sách mua sắm')
    }
  }

  const handleCompleteList = async (list: ShoppingListRecord) => {
    try {
      const now = new Date().toISOString()
      await updateShoppingList(list.id, {
        completed_at: list.completed_at ? null : now,
      })
      await loadLists()
    } catch (err) {
      console.error('Error completing list:', err)
      showError('Không thể cập nhật danh sách')
    }
  }

  const filteredLists = lists.filter(list =>
    list.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingCount = lists.filter(l => !l.completed_at).length

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC]">
        <HeaderBar variant="page" title="DANH SÁCH MUA SẮM" />
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <LoadingRing />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title={isSearchOpen ? '' : 'DANH SÁCH MUA SẮM'}
        showIcon={
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 transition hover:scale-110 active:scale-95"
          >
            <FaSearch className="h-4 w-4 text-slate-600" />
          </button>
        }
        customContent={
          isSearchOpen ? (
            <div className="flex-1 px-4">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </div>
          ) : null
        }
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-2 pb-24">
          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                showCompleted
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Tất cả ({lists.length})
            </button>
            <button
              onClick={() => setShowCompleted(false)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                !showCompleted
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Chưa hoàn thành ({pendingCount})
            </button>
          </div>

          {/* Quick Create Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOpenPresetSelection(MARKET_SHOPPING_PRESET)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <FaStore className="h-6 w-6" />
              <div className="text-left">
                <p className="font-bold">Đi chợ</p>
                <p className="text-xs text-green-100">Chọn mục cần mua</p>
              </div>
            </button>
            <button
              onClick={() => handleOpenPresetSelection(SUPERMARKET_SHOPPING_PRESET)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg transition hover:scale-105 active:scale-95"
            >
              <FaShoppingCart className="h-6 w-6" />
              <div className="text-left">
                <p className="font-bold">Siêu thị</p>
                <p className="text-xs text-blue-100">Chọn mục cần mua</p>
              </div>
            </button>
          </div>

          {/* Lists */}
          {filteredLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FaList className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">Chưa có danh sách mua sắm nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLists.map((list) => {
                const completedItems = list.items.filter(item => item.status === 'completed').length
                const totalItems = list.items.length
                const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
                const isExpanded = expandedListId === list.id
                const isCompleted = !!list.completed_at

                return (
                  <div
                    key={list.id}
                    className={`rounded-2xl bg-white shadow-lg border overflow-hidden transition ${
                      isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    {/* List Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1">{list.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            {list.type === 'market' && <FaStore className="h-3 w-3" />}
                            {list.type === 'supermarket' && <FaShoppingCart className="h-3 w-3" />}
                            <span>
                              {completedItems}/{totalItems} mục
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Tạo: {formatDateTime(list.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCompleteList(list)}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition ${
                              isCompleted
                                ? 'bg-green-100 text-green-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isCompleted ? <FaCheck className="h-4 w-4" /> : <FaTimes className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setIsDeleteConfirmOpen(true)
                              setListToDelete(list)
                            }}
                            className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition"
                          >
                            <FaTrash className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar with percentage */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-600">Tiến độ</span>
                          <span className="text-xs font-bold text-green-600">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Toggle Expand */}
                      <button
                        onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 transition"
                      >
                        {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                      </button>
                    </div>

                    {/* Expanded Items */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 space-y-2 max-h-96 overflow-y-auto">
                        {list.items.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">Chưa có mục nào</p>
                        ) : (
                          [...list.items]
                            .sort((a, b) => {
                              // Sắp xếp: completed items xuống dưới, sau đó theo display_order
                              if (a.status === 'completed' && b.status !== 'completed') return 1
                              if (a.status !== 'completed' && b.status === 'completed') return -1
                              return a.display_order - b.display_order
                            })
                            .map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition ${
                                item.status === 'completed' ? 'bg-slate-50 opacity-60' : 'bg-white'
                              }`}
                            >
                              <button
                                onClick={() => handleToggleItem(list.id, item.id, item.status)}
                                className={`h-6 w-6 rounded-full flex items-center justify-center transition ${
                                  item.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : 'border-2 border-slate-300 hover:border-green-500'
                                }`}
                              >
                                {item.status === 'completed' && <FaCheck className="h-3 w-3" />}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-sm ${
                                    item.status === 'completed'
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900 font-medium'
                                  }`}
                                >
                                  {item.name}
                                </p>
                                {item.quantity && (
                                  <p className="text-xs text-slate-500">Số lượng: {item.quantity}</p>
                                )}
                                {item.status === 'completed' && item.completed_at && (
                                  <p className="text-xs text-green-600 mt-1">
                                    ✓ Hoàn thành: {formatTime(item.completed_at)}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-slate-400 italic">{item.notes}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setListToDelete(null)
        }}
        onConfirm={handleDeleteList}
        title="Xóa danh sách mua sắm"
        message={`Bạn có chắc chắn muốn xóa "${listToDelete?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        cancelText="Hủy"
        type="alert"
      />

      <ShoppingListSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => {
          setIsSelectionModalOpen(false)
          setSelectedPreset(null)
        }}
        preset={selectedPreset}
        onConfirm={handleCreateFromSelectedItems}
      />
    </div>
  )
}

export default ShoppingListPage


