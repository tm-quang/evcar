import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LuDownload,
    LuUpload,
    LuShieldCheck,
    LuCloud,
    LuHistory,
    LuTerminal
} from 'react-icons/lu'
import { AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import HeaderBar from '../../components/layout/HeaderBar'
import VehicleFooterNav from '../../components/ev/VehicleFooterNav'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { getSupabaseClient } from '../../lib/supabaseClient'

// Constants for tables to backup
const BACKUP_TABLES = [
    'vehicles',
    'vehicle_trips',
    'vehicle_logs',
    'vehicle_maintenance',
    'vehicle_expenses'
]

export default function DataManagementPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { success, error: showError } = useNotification()
    const [isBackingUp, setIsBackingUp] = useState(false)
    const [isRestoring, setIsRestoring] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(new Date().toLocaleString('vi-VN'))

    const handleLocalBackup = async () => {
        setIsBackingUp(true)
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('User not authenticated')

            const backupData: Record<string, any> = {}

            // Fetch all data from tables
            for (const table of BACKUP_TABLES) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', user.id)

                if (error) throw error
                backupData[table] = data || []
            }

            // Create JSON blob
            const blob = new Blob([JSON.stringify({
                version: '1.0',
                timestamp: new Date().toISOString(),
                user_id: user.id,
                data: backupData
            }, null, 2)], { type: 'application/json' })

            // Trigger download
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `EVGo_Backup_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            success('Đã tải xuống bản sao lưu thành công!')
        } catch (err: any) {
            showError(err.message || 'Không thể tạo bản sao lưu')
        } finally {
            setIsBackingUp(false)
        }
    }

    const handleRestore = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsRestoring(true)
        try {
            const reader = new FileReader()
            reader.onload = async (e) => {
                try {
                    const backupJson = JSON.parse(e.target?.result as string)

                    if (!backupJson.data || !backupJson.version) {
                        throw new Error('Định dạng tệp sao lưu không hợp lệ')
                    }

                    const supabase = getSupabaseClient()
                    const { data: { user } } = await supabase.auth.getUser()

                    if (!user) throw new Error('User not authenticated')

                    // Confirm user ID if available in backup
                    if (backupJson.user_id && backupJson.user_id !== user.id) {
                        if (!window.confirm('Cảnh báo: Bản sao lưu này thuộc về một tài khoản khác. Tiếp tục tải lên?')) {
                            setIsRestoring(false)
                            return
                        }
                    }

                    // Restore data logic
                    // This is complex as it requires bulk inserts and handling primary key conflicts
                    // For safety, we should probably upsert or prompt user

                    for (const table of BACKUP_TABLES) {
                        const tableData = backupJson.data[table]
                        if (tableData && Array.isArray(tableData)) {
                            // Ensure each record has the current user_id
                            const recordsToInsert = tableData.map(record => ({
                                ...record,
                                user_id: user.id // Override with current user ID for security
                            }))

                            if (recordsToInsert.length > 0) {
                                // Bulk upsert to DB
                                const { error } = await supabase
                                    .from(table)
                                    .upsert(recordsToInsert, { onConflict: 'id' })

                                if (error) throw error
                            }
                        }
                    }

                    await queryClient.invalidateQueries()
                    success('Khôi phục dữ liệu thành công!')
                    setLastSyncTime(new Date().toLocaleString('vi-VN'))
                } catch (err: any) {
                    showError(err.message || 'Lỗi khi phân tích dữ liệu khôi phục')
                } finally {
                    setIsRestoring(false)
                    // Clear input
                    event.target.value = ''
                }
            }
            reader.readAsText(file)
        } catch (err: any) {
            showError(err.message || 'Không thể đọc tệp')
            setIsRestoring(false)
        }
    }

    const handleCloudSync = async () => {
        setIsBackingUp(true)
        try {
            await queryClient.invalidateQueries()
            // Here we could also trigger a "Sync" action if it exists server-side

            setTimeout(() => {
                setLastSyncTime(new Date().toLocaleString('vi-VN'))
                success('Đã đồng bộ hóa dữ liệu với máy chủ!')
                setIsBackingUp(false)
            }, 1000)
        } catch (err: any) {
            showError(err.message || 'Lỗi đồng bộ')
            setIsBackingUp(false)
        }
    }

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F7F9FC]">
            <HeaderBar variant="page" title="Quản lý dữ liệu" onBack={() => navigate('/settings')} />

            <main className="flex-1 overflow-y-auto min-h-0 w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-6">

                {/* Status Hero Card */}
                <div className="rounded-[40px] bg-white p-8 shadow-xl border border-slate-200 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-50 opacity-50 blur-3xl group-hover:bg-emerald-100 transition-colors" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 mb-4 animate-in zoom-in duration-500">
                            <LuCloud className="h-10 w-10" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Trạng thái Cloud</h2>
                        <p className="text-sm font-medium text-slate-500 mt-2">Dữ liệu của bạn hiện đã được đồng bộ trên máy chủ EVNGo.</p>

                        <div className="mt-6 flex flex-col gap-1 items-center">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Đã đồng bộ hóa
                            </div>
                            <span className="mt-2 text-[11px] text-slate-400 font-medium">Lần cuối: {lastSyncTime}</span>
                        </div>

                        <button
                            onClick={handleCloudSync}
                            disabled={isBackingUp}
                            className="mt-8 w-full py-4 rounded-3xl bg-slate-900 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isBackingUp ? 'Đang cập nhật...' : 'Đồng bộ hóa ngay'}
                        </button>
                    </div>
                </div>

                {/* Backup & Restore Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Backup */}
                    <button
                        onClick={handleLocalBackup}
                        disabled={isBackingUp}
                        className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-6 shadow-md border border-slate-200 transition-all hover:bg-slate-50 active:scale-95"
                    >
                        <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <LuDownload className="h-7 w-7" />
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-black text-slate-800">Sao lưu</span>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tải tệp JSON</span>
                        </div>
                    </button>

                    {/* Restore */}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleRestore}
                            disabled={isRestoring}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
                            title=""
                        />
                        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-6 shadow-md border border-slate-200 transition-all hover:bg-slate-50 group">
                            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <LuUpload className={`h-7 w-7 ${isRestoring ? 'animate-bounce' : ''}`} />
                            </div>
                            <div className="text-center">
                                <span className="block text-sm font-black text-slate-800">Khôi phục</span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tải lên tệp</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Card */}
                <div className="rounded-3xl bg-amber-50 p-6 border border-amber-100 flex gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-black text-amber-900">Bảo vệ quyền riêng tư</h4>
                        <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                            Bản sao lưu chứa toàn bộ thông tin phương tiện, chi phí và lộ trình của bạn. Hãy bảo quản tệp này ở nơi an toàn.
                            Dữ liệu phục hồi sẽ ghi đè các bản ghi có cùng mã định danh.
                        </p>
                    </div>
                </div>

                {/* Additional Settings */}
                <div className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-lg">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LuHistory className="h-5 w-5 text-slate-400" />
                            <span className="text-sm font-black text-slate-800">Tùy chọn nâng cao</span>
                        </div>
                    </div>
                    <div className="p-2">
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all rounded-2xl group">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                                    <LuShieldCheck className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Bảo mật đa lớp</p>
                                    <p className="text-[11px] text-slate-500 font-medium">Mã hóa tệp sao lưu</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold text-orange-600 border border-orange-100">SAU</div>
                        </button>

                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all rounded-2xl group">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                    <LuTerminal className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Xóa dữ liệu</p>
                                    <p className="text-[11px] text-slate-500 font-medium">Xóa sạch thông tin trên máy</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="h-10" />
            </main>

            <VehicleFooterNav isMainPage={false} />
        </div>
    )
}
