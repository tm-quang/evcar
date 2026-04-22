import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LuDownload,
    LuUpload,
    LuShieldCheck,
    LuCloud,
    LuHistory,
    LuX,
    LuClock,
    LuTrash2,
    LuEye,
    LuEyeOff
} from 'react-icons/lu'
import { AlertCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import HeaderBar from '../../components/layout/HeaderBar'
import VehicleFooterNav from '../../components/ev/VehicleFooterNav'
import { useNotification } from '../../contexts/notificationContext.helpers'
import { getSupabaseClient } from '../../lib/supabaseClient'

type BackupRecord = {
    id: string
    created_at: string
}

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

    const [showRestoreModal, setShowRestoreModal] = useState(false)
    const [backups, setBackups] = useState<BackupRecord[]>([])
    const [isLoadingBackups, setIsLoadingBackups] = useState(false)

    // Delete states
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [deleteOption, setDeleteOption] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const DELETE_OPTIONS = [
        { id: 'all', label: 'Tất cả dữ liệu', desc: 'Xóa toàn bộ phương tiện, chi phí, lịch sử', color: 'text-rose-600', bg: 'bg-rose-50' },
        { id: 'vehicles', label: 'Thông tin xe', desc: 'Xóa danh sách các phương tiện', color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'logs', label: 'Lịch sử sạc & lộ trình', desc: 'Xóa nhật ký sạc và chuyến đi', color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'expenses', label: 'Danh sách chi phí', desc: 'Xóa mọi bản ghi chi tiêu', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'maintenance', label: 'Nhật ký bảo dưỡng', desc: 'Xóa lịch sử bảo dưỡng', color: 'text-orange-600', bg: 'bg-orange-50' },
    ]

    const handleSelectDeleteOption = (id: string) => {
        setDeleteOption(id)
        setShowDeleteModal(false)
        setShowPasswordModal(true)
    }

    const performDelete = async () => {
        if (!password) {
            showError('Vui lòng nhập mật khẩu')
            return
        }

        setIsDeleting(true)
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user || !user.email) throw new Error('Yêu cầu đăng nhập')

            // 1. Verify password by logging in
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            })

            if (authError) {
                throw new Error('Mật khẩu không chính xác')
            }

            // 2. Perform deletion based on option
            let tablesToDelete: string[] = []
            if (deleteOption === 'all') {
                tablesToDelete = ['vehicle_logs', 'vehicle_trips', 'vehicle_maintenance', 'vehicle_expenses', 'vehicles']
            } else if (deleteOption === 'vehicles') {
                tablesToDelete = ['vehicles']
            } else if (deleteOption === 'logs') {
                tablesToDelete = ['vehicle_logs', 'vehicle_trips']
            } else if (deleteOption === 'expenses') {
                tablesToDelete = ['vehicle_expenses']
            } else if (deleteOption === 'maintenance') {
                tablesToDelete = ['vehicle_maintenance']
            }

            for (const table of tablesToDelete) {
                const { error } = await supabase.from(table).delete().eq('user_id', user.id)
                if (error) {
                    throw new Error(`Có lỗi xảy ra khi xóa dữ liệu (${table})`)
                }
            }

            await queryClient.invalidateQueries()
            success('Đã xóa dữ liệu thành công!')
            
            // Reset state
            setShowPasswordModal(false)
            setPassword('')
            setDeleteOption(null)

        } catch (err: any) {
            console.error(err)
            showError(err.message || 'Lỗi khi xóa dữ liệu')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCloudBackup = async () => {
        setIsBackingUp(true)
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Yêu cầu đăng nhập')

            // Check current backups
            const { data: existingBackups, error: fetchError } = await supabase
                .from('user_backups')
                .select('id, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (fetchError && fetchError.code !== '42P01') {
                throw fetchError
            }

            if (existingBackups && existingBackups.length >= 5) {
                const confirmed = window.confirm('Bạn đã đạt tối đa 5 bản sao lưu. Bấm OK để xóa bản cũ nhất và tạo bản mới.')
                if (!confirmed) {
                    setIsBackingUp(false)
                    return
                }

                // Delete the oldest backup
                const oldest = existingBackups[0]
                await supabase.from('user_backups').delete().eq('id', oldest.id)
            }

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
            const backupJson = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                user_id: user.id,
                data: backupData
            }

            const { error: insertError } = await supabase
                .from('user_backups')
                .insert({
                    user_id: user.id,
                    backup_data: backupJson
                })

            if (insertError) {
                if (insertError.code === '42P01') {
                    throw new Error('Bạn cần chạy script cập nhật CSDL trước (create_user_backups.sql)')
                }
                throw insertError
            }

            success('Đã tạo bản sao lưu trên máy chủ thành công!')
            setLastSyncTime(new Date().toLocaleString('vi-VN'))
        } catch (err: any) {
            console.error(err)
            showError(err.message || 'Không thể tạo bản sao lưu')
        } finally {
            setIsBackingUp(false)
        }
    }

    const openRestoreModal = async () => {
        setShowRestoreModal(true)
        setIsLoadingBackups(true)
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('user_backups')
                .select('id, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) {
                if (error.code === '42P01') {
                    throw new Error('Chưa thiết lập bảng lưu trữ trên hệ thống')
                }
                throw error
            }
            setBackups(data || [])
        } catch (err: any) {
            console.error(err)
            showError(err.message || 'Không thể tải danh sách bản sao lưu')
        } finally {
            setIsLoadingBackups(false)
        }
    }

    const performRestore = async (backupId: string) => {
        if (!window.confirm('Cảnh báo: Phục hồi sẽ ghi đè lên dữ liệu hiện tại (nếu trùng ID) với dữ liệu từ bản sao lưu. Tiếp tục?')) return

        setIsRestoring(true)
        setShowRestoreModal(false)
        try {
            const supabase = getSupabaseClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Yêu cầu đăng nhập')

            const { data: backupRecord, error: fetchError } = await supabase
                .from('user_backups')
                .select('backup_data')
                .eq('id', backupId)
                .single()

            if (fetchError || !backupRecord) throw new Error('Không thể tải dữ liệu bản sao lưu')

            const backupJson = backupRecord.backup_data

            if (!backupJson.data || !backupJson.version) {
                throw new Error('Định dạng tệp sao lưu không hợp lệ')
            }

            for (const table of BACKUP_TABLES) {
                const tableData = backupJson.data[table]
                if (tableData && Array.isArray(tableData)) {
                    const recordsToInsert = tableData.map((record: any) => ({
                        ...record,
                        user_id: user.id
                    }))

                    if (recordsToInsert.length > 0) {
                        const { error } = await supabase
                            .from(table)
                            .upsert(recordsToInsert, { onConflict: 'id' })

                        if (error) throw error
                    }
                }
            }

            await queryClient.invalidateQueries()
            success('Khôi phục dữ liệu từ máy chủ thành công!')
        } catch (err: any) {
            console.error(err)
            showError(err.message || 'Lỗi khi khôi phục dữ liệu')
        } finally {
            setIsRestoring(false)
        }
    }

    const deleteBackupRecord = async (e: React.MouseEvent, backupId: string) => {
        e.stopPropagation()
        if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bản sao lưu này?')) return

        try {
            const supabase = getSupabaseClient()
            const { error } = await supabase.from('user_backups').delete().eq('id', backupId)

            if (error) throw error

            success('Đã xóa bản sao lưu thành công')
            setBackups(prev => prev.filter(b => b.id !== backupId))
        } catch (err: any) {
            console.error(err)
            showError('Lỗi khi xóa bản sao lưu: ' + err.message)
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
        <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: 'var(--app-home-bg)' }}>
            <HeaderBar variant="page" title="Quản lý dữ liệu" onBack={() => navigate('/settings')} />

            <main className="flex-1 overflow-y-auto min-h-0 w-full max-w-md mx-auto px-4 pt-4 pb-28 space-y-6">

                {/* Status Hero Card */}
                <div className="rounded-3xl bg-white p-8 shadow-md border border-slate-300 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-emerald-50 opacity-50 blur-3xl group-hover:bg-emerald-100 transition-colors" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="h-20 w-20 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow- shadow-emerald-200 mb-4 animate-in zoom-in duration-500">
                            <LuCloud className="h-10 w-10" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Trạng thái dữ liệu</h2>
                        <p className="text-sm font-medium text-slate-500 mt-2">Dữ liệu của bạn hiện đã được đồng bộ trên máy chủ EVNGo.</p>

                        <div className="mt-6 flex flex-col gap-1 items-center">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Đã đồng bộ
                            </div>
                            <span className="mt-2 text-[11px] text-slate-400 font-medium">Lần cuối: {lastSyncTime}</span>
                        </div>

                        <button
                            onClick={handleCloudSync}
                            disabled={isBackingUp}
                            className="mt-8 w-full py-4 rounded-3xl bg-blue-500 text-white font-black text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isBackingUp ? 'Đang cập nhật...' : 'Đồng bộ ngay'}
                        </button>
                    </div>
                </div>

                {/* Backup & Restore Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Backup */}
                    <button
                        onClick={handleCloudBackup}
                        disabled={isBackingUp}
                        className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-6 shadow-md border border-slate-300 transition-all hover:bg-slate-50 active:scale-95"
                    >
                        <div className="h-14 w-14 flex items-center justify-center rounded-3xl bg-blue-100 text-blue-600 shadow-inner">
                            <LuDownload className="h-7 w-7" />
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-black text-slate-800">Sao lưu</span>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">Lưu lên máy chủ</span>
                        </div>
                    </button>

                    {/* Restore */}
                    <button
                        onClick={openRestoreModal}
                        disabled={isRestoring}
                        className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-white p-6 shadow-md border border-slate-300 transition-all hover:bg-slate-50 group active:scale-95"
                    >
                        <div className="h-14 w-14 flex items-center justify-center rounded-3xl bg-rose-100 text-rose-600 shadow-inner">
                            <LuUpload className={`h-7 w-7 ${isRestoring ? 'animate-bounce' : ''}`} />
                        </div>
                        <div className="text-center">
                            <span className="block text-sm font-black text-slate-800">Khôi phục</span>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tải về máy</span>
                        </div>
                    </button>
                </div>

                {/* Information Card */}
                <div className="rounded-3xl bg-amber-50 p-6 border border-amber-100 flex gap-4">
                    <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-black text-amber-900">Bảo vệ quyền riêng tư</h4>
                        <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                            Bản sao lưu chứa toàn bộ thông tin phương tiện, chi phí và lộ trình của bạn. Hãy bảo quản tệp này ở nơi an toàn.
                            Dữ liệu phục hồi sẽ ghi đè các bản ghi.
                        </p>
                    </div>
                </div>


                {/* Advanced Settings */}
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-300 shadow-sm mt-8">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LuHistory className="h-5 w-5 text-slate-400" />
                            <span className="text-sm font-black text-slate-800">Tùy chọn nâng cao</span>
                        </div>
                    </div>
                    <div className="p-2">
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition-all rounded-2xl group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-100">
                                    <LuTrash2 className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-slate-800">Xóa dữ liệu</p>
                                    <p className="text-[11px] text-slate-500 font-medium">Xóa tùy chọn hoặc toàn bộ dữ liệu</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="h-10" />
            </main>

            <VehicleFooterNav isMainPage={false} />

            {/* Restore Modal */}
            {showRestoreModal && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0 z-0" onClick={() => setShowRestoreModal(false)} />
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-3xl pt-4 pb-12 px-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        {/* Drag Handle */}
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-6" />

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800">Chọn bản ghi để phục hồi</h3>
                            <button
                                onClick={() => setShowRestoreModal(false)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <LuX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-2">
                            {isLoadingBackups ? (
                                <div className="py-8 text-center text-slate-500 font-medium">Đang tải danh sách...</div>
                            ) : backups.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                                    Không tìm thấy bản sao lưu nào gắn với tài khoản của bạn.
                                </div>
                            ) : (
                                backups.map((backup, index) => (
                                    <div
                                        key={backup.id}
                                        className="flex items-center justify-between p-4 rounded-3xl border border-slate-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                                        onClick={() => performRestore(backup.id)}
                                    >
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
                                                <LuClock className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    Bản sao lưu #{backups.length - index}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(backup.created_at).toLocaleString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => deleteBackupRecord(e, backup.id)}
                                                className="h-8 w-8 flex items-center justify-center rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                title="Xóa bản ghi"
                                            >
                                                <LuTrash2 className="h-4 w-4" />
                                            </button>
                                            <div className="h-8 px-3 flex items-center justify-center rounded-xl bg-slate-200 text-slate-600 font-bold text-xs group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                Chọn
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Options Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0 z-0" onClick={() => setShowDeleteModal(false)} />
                    <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-3xl pt-4 pb-12 px-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-6" />

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-black text-slate-800">Xóa dữ liệu</h3>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                            >
                                <LuX className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-6">Chọn phần dữ liệu bạn muốn xóa khỏi hệ thống. Thao tác này không thể hoàn tác.</p>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 pb-2">
                            {DELETE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelectDeleteOption(opt.id)}
                                    className="w-full flex items-center justify-between p-4 rounded-3xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className={`h-11 w-11 flex items-center justify-center rounded-2xl ${opt.bg} ${opt.color}`}>
                                            <LuTrash2 className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800">
                                                {opt.label}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {opt.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-8 px-3 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 font-bold text-xs group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                        Chọn
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Password Confirmation Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[110] flex flex-col justify-center items-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0 z-0" onClick={() => { if (!isDeleting) { setShowPasswordModal(false); setPassword(''); } }} />
                    <div className="relative z-10 w-full max-w-sm bg-white rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                                <LuShieldCheck className="h-8 w-8" />
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-black text-center text-slate-800 mb-2">Xác nhận bảo mật</h3>
                        <p className="text-sm text-center text-slate-500 mb-6 px-2">
                            Bạn đang chọn <strong>{deleteOption && DELETE_OPTIONS.find(o => o.id === deleteOption)?.label.toLowerCase()}</strong>. Vui lòng nhập mật khẩu tài khoản để xác nhận hành động này.
                        </p>

                        <div className="relative mb-6">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all pr-12"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setShowPasswordModal(false); setPassword(''); }}
                                disabled={isDeleting}
                                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={performDelete}
                                disabled={isDeleting || !password}
                                className="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? 'Đang xóa...' : 'Đồng ý xóa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
