import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FaTimes, FaCog, FaMoon, FaSun, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { clearUserCache } from '../../lib/userCache'
import { queryClient } from '../../lib/react-query'
import { useAppearance } from '../../contexts/AppearanceContext'

type ProfileModalProps = {
    isOpen: boolean
    onClose: () => void
    userName: string
    avatarUrl?: string
    avatarText: string
}

export const ProfileModal = ({ isOpen, onClose, userName, avatarUrl, avatarText }: ProfileModalProps) => {
    const navigate = useNavigate()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const { isDarkMode, toggleDarkMode } = useAppearance()

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = ''
            }
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            const supabase = getSupabaseClient()
            await supabase.auth.signOut({ scope: 'local' })
            clearUserCache()
            queryClient.clear()
            window.location.href = '/login'
        } catch (error) {
            console.error('Error logging out:', error)
            setIsLoggingOut(false)
        }
    }



    const modalContent = (
        <>
            <div
                className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-300 touch-none"
                onClick={onClose}
            />
            <div className={`fixed inset-x-0 bottom-0 z-[100] flex flex-col rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[90vh] transition-colors duration-300 ${isDarkMode
                ? 'bg-slate-900 border-t border-slate-700'
                : 'bg-white'
                }`}>
                {/* Handle bar */}
                <div className="flex shrink-0 justify-center pt-3 pb-1" onClick={onClose}>
                    <div className={`h-1.5 w-12 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>

                <div className="px-6 pb-8 pt-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8 shrink-0">
                        <div className="flex items-center gap-4">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={userName}
                                    className="h-16 w-16 rounded-full object-cover ring-4 ring-sky-500/20 shadow-lg"
                                />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-2xl font-bold text-white shadow-lg ring-4 ring-sky-500/20">
                                    {avatarText}
                                </div>
                            )}
                            <div>
                                <h3 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {userName}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-[10px] font-bold text-red-400 border border-red-500/20">
                                        <FaShieldAlt className="h-2.5 w-2.5" /> Admin
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            <FaTimes className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {/* Preferences section */}
                        <div className="mb-4">
                            <p className={`px-2 text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Tùy chọn
                            </p>

                            {/* Privacy toggle */}
                            {/* <button
                                onClick={toggleHideBalance}
                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                                    isDarkMode
                                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                                        : 'bg-white border-slate-100 hover:bg-slate-50'
                                }`}
                            >
                                <div className={`flex items-center gap-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                                        <FaEyeSlash className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold">Chế độ riêng tư</span>
                                </div>
                                <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${hideBalance ? 'bg-orange-500' : isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${hideBalance ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </button> */}

                            {/* Dark mode toggle */}
                            <button
                                onClick={() => {
                                    toggleDarkMode()
                                }}
                                className={`w-full flex items-center justify-between p-3.5 mt-2 rounded-3xl border transition-all active:scale-[0.98] ${isDarkMode
                                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                                    : 'bg-white border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`flex items-center gap-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${isDarkMode ? 'bg-amber-500/50 text-amber-400' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        {isDarkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
                                    </div>
                                    <div className="text-left">
                                        <span className="font-semibold block">{isDarkMode ? 'Sáng (Light Mode)' : 'Tối (Dark Mode)'}</span>
                                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                                            {isDarkMode ? 'Hiện đang ở chế độ tối' : 'Nhấn để bật chế độ tối'}
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-11 h-6 rounded-full transition-all flex items-center px-1 ${isDarkMode ? 'bg-amber-600 shadow-md shadow-amber-500/30' : 'bg-slate-200'
                                    }`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        </div>

                        {/* System section */}
                        <div className="mb-4">
                            <p className={`px-2 text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Hệ thống
                            </p>

                            <button
                                onClick={() => {
                                    onClose()
                                    navigate('/settings')
                                }}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-3xl border transition-all active:scale-[0.98] font-semibold ${isDarkMode
                                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                                    : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    <FaCog className="h-5 w-5" />
                                </div>
                                Cài đặt ứng dụng
                            </button>
                        </div>

                        {/* Logout */}
                        <div className="pt-2">
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isDarkMode
                                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200'
                                    }`}
                            >
                                {isLoggingOut ? (
                                    <span className="h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <FaSignOutAlt className="h-5 w-5" /> Đăng xuất
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

    return createPortal(modalContent, document.body)
}
