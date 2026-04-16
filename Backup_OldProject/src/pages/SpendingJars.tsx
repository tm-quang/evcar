import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaPlus,
  FaWallet,
  FaEdit,
  FaTrash,
  FaArrowDown,
  FaArrowUp,
  FaSync,
  FaTimes,
  FaHistory,
  FaPiggyBank,
  FaExclamationTriangle,
  FaFilter,
  FaChartPie,
  FaSearch,
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import * as React from 'react'

import HeaderBar from '../components/layout/HeaderBar'
import FooterNav from '../components/layout/FooterNav'
import { useNotification } from '../contexts/notificationContext.helpers'
import { useDialog } from '../contexts/dialogContext.helpers'
import { ModalFooterButtons } from '../components/ui/ModalFooterButtons'
import { NumberPadModal } from '../components/ui/NumberPadModal'
import {
  fetchJars,
  createJar,
  updateJar,
  deleteJar,
  addJarTransaction,
  fetchJarTransactions,
  resetMonthlyJar,
  enrichJar,
  formatJarCurrency,
  type JarRecord,
  type JarWithStats,
  type JarInsert,
  type JarTransactionRecord,
  type JarType,
} from '../lib/jarService'

// ─── Colour palette ──────────────────────────────────────────────────────────
const JAR_COLORS = [
  { label: 'Biển', value: '#0ea5e9' },
  { label: 'Xanh dương', value: '#3b82f6' },
  { label: 'Xanh đậm', value: '#1d4ed8' },
  { label: 'Xanh ngọc', value: '#14b8a6' },
  { label: 'Xanh lá', value: '#10b981' },
  { label: 'Lục bảo', value: '#047857' },
  { label: 'Chanh', value: '#84cc16' },
  { label: 'Vàng', value: '#eab308' },
  { label: 'Cam', value: '#f97316' },
  { label: 'Đỏ', value: '#ef4444' },
  { label: 'Hồng', value: '#ec4899' },
  { label: 'Hồng đào', value: '#f43f5e' },
  { label: 'Tím', value: '#8b5cf6' },
  { label: 'Tím đậm', value: '#6d28d9' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Nâu', value: '#a16207' },
  { label: 'Xám', value: '#64748b' },
  { label: 'Đen nhạt', value: '#334155' },
]

const JAR_ICONS = [
  // Sinh hoạt & Ăn uống
  '🍚', '🍜', '🍔', '🍎', '🥩', '💊', '🏥', '⚕️', '💧', '⚡', '📶', '🗑️',
  // Giao thông
  '⛽', '🚗', '🛵', '🚌', '🚕', '✈️',
  // Mua sắm & Làm đẹp
  '🛍️', '👗', '👟', '💍', '💄', '💇‍♀️', '🧴',
  // Gia đình & Thú cưng
  '🏠', '👶', '🧸', '🐾', '🐕', '🐈',
  // Giáo dục & Tiện ích
  '🎓', '📚', '📱', '💻', '🔧',
  // Giải trí & Sức khỏe
  '🎮', '🎬', '🎵', '🎟️', '💪', '🏋️', '🧘', '🏖️', '🏊', '🚲',
  // Quà tặng & Giao lưu
  '🎁', '🍺', '☕', '🍷', '👩‍❤️‍👨',
  // Tài chính & Đầu tư
  '💰', '🏦', '💳', '🧾', '🪙', '🌱', '📈'
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = formatJarCurrency

const pct = (v: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0


const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ─── Number-pad input helper ─────────────────────────────────────────────────
const parseVND = (v: string) => parseInt(v.replace(/[^\d]/g, ''), 10) || 0
const fmtInput = (v: string) => {
  const n = v.replace(/[^\d]/g, '')
  if (!n) return ''
  return new Intl.NumberFormat('vi-VN').format(parseInt(n, 10))
}

// ─── Empty state ─────────────────────────────────────────────────────────────
const EmptyJars = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-white p-10 text-center shadow-lg border border-slate-100">
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-6xl shadow-inner">
      🪣
    </div>
    <div>
      <h3 className="mb-2 text-xl font-bold text-slate-900">Chưa có hũ nào</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Tạo hũ chi tiêu để phân bổ ngân sách và kiểm soát tài chính theo từng mục tiêu
      </p>
    </div>
    <button
      onClick={onCreate}
      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-white font-semibold shadow-lg shadow-sky-500/30 active:scale-95 transition-all"
    >
      <FaPlus className="h-4 w-4" />
      Tạo hũ đầu tiên
    </button>
  </div>
)

// ─── Skeleton component ───────────────────────────────────────────────────────
const JarSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-slate-100 rounded-xl" />
          <div className="h-8 bg-slate-100 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
)

// Old JarCard removed

// ─── Detail sheet ─────────────────────────────────────────────────────────────
const JarDetailSheet = ({
  jar,
  onClose,
  onAdd,
  onSubtract,
  onReset,
  onEdit,
  onDelete,
}: {
  jar: JarWithStats
  onClose: () => void
  onAdd: () => void
  onSubtract: () => void
  onReset: () => void
  onEdit: () => void
  onDelete: () => void
}) => {
  const [txns, setTxns] = useState<JarTransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const limit = jar.jar_type === 'budget' ? jar.budget_amount : jar.target_amount
  const progress = limit ? pct(jar.current_amount, limit) : null

  useEffect(() => {
    fetchJarTransactions(jar.id)
      .then(setTxns)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jar.id])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#F7F9FC]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:scale-95 transition-all text-slate-600"
        >
          <FaTimes className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {/* Jar Icon Button (Info) */}
          <div
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shadow-sm text-2xl"
          >
            {jar.icon}
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); onEdit(); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 shadow-sm active:scale-95 transition-all"
            >
              <FaEdit className="h-4 w-4 text-slate-500" />
            </button>
            <button
              onClick={() => { onClose(); onDelete(); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-100 shadow-sm active:scale-95 transition-all"
            >
              <FaTrash className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-10">
        {/* Banner Card - Multi-layer backdrop like SummaryBanner */}
        <div className="mx-4 mt-4 relative overflow-hidden rounded-[28px] p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white/10"
             style={{ background: `linear-gradient(135deg, ${jar.color}, ${jar.color}dd)` }}>
          <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[150px] h-[150px] rounded-full bg-black/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">
                  {jar.jar_type === 'budget' ? 'Tổng chi tiêu' : 'Tổng tích lũy'}
                </p>
                <div className="flex items-baseline gap-1">
                   <p className="text-[28px] font-black leading-none tracking-tight">
                     {fmt(jar.current_amount).replace(' đ', '')}
                   </p>
                   <span className="text-[16px] font-bold underline decoration-2 underline-offset-4 opacity-70">đ</span>
                </div>
                {limit && (
                   <p className="text-white/60 text-[11px] font-bold mt-1.5">
                    / {fmt(limit)} {jar.jar_type === 'budget' ? 'ngân sách' : 'mục tiêu'}
                   </p>
                )}
              </div>
              <span className="text-5xl drop-shadow-xl opacity-90">{jar.icon}</span>
            </div>

            {/* Progress Section */}
            {progress !== null && (
              <div className="mt-4">
                 <div className="flex justify-between items-end mb-2 px-0.5">
                    <span className="text-[16px] font-black">{progress}%</span>
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                       {jar.jar_type === 'budget' ? 'Tiến trình' : 'Tiết kiệm'}
                    </span>
                 </div>
                 <div className="h-2 w-full bg-black/10 rounded-full p-[1px] backdrop-blur-sm border border-white/10 shadow-inner overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                 </div>
                 <div className="mt-3 flex">
                    <p className="text-[9px] font-bold text-white/70 bg-white/10 rounded-full py-1.5 px-3 backdrop-blur-md border border-white/5 shadow-sm">
                       {jar.jar_type === 'budget' && limit ? (
                          `CÒN LẠI: ${fmt(Math.max(0, limit - jar.current_amount))}`
                       ) : (
                          `CẦN THÊM: ${fmt(Math.max(0, (limit||0) - jar.current_amount))}`
                       )}
                    </p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Solid color background */}
        <div className="mx-4 mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onAdd}
            className="flex items-center justify-center gap-2.5 rounded-[20px] bg-emerald-500 p-3 shadow-[0_6px_16px_rgba(16,185,129,0.2)] active:scale-95 transition-all text-white border border-emerald-400/20"
          >
            <div className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center shadow-inner shrink-0">
              <FaArrowDown className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-black tracking-wide">Nạp tiền</span>
          </button>
          <button
            onClick={onSubtract}
            className="flex items-center justify-center gap-2.5 rounded-[20px] bg-rose-500 p-3 shadow-[0_6px_16px_rgba(244,63,94,0.2)] active:scale-95 transition-all text-white border border-rose-400/20"
          >
            <div className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center shadow-inner shrink-0">
              <FaArrowUp className="h-3.5 w-3.5" />
            </div>
            <span className="text-[13px] font-black tracking-wide">Chi tiêu</span>
          </button>
        </div>

        {/* Reset button if needed */}
        {jar.jar_type === 'budget' && jar.reset_monthly && (
          <div className="mx-4 mt-4">
             <button
               onClick={onReset}
               className="w-full flex items-center justify-center gap-2.5 rounded-[20px] bg-slate-900 py-4 text-white shadow-xl active:scale-95 transition-all font-bold text-sm"
             >
               <FaSync className="h-3.5 w-3.5" />
               Reset ngân sách tháng này
             </button>
          </div>
        )}

        {/* Timeline Transaction History */}
        <div className="mx-6 mt-8">
           <h3 className="mb-5 flex items-center gap-3 text-[15px] font-black text-slate-900">
             <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <FaHistory className="h-3 w-3" />
             </div>
             Lịch sử giao dịch
           </h3>

           {loading ? (
             <div className="space-y-6">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                     <div className="h-10 w-10 bg-slate-100 rounded-full shrink-0" />
                     <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-50 rounded w-1/4" />
                     </div>
                  </div>
                ))}
             </div>
           ) : txns.length === 0 ? (
             <div className="rounded-[32px] bg-white border-2 border-dashed border-slate-100 p-12 text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                   <FaHistory className="h-8 w-8" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Chưa có giao dịch nào</p>
             </div>
           ) : (
             <div className="relative pl-4 ml-1">
                {/* Timeline vertical line */}
                <div className="absolute left-[3px] top-4 bottom-4 w-[2px] bg-slate-200" />
                
                <div className="space-y-3">
                   {txns.map((tx) => (
                     <div key={tx.id} className="relative pl-7">
                        {/* Timeline dot INDICATOR */}
                        <div className={`absolute left-[-5px] top-4.5 h-[10px] w-[10px] rounded-full border-[2.5px] border-[#F7F9FC] shadow-sm z-10 ${tx.transaction_type === 'add' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        
                        <div className="bg-white rounded-[20px] p-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100 relative group active:scale-[0.98] transition-all">
                           <div className="flex items-center gap-3">
                              {/* Left icon circle */}
                              <div className={`h-9 w-9 rounded-[12px] flex items-center justify-center shrink-0 shadow-inner ${tx.transaction_type === 'add' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                 {tx.transaction_type === 'add' ? <FaArrowDown className="h-3 w-3" /> : <FaArrowUp className="h-3 w-3" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                 <p className="text-[13px] font-black text-slate-800 truncate leading-tight mb-0.5">
                                    {tx.description || (tx.transaction_type === 'add' ? 'Nạp tiền' : 'Chi tiêu')}
                                 </p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    {formatDateShort(tx.transaction_date)}
                                 </p>
                              </div>

                              <div className="text-right shrink-0">
                                 <p className={`text-[14px] font-black ${tx.transaction_type === 'add' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {tx.transaction_type === 'add' ? '+' : '-'}{fmt(tx.amount)}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
const DEFAULT_FORM: JarInsert = {
  name: '',
  icon: '🪣',
  color: '#0ea5e9',
  jar_type: 'budget',
  budget_amount: null,
  target_amount: null,
  reset_monthly: false,
  notes: null,
}

const JarFormSheet = ({
  editing,
  onClose,
  onSaved,
}: {
  editing: JarRecord | null
  onClose: () => void
  onSaved: () => void
}) => {
  const { success, error: showError } = useNotification()
  const [form, setForm] = useState<JarInsert>(() =>
    editing
      ? {
        name: editing.name,
        icon: editing.icon,
        color: editing.color,
        jar_type: editing.jar_type,
        budget_amount: editing.budget_amount,
        target_amount: editing.target_amount,
        current_amount: editing.current_amount,
        reset_monthly: editing.reset_monthly,
        notes: editing.notes,
      }
      : { ...DEFAULT_FORM }
  )
  const [submitting, setSubmitting] = useState(false)
  const [budgetPadOpen, setBudgetPadOpen] = useState(false)
  const [targetPadOpen, setTargetPadOpen] = useState(false)
  const [budgetStr, setBudgetStr] = useState(
    editing?.budget_amount ? fmtInput(String(editing.budget_amount)) : ''
  )
  const [targetStr, setTargetStr] = useState(
    editing?.target_amount ? fmtInput(String(editing.target_amount)) : ''
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!form.name.trim()) return showError('Vui lòng nhập tên hũ')

    setSubmitting(true)
    try {
      const payload: JarInsert = {
        ...form,
        name: form.name.trim(),
        budget_amount: form.jar_type === 'budget' && budgetStr ? parseVND(budgetStr) : null,
        target_amount: form.jar_type === 'savings' && targetStr ? parseVND(targetStr) : null,
      }
      if (editing) {
        await updateJar(editing.id, payload)
        success('Đã cập nhật hũ!')
      } else {
        await createJar(payload)
        success('Đã tạo hũ mới!')
      }
      onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không thể lưu hũ.')
    } finally {
      setSubmitting(false)
    }
  }

  const setType = (t: JarType) => setForm((f) => ({ ...f, jar_type: t }))

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#F7F9FC] overflow-hidden">
      <HeaderBar
        variant="page"
        title={editing ? 'CHỈNH SỬA HŨ' : 'TẠO HŨ MỚI'}
        onBack={onClose}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-md px-4 pt-2 pb-4">
          <form id="jar-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Jar type */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Loại hũ</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('budget')}
                  className={`flex items-center gap-3 rounded-3xl p-4 border-2 transition-all ${form.jar_type === 'budget'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-white text-slate-600'
                    }`}
                >
                  <FaWallet className="h-5 w-5 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Ngân sách</p>
                    <p className="text-xs opacity-70">Chi tiêu định kỳ</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType('savings')}
                  className={`flex items-center gap-3 rounded-3xl p-4 border-2 transition-all ${form.jar_type === 'savings'
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 bg-white text-slate-600'
                    }`}
                >
                  <FaPiggyBank className="h-5 w-5 shrink-0" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Tiết kiệm</p>
                    <p className="text-xs opacity-70">Mục tiêu tích lũy</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tên hũ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-3xl border-2 border-slate-200 bg-white p-4 text-base placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                placeholder="VD: Ăn uống, Xăng xe, Mua nhà..."
                required
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Biểu tượng</label>
              <div className="grid grid-cols-8 gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                {JAR_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-all ${form.icon === ic ? 'bg-slate-900 scale-110' : 'hover:bg-slate-100'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Colour picker */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Màu sắc</label>
              <div className="flex flex-wrap gap-2.5">
                {JAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                    className={`h-9 w-9 rounded-full border-4 transition-all ${form.color === c.value ? 'border-slate-800 scale-110' : 'border-white'}`}
                    style={{ background: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Budget / Target amount */}
            {form.jar_type === 'budget' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ngân sách tháng</label>
                <div className="relative">
                  <input
                    type="text"
                    value={budgetStr}
                    onFocus={() => setBudgetPadOpen(true)}
                    readOnly
                    className="w-full rounded-3xl border-2 border-slate-200 bg-white p-4 pr-12 text-base placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition cursor-pointer"
                    placeholder="Để trống nếu không giới hạn"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">₫</span>
                </div>
              </div>
            )}

            {form.jar_type === 'savings' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Số tiền mục tiêu</label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetStr}
                    onFocus={() => setTargetPadOpen(true)}
                    readOnly
                    className="w-full rounded-3xl border-2 border-slate-200 bg-white p-4 pr-12 text-base placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition cursor-pointer"
                    placeholder="Để trống nếu không có mục tiêu"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-slate-400">₫</span>
                </div>
              </div>
            )}

            {/* Reset monthly toggle - only for budget */}
            {form.jar_type === 'budget' && (
              <div className="flex items-center justify-between rounded-3xl border-2 border-slate-200 bg-white px-4 py-3.5">
                <div>
                  <p className="font-semibold text-slate-800">Tự reset mỗi tháng</p>
                  <p className="text-xs text-slate-500">Đặt lại số tiền về 0 đầu tháng</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reset_monthly: !f.reset_monthly }))}
                  className={`relative h-7 w-12 rounded-full transition-colors ${form.reset_monthly ? 'bg-sky-500' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${form.reset_monthly ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Ghi chú (tùy chọn)</label>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                rows={2}
                className="w-full rounded-3xl border-2 border-slate-200 bg-white p-4 text-base placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition resize-none"
                placeholder="Thêm ghi chú..."
              />
            </div>
          </form>
        </div>
      </main>

      <ModalFooterButtons
        onCancel={onClose}
        onConfirm={() => { }}
        confirmText={submitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo hũ'}
        isSubmitting={submitting}
        disabled={submitting}
        confirmButtonType="submit"
        formId="jar-form"
      />

      {/* Number pad modals */}
      <NumberPadModal
        isOpen={budgetPadOpen}
        onClose={() => setBudgetPadOpen(false)}
        value={budgetStr}
        onChange={setBudgetStr}
        onConfirm={() => setBudgetPadOpen(false)}
      />
      <NumberPadModal
        isOpen={targetPadOpen}
        onClose={() => setTargetPadOpen(false)}
        value={targetStr}
        onChange={setTargetStr}
        onConfirm={() => setTargetPadOpen(false)}
      />
    </div>
  )
}

// ─── Quick money modal ────────────────────────────────────────────────────────
const QuickMoneyModal = ({
  jar,
  mode,
  onClose,
  onDone,
}: {
  jar: JarWithStats
  mode: 'add' | 'subtract'
  onClose: () => void
  onDone: () => void
}) => {
  const { success, error: showError } = useNotification()
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [padOpen, setPadOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleConfirm = async () => {
    const n = parseVND(amount)
    if (n <= 0) return showError('Số tiền phải lớn hơn 0')
    setLoading(true)
    try {
      await addJarTransaction({
        jar_id: jar.id,
        transaction_type: mode,
        amount: n,
        description: desc.trim() || null,
      })
      success(mode === 'add' ? `Đã nạp ${fmt(n)} vào "${jar.name}"` : `Đã ghi nhận chi ${fmt(n)} từ "${jar.name}"`)
      onDone()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 rounded-t-3xl bg-white shadow-2xl">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pb-2">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-white ${mode === 'add' ? 'bg-emerald-500' : 'bg-rose-500'}`}
            >
              {mode === 'add' ? <FaArrowDown className="h-5 w-5" /> : <FaArrowUp className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                {mode === 'add' ? 'Nạp tiền vào' : 'Chi tiêu từ'}
              </h3>
              <p className="text-sm text-slate-500">
                {jar.icon} {jar.name} — Hiện có: {fmt(jar.current_amount)}
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            {/* Amount */}
            <div className="relative">
              <input
                type="text"
                value={amount}
                onFocus={() => setPadOpen(true)}
                readOnly
                placeholder="Nhập số tiền..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 pr-12 text-lg font-bold placeholder:text-slate-400 focus:border-sky-500 focus:outline-none cursor-pointer"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₫</span>
            </div>
            {/* Description */}
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Mô tả (tùy chọn)..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-base placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pb-safe">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-100 py-3.5 font-bold text-slate-700 active:scale-95 transition"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !amount}
              className={`flex-1 rounded-2xl py-3.5 font-bold text-white active:scale-95 transition disabled:opacity-50 ${mode === 'add' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-rose-500 to-red-500'}`}
            >
              {loading ? 'Đang lưu...' : mode === 'add' ? 'Nạp tiền' : 'Chi tiêu'}
            </button>
          </div>
          {/* Safe area spacer */}
          <div className="h-4" />
        </div>
      </div>

      <NumberPadModal
        isOpen={padOpen}
        onClose={() => setPadOpen(false)}
        value={amount}
        onChange={setAmount}
        onConfirm={() => setPadOpen(false)}
      />
    </div>
  )
}

// ─── Compact Jar Card (Dashboard View) ─────────────────────────────────────────
const CompactJarCard = ({ jar, onClick }: { jar: JarWithStats; onClick: () => void }) => {
  const limit = jar.jar_type === 'budget' ? jar.budget_amount : jar.target_amount
  const progress = limit ? pct(jar.current_amount, limit) : null
  const isOverBudget = jar.jar_type === 'budget' && limit && jar.current_amount > limit
  const isReachedTarget = jar.jar_type === 'savings' && limit && jar.current_amount >= limit

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[24px] p-5 transition-all active:scale-[0.98] 
        ${isOverBudget ? 'ring-4 ring-red-500/50 animate-pulse' : ''} 
        ${isReachedTarget ? 'ring-4 ring-yellow-400/50' : ''}`}
      style={{
        boxShadow: isReachedTarget 
          ? `0 12px 32px rgba(250, 204, 21, 0.4)` 
          : isOverBudget 
            ? `0 12px 32px rgba(239, 68, 68, 0.4)`
            : `0 8px 24px ${jar.color}40`,
        background: isReachedTarget
          ? `linear-gradient(135deg, #f59e0b, #fbbf24)`
          : `linear-gradient(135deg, ${jar.color}, ${jar.color}dd)`,
        color: '#ffffff'
      }}
    >
      {/* Glossy Overlay for Success/Warning */}
      {(isReachedTarget || isOverBudget) && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-[16px] text-2xl bg-white/20 backdrop-blur-md shadow-inner border border-white/20 transition-transform group-hover:scale-110 duration-500`}
          >
            {isReachedTarget ? '🏆' : jar.icon}
          </div>
          <div>
            <h3 className="font-bold text-white text-[15px] mb-0.5 flex items-center gap-1.5">
              {jar.name}
              {isReachedTarget && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Đạt mục tiêu</span>}
            </h3>
            <span className="text-[10px] uppercase font-bold text-white/70 tracking-wider">
              {jar.jar_type === 'budget' ? 'Ngân sách' : 'Tiết kiệm'}
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end justify-center">
          {progress !== null && (
            <span className={`text-[16px] font-black text-white ${isReachedTarget ? 'text-yellow-100' : ''}`}>
              {progress === Infinity ? '0' : progress}%
            </span>
          )}
          {isOverBudget && (
            <span className="text-[9px] font-extrabold text-white uppercase tracking-tighter mt-1 bg-red-600 px-2 py-0.5 rounded-full shadow-lg border border-red-400/50 flex items-center gap-1">
              <FaHistory className="h-2 w-2 animate-spin-slow" /> CẢNH BÁO
            </span>
          )}
          {isReachedTarget && (
            <span className="text-[9px] font-extrabold text-white uppercase tracking-tighter mt-1 bg-emerald-600 px-2 py-0.5 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-1">
              ✨ HOÀN THÀNH
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 mt-1">
        {progress !== null ? (
          <div className={`h-2.5 w-full overflow-hidden rounded-full bg-black/15 shadow-inner border border-white/5`}>
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-300' : isReachedTarget ? 'bg-white' : 'bg-white/90'}`}
              style={{ 
                width: `${Math.min(100, progress)}%`, 
                boxShadow: isOverBudget ? '0 0 10px rgba(252,165,165,0.8)' : '0 0 10px rgba(255,255,255,0.5)' 
              }}
            />
          </div>
        ) : (
          <div className="h-2 w-full rounded-full bg-black/15 shadow-inner" />
        )}
      </div>

      <div className="flex items-center justify-between text-[13px] mt-1.5 font-medium">
        <span className="font-bold text-white tracking-wide drop-shadow-sm">{fmt(jar.current_amount)}</span>
        {limit && (
          <span className="text-white/70 text-[11px] font-bold">/ {fmt(limit)}</span>
        )}
      </div>
    </div>
  )
}

// ─── Summary Banner ───────────────────────────────────────────────────────────
const SummaryBanner = ({ jars }: { jars: JarWithStats[] }) => {
  const totalAllocated = jars.reduce((s, j) => s + j.current_amount, 0)
  const warningCount = jars.filter(j => j.status === 'warning' || j.status === 'danger' || j.status === 'critical').length

  return (
    <div className="rounded-[32px] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] p-8 text-white mb-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-800">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-20%] right-[-10%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-sky-500/15 to-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[200px] h-[200px] rounded-full bg-gradient-to-tr from-indigo-500/15 to-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between min-h-[150px]">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em] mb-2.5">Tổng số tiền trong hũ</p>
            <div className="flex items-end">
              {totalAllocated === 0 ? (
                <p className="text-[44px] leading-[1] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">0<span className="text-[28px] text-white/50 underline decoration-2 underline-offset-4 tracking-normal ml-1">đ</span></p>
              ) : (
                <p className="text-[44px] leading-[1] font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">{fmt(totalAllocated)}</p>
              )}
            </div>
          </div>
          <div className="h-[48px] w-[48px] flex-shrink-0 rounded-[18px] bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
            <FaWallet className="h-[20px] w-[20px] text-sky-400" />
          </div>
        </div>

        <div className="flex gap-12 border-t border-white/10 pt-5 mt-8">
          <div>
            <p className="text-[11px] text-white/50 uppercase font-bold tracking-widest mb-1.5">Tổng số hũ</p>
            <p className="text-[16px] font-bold text-white/90">{jars.length}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/50 uppercase font-bold tracking-widest mb-1.5">Cảnh báo</p>
            <div className="flex items-center gap-2">
              {warningCount > 0 ? (
                <div className="flex items-center gap-1.5 bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/30 animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-[14px] font-black text-red-400">{warningCount} vượt mức</span>
                </div>
              ) : (
                <p className="text-[16px] font-bold text-white/30 tracking-tight">0 vượt mức</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Filter & Report Row ───────────────────────────────────────────────────────
const FilterReportRow = ({ onFilterClick, onReportClick }: { onFilterClick: () => void, onReportClick: () => void }) => {
  return (
    <div className="flex gap-4 mb-6 mt-[-4px]">
      <button onClick={onFilterClick} className="flex-1 rounded-[20px] bg-white p-4 shadow-md flex items-center justify-center gap-2.5 transition-all outline-none active:scale-95 border border-slate-100/80 hover:border-sky-200">
        <div className="h-8 w-8 rounded-full bg-[#F0F4F8] flex items-center justify-center">
          <FaFilter className="text-slate-500 h-[14px] w-[14px]" />
        </div>
        <span className="text-[14px] font-bold text-slate-800">Bộ lọc</span>
      </button>
      <button onClick={onReportClick} className="flex-1 rounded-[20px] bg-white p-4 shadow-md flex items-center justify-center gap-2.5 transition-all outline-none active:scale-95 border border-slate-100/80 hover:border-sky-200">
        <div className="h-8 w-8 rounded-full bg-[#F0F4F8] flex items-center justify-center">
          <FaChartPie className="text-slate-500 h-[14px] w-[14px]" />
        </div>
        <span className="text-[14px] font-bold text-slate-800">Báo cáo</span>
      </button>
    </div>
  )
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────
const FilterSheet = ({
  open,
  onClose,
  filterType,
  setFilterType,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
}: {
  open: boolean;
  onClose: () => void;
  filterType: 'all' | 'budget' | 'savings';
  setFilterType: (v: 'all' | 'budget' | 'savings') => void;
  sortBy: 'name' | 'progressDesc' | 'progressAsc';
  setSortBy: (v: 'name' | 'progressDesc' | 'progressAsc') => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[400] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 rounded-t-[32px] bg-white shadow-2xl pb-safe">
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FaFilter className="text-sky-500 h-4 w-4" /> BỘ LỌC & SẮP XẾP
            </h3>
            <button onClick={onClose} className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-95 transition-all">
              <FaTimes className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Tìm kiếm</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tên hũ, loại hũ, ghi chú..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] p-4 pl-12 text-sm font-medium focus:border-sky-500 outline-none transition-all placeholder:font-normal"
                />
                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Loại Hũ</label>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'budget', label: 'Ngân sách' },
                  { id: 'savings', label: 'Tiết kiệm' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id as any)}
                    className={`flex-1 rounded-[16px] py-3.5 text-sm font-bold transition-all border-2 ${filterType === t.id ? 'bg-sky-50/80 border-sky-500 text-sky-700 shadow-[0_4px_12px_rgba(14,165,233,0.15)]' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Sắp xếp theo</label>
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'name', label: 'Tên (A-Z)' },
                  { id: 'progressDesc', label: 'Tiến độ cao nhất' },
                  { id: 'progressAsc', label: 'Tiến độ thấp nhất' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id as any)}
                    className={`rounded-[16px] py-4 px-5 text-sm font-bold text-left transition-all border-2 ${sortBy === s.id ? 'bg-sky-50/80 border-sky-500 text-sky-700 shadow-[0_4px_12px_rgba(14,165,233,0.15)]' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      {s.label}
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${sortBy === s.id ? 'border-sky-500' : 'border-slate-200'}`}>
                        {sortBy === s.id && <div className="h-2 w-2 rounded-full bg-sky-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-bold text-[15px] py-4 rounded-[20px] mt-8 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(15,23,42,0.25)]"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab filter ───────────────────────────────────────────────────────────────
// ─── Main Page ────────────────────────────────────────────────────────────────
export const SpendingJarsPage = () => {
  const { success, error: showError } = useNotification()
  const { showConfirm } = useDialog()
  const navigate = useNavigate()

  const [jars, setJars] = useState<JarWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editingJar, setEditingJar] = useState<JarRecord | null>(null)
  const [detailJar, setDetailJar] = useState<JarWithStats | null>(null)
  const [moneyModal, setMoneyModal] = useState<{ jar: JarWithStats; mode: 'add' | 'subtract' } | null>(null)

  // Filter & Sort State
  const [filterType, setFilterType] = useState<'all' | 'budget' | 'savings'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'progressDesc' | 'progressAsc'>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const loadJars = useCallback(async () => {
    setLoading(true)
    setDbError(null)
    try {
      const data = await fetchJars()
      setJars(data.map(enrichJar))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        setDbError('Cần tạo bảng database. Vui lòng chạy SQL script trong Supabase.')
      } else {
        showError('Không thể tải danh sách hũ')
      }
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => { loadJars() }, [loadJars])

  const handleDelete = async (jar: JarWithStats) => {
    const ok = await showConfirm(`Xóa hũ "${jar.name}"? Toàn bộ lịch sử giao dịch sẽ bị xóa.`)
    if (!ok) return
    try {
      await deleteJar(jar.id)
      success('Đã xóa hũ!')
      loadJars()
    } catch {
      showError('Không thể xóa hũ')
    }
  }

  const handleReset = async (jar: JarWithStats) => {
    const ok = await showConfirm(`Reset số tiền trong hũ "${jar.name}" về 0?`)
    if (!ok) return
    try {
      await resetMonthlyJar(jar.id)
      success('Đã reset hũ!')
      loadJars()
      if (detailJar?.id === jar.id) {
        setDetailJar(null)
      }
    } catch {
      showError('Không thể reset hũ')
    }
  }

  const openAdd = () => { setEditingJar(null); setFormOpen(true) }
  const openEdit = (j: JarRecord) => { setEditingJar(j); setFormOpen(true) }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F7F9FC] text-slate-900">
      <HeaderBar
        variant="page"
        title="HŨ CHI TIÊU"
        onReload={loadJars}
        isReloading={loading}
      />

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-2 pb-28">

          {/* Empty spacer since HeaderBar has the button */}
          <div className="h-4" />

          {/* DB error */}
          {dbError && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                  <FaExclamationTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-1">Cần thiết lập Database</h3>
                  <p className="text-sm text-amber-800 mb-3">{dbError}</p>
                  <div className="rounded-xl bg-white/80 p-3 border border-amber-200 mb-3">
                    <p className="text-xs font-bold text-amber-900 mb-2">Hướng dẫn:</p>
                    <ol className="list-decimal list-inside text-xs text-amber-800 space-y-1">
                      <li>Mở Supabase Dashboard → SQL Editor</li>
                      <li>Chạy SQL script trong file <code className="bg-amber-100 px-1 rounded">jarService.ts</code> (phần comment cuối file)</li>
                      <li>Quay lại và nhấn Làm mới</li>
                    </ol>
                  </div>
                  <button
                    onClick={loadJars}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white active:scale-95 transition"
                  >
                    <FaSync className="h-3.5 w-3.5" />
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary & Filters */}
          {!dbError && !loading && jars.length > 0 && (
            <>
              <SummaryBanner jars={jars} />
              <FilterReportRow onFilterClick={() => setFilterSheetOpen(true)} onReportClick={() => navigate('/spending-jars/report')} />
            </>
          )}

          {/* Content */}
          {loading ? (
            <JarSkeleton />
          ) : jars.length === 0 ? (
            <EmptyJars onCreate={openAdd} />
          ) : (
            <JarList
              jars={jars}
              filterType={filterType}
              sortBy={sortBy}
              searchQuery={searchQuery}
              onJarClick={(jar) => setDetailJar(jar)}
            />
          )}
        </div>
      </main>

      <FooterNav onAddClick={openAdd} />

      {/* Detail Sheet */}
      {detailJar && (
        <JarDetailSheet
          jar={detailJar}
          onClose={() => { setDetailJar(null); loadJars() }}
          onAdd={() => { setMoneyModal({ jar: detailJar, mode: 'add' }) }}
          onSubtract={() => { setMoneyModal({ jar: detailJar, mode: 'subtract' }) }}
          onReset={() => handleReset(detailJar)}
          onEdit={() => openEdit(detailJar)}
          onDelete={() => handleDelete(detailJar)}
        />
      )}

      {/* Form Sheet */}
      {formOpen && (
        <JarFormSheet
          editing={editingJar}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); loadJars() }}
        />
      )}

      {/* Quick Money Modal */}
      {moneyModal && (
        <QuickMoneyModal
          jar={moneyModal.jar}
          mode={moneyModal.mode}
          onClose={() => setMoneyModal(null)}
          onDone={() => {
            setMoneyModal(null)
            loadJars()
            if (detailJar) {
              fetchJarTransactions(detailJar.id)
                .then(() => {
                  fetchJars()
                    .then((data) => {
                      const updated = data.map(enrichJar).find((j) => j.id === detailJar.id)
                      if (updated) setDetailJar(updated)
                    })
                    .catch(console.error)
                })
                .catch(console.error)
            }
          }}
        />
      )}

      {/* Filter Sheet Modal */}
      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filterType={filterType}
        setFilterType={setFilterType}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  )
}

// Sub-component for rendering the filtered list
const JarList = ({
  jars,
  filterType,
  sortBy,
  searchQuery,
  onJarClick
}: {
  jars: JarWithStats[]
  filterType: 'all' | 'budget' | 'savings'
  sortBy: 'name' | 'progressDesc' | 'progressAsc'
  searchQuery: string
  onJarClick: (jar: JarWithStats) => void
}) => {
  const filteredSortedJars = React.useMemo(() => {
    let result = jars

    // type filter
    if (filterType !== 'all') {
      result = result.filter(j => j.jar_type === filterType)
    }

    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(j => j.name.toLowerCase().includes(q) || j.notes?.toLowerCase().includes(q) || (j.jar_type === 'budget' ? 'ngân sách' : 'tiết kiệm').includes(q))
    }

    // sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      } else {
        const getProgress = (j: JarWithStats) => {
          const limit = j.jar_type === 'budget' ? j.budget_amount : j.target_amount
          return limit ? j.current_amount / limit : 0
        }
        const pA = getProgress(a)
        const pB = getProgress(b)
        return sortBy === 'progressDesc' ? pB - pA : pA - pB
      }
    })

    return result
  }, [jars, filterType, sortBy, searchQuery])

  const budgetJars = filteredSortedJars.filter(j => j.jar_type === 'budget')
  const savingsJars = filteredSortedJars.filter(j => j.jar_type === 'savings')

  if (filteredSortedJars.length === 0) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center">
        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaFilter className="text-slate-300 h-6 w-6" />
        </div>
        <p className="text-slate-500 font-medium">Không tìm thấy hũ nào phù hợp</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {budgetJars.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span>📅</span> NGÂN SÁCH HÀNG THÁNG
            </h2>
            <span className="text-[13px] text-slate-500 font-bold">{budgetJars.length} hũ</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {budgetJars.map((jar) => (
              <CompactJarCard key={jar.id} jar={jar} onClick={() => onJarClick(jar)} />
            ))}
          </div>
        </section>
      )}

      {savingsJars.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-2 mt-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span>🎯</span> MỤC TIÊU TIẾT KIỆM
            </h2>
            <span className="text-[13px] text-slate-500 font-bold">{savingsJars.length} hũ</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {savingsJars.map((jar) => (
              <CompactJarCard key={jar.id} jar={jar} onClick={() => onJarClick(jar)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default SpendingJarsPage
