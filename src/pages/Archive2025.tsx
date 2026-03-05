import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaWallet, FaListUl, FaCar, FaRegMoneyBillAlt, FaExclamationCircle } from 'react-icons/fa'
import { useArchiveStore } from '../store/useArchiveStore'
import HeaderBar from '../components/layout/HeaderBar'

const ArchiveDashboardPage = () => {
    const navigate = useNavigate()
    const setArchiveMode = useArchiveStore((state) => state.setArchiveMode)

    useEffect(() => {
        // Kích hoạt chế độ lưu trữ khi vào trang này
        setArchiveMode(true)

        // Khi unmount khỏi trang này, chúng ta không tự động tắt `isArchiveMode`
        // vì người dùng có thể click vào một mục và đi đến trang khác để xem dữ liệu lưu trữ.
        // Họ sẽ tắt bằng tay qua nút "Thoát Kho Lưu Trữ" ở Header hoặc ở đây.
    }, [setArchiveMode])

    const handleExitArchive = () => {
        setArchiveMode(false)
        navigate('/settings')
    }

    const archiveMenu = [
        {
            title: 'Thu Chi (Giao dịch)',
            icon: <FaRegMoneyBillAlt className="h-6 w-6" />,
            colors: 'bg-green-50 text-green-600',
            path: '/transactions',
            desc: 'Xem lại các giao dịch thu/chi năm 2025',
        },
        {
            title: 'Quản lý Tài chính',
            icon: <FaWallet className="h-6 w-6" />,
            colors: 'bg-sky-50 text-sky-600',
            path: '/budgets',
            desc: 'Hạn mức và ngân sách đã thiết lập',
        },
        {
            title: 'Ghi chú & Công việc',
            icon: <FaListUl className="h-6 w-6" />,
            colors: 'bg-amber-50 text-amber-600',
            path: '/notes-plans',
            desc: 'Công việc, nhắc nhở, danh sách mua sắm',
        },
        {
            title: 'Phương tiện',
            icon: <FaCar className="h-6 w-6" />,
            colors: 'bg-indigo-50 text-indigo-600',
            path: '/vehicles',
            desc: 'Lịch sử đổ xăng, sạc điện, bảo dưỡng',
        },
    ]

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
            <HeaderBar variant="page" title="Kho Lưu Trữ 2025" onBack={handleExitArchive} />
            <main className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mx-auto max-w-sm space-y-6">
                    <div className="rounded-2xl bg-amber-100 p-4 border border-amber-200 shadow-sm flex gap-3">
                        <FaExclamationCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800 leading-relaxed font-medium">
                            Đây là kho lưu trữ dữ liệu của năm 2025. Tại đây, bạn có thể xem lại, chỉnh sửa hoặc xóa dữ liệu cũ. Những dữ liệu này không được tính vào hệ thống chính từ năm 2026.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {archiveMenu.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => navigate(item.path)}
                                className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-md active:scale-95 text-left"
                            >
                                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.colors} shadow-inner`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-lg">{item.title}</h3>
                                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleExitArchive}
                        className="w-full mt-4 rounded-3xl bg-slate-800 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all active:scale-95 text-lg"
                    >
                        Thoát Kho Lưu Trữ
                    </button>
                </div>
            </main>
        </div>
    )
}

export default ArchiveDashboardPage

