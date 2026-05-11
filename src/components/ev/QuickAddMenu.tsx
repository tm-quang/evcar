import { Zap, LayoutList, Route, Wrench } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppearance } from '../../contexts/AppearanceContext'
import { useNavigate } from 'react-router-dom'

type AddOption = {
    id: string
    label: string
    icon: any
    color: string
    path: string
}

const ADD_OPTIONS: AddOption[] = [
    { id: 'charging', label: 'Phiên sạc điện', icon: Zap, color: 'emerald', path: '/ev/charging' },
    { id: 'expense', label: 'Chi phí khác', icon: LayoutList, color: 'rose', path: '/ev/expenses' },
    { id: 'trip', label: 'Lộ trình mới', icon: Route, color: 'blue', path: '/ev/trips' },
    { id: 'maintenance', label: 'Bảo dưỡng xe', icon: Wrench, color: 'amber', path: '/ev/maintenance' },
]

type QuickAddMenuProps = {
    isOpen: boolean
    onClose: () => void
    anchor?: 'center' | 'bottom-right'
}

export function QuickAddMenu({ isOpen, onClose, anchor = 'center' }: QuickAddMenuProps) {
    const { isDarkMode } = useAppearance()
    const navigate = useNavigate()

    const handleAction = (path: string) => {
        navigate(path, { state: { openAddModal: true } })
        onClose()
    }

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 20 },
        visible: { 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 25,
                staggerChildren: 0.05
            }
        },
        exit: { 
            opacity: 0, 
            scale: 0.8, 
            y: 20,
            transition: { duration: 0.2 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    }

    const anchorStyles = anchor === 'center' 
        ? "bottom-[80px] left-1/2 -translate-x-1/2 origin-bottom" 
        : "bottom-[90px] right-4 origin-bottom-right"

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
                    />

                    {/* Menu */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`fixed z-[70] w-[220px] ${anchorStyles}`}
                    >
                        <div className={`overflow-hidden rounded-3xl p-2 shadow-2xl ${isDarkMode ? 'bg-slate-900/90 border border-slate-800' : 'bg-white/90 border border-slate-100'} backdrop-blur-md`}>
                            <div className="px-3 py-2 border-b border-slate-500/10 mb-1">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tạo mới nhanh</p>
                            </div>
                            <div className="space-y-1">
                                {ADD_OPTIONS.map((option) => {
                                    const Icon = option.icon
                                    const colorMap: Record<string, string> = {
                                        emerald: isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
                                        rose: isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600',
                                        blue: isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600',
                                        amber: isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600',
                                    }

                                    return (
                                        <motion.button
                                            key={option.id}
                                            variants={itemVariants}
                                            whileHover={{ x: 5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleAction(option.path)}
                                            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorMap[option.color]}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{option.label}</p>
                                                <p className="text-[10px] opacity-50 truncate">Thêm bản ghi mới</p>
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Decoration Arrow */}
                        <div className={`mx-auto h-3 w-3 rotate-45 -translate-y-1.5 ${isDarkMode ? 'bg-slate-900 border-r border-b border-slate-800' : 'bg-white border-r border-b border-slate-100'} ${anchor === 'bottom-right' ? 'mr-6' : ''}`} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
