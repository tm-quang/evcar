import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Car,
  Wrench,
  Zap,
  AlertTriangle,
  Receipt,
  Info,
  Trash2,
  Check,
  CheckCircle2,
  ArrowLeft,
  Bell
} from 'lucide-react'

import { useNotification } from '../contexts/notificationContext.helpers'
import { NotificationListSkeleton } from '../components/skeletons'
import {
  fetchVehicleNotifications,
  markVehicleNotificationRead,
  markAllVehicleNotificationsRead,
  deleteVehicleNotification,
  type VehicleNotificationRecord,
  type VehicleNotificationType,
} from '../lib/ev/vehicleNotificationService'

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) return 'Hôm nay'
  if (dateOnly.getTime() === yesterdayOnly.getTime()) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const getNotificationIcon = (type: VehicleNotificationType) => {
  switch (type) {
    case 'vehicle_info': return <Car className="h-5 w-5" />
    case 'maintenance': return <Wrench className="h-5 w-5" />
    case 'charging': return <Zap className="h-5 w-5" />
    case 'expense': return <Receipt className="h-5 w-5" />
    case 'alert': return <AlertTriangle className="h-5 w-5" />
    default: return <Info className="h-5 w-5" />
  }
}

const getNotificationColor = (type: VehicleNotificationType): string => {
  switch (type) {
    case 'vehicle_info': return 'bg-blue-100 text-blue-600'
    case 'maintenance': return 'bg-amber-100 text-amber-600'
    case 'charging': return 'bg-emerald-100 text-emerald-600'
    case 'expense': return 'bg-slate-100 text-slate-600'
    case 'alert': return 'bg-red-100 text-red-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

const getNotificationTypeLabel = (type: VehicleNotificationType): string => {
  switch (type) {
    case 'vehicle_info': return 'Phương tiện'
    case 'maintenance': return 'Bảo dưỡng'
    case 'charging': return 'Sạc điện'
    case 'expense': return 'Chi phí'
    case 'alert': return 'Cảnh báo'
    default: return 'Thông báo'
  }
}

export const NotificationsPage = () => {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [notifications, setNotifications] = useState<VehicleNotificationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<VehicleNotificationType | 'all'>('all')
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await fetchVehicleNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
      showError('Không thể tải thông báo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markVehicleNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, status: 'read', read_at: new Date().toISOString() } : n)
      )
    } catch (error) {
      showError('Không thể đánh dấu đã đọc.')
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true)
    try {
      await markAllVehicleNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const, read_at: n.read_at || new Date().toISOString() })))
      success('Đã đọc tất cả thông báo')
    } catch (error) {
      showError('Lỗi cập nhật trạng thái.')
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicleNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      success('Đã xóa thông báo')
    } catch (error) {
      showError('Không thể xóa thông báo.')
    }
  }

  const groupedNotifications = useMemo(() => {
    const filtered = selectedType === 'all' ? notifications : notifications.filter((n) => n.type === selectedType)
    const groups: Record<string, VehicleNotificationRecord[]> = {}
    filtered.forEach((n) => {
      const dateKey = formatDate(n.created_at)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(n)
    })
    return groups
  }, [notifications, selectedType])

  const notificationTypes = useMemo(() => {
    const types = new Set<VehicleNotificationType>()
    notifications.forEach((n) => types.add(n.type))
    return Array.from(types)
  }, [notifications])

  const unreadCount = useMemo(() => notifications.filter((n) => n.status === 'unread').length, [notifications])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <header className="flex-shrink-0 bg-[#F7F9FC]">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 transition-all active:scale-90">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Thông báo</p>
            {unreadCount > 0 && <span className="text-[10px] font-bold text-sky-600">Bạn có {unreadCount} tin mới</span>}
          </div>
          <button onClick={handleMarkAllAsRead} disabled={isMarkingAllRead || unreadCount === 0} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg border border-slate-100 disabled:opacity-30 transition-all active:scale-90">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100">
        <div className="mx-auto flex w-full max-w-md gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex-shrink-0 rounded-3xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${selectedType === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
          >
            Tất cả
          </button>
          {notificationTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-shrink-0 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${selectedType === type ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'
                }`}
            >
              {getNotificationTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col px-4 pt-4 pb-12">
          {isLoading ? (
            <NotificationListSkeleton count={5} />
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center mt-10 border border-slate-300 shadow-md">
              <div className="mb-6 rounded-3xl bg-slate-100 p-6 shadow-inner">
                <Bell className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-lg font-black text-slate-800">Chưa có thông báo</p>
              <p className="mt-2 text-sm font-medium text-slate-400">Các cập nhật về xe sẽ hiển thị tại đây</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
                <div key={dateKey} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 whitespace-nowrap">{dateKey}</p>
                    <div className="h-px w-full bg-slate-100" />
                  </div>

                  <div className="space-y-3">
                    {dateNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`group relative rounded-[2rem] bg-white p-5 shadow-sm border-2 transition-all ${n.status === 'unread' ? 'border-sky-500 bg-sky-50/20' : 'border-transparent'
                          }`}
                      >
                        <div className="flex gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${getNotificationColor(n.type)}`}>
                            {getNotificationIcon(n.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-black text-slate-800">{n.title}</h4>
                                <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{n.message}</p>
                                <div className="mt-3 flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">{formatTime(n.created_at)}</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-200" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getNotificationTypeLabel(n.type)}</span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {n.status === 'unread' && (
                                  <button onClick={() => handleMarkAsRead(n.id)} className="rounded-xl bg-sky-100 p-2 text-sky-600 transition-all active:scale-90">
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                <button onClick={() => handleDelete(n.id)} className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:text-red-500 transition-all active:scale-90">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default NotificationsPage


