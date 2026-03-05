import type { ConnectionState } from '../../hooks/useSupabaseHealth'

const statusCopy: Record<ConnectionState, string> = {
  idle: 'Chưa kiểm tra kết nối',
  connecting: 'Đang kiểm tra kết nối Supabase...',
  connected: 'Kết nối Supabase thành công 🎉',
  error: 'Không thể kết nối Supabase',
}

const statusColors: Record<ConnectionState, string> = {
  idle: 'bg-slate-600/50 text-slate-200',
  connecting: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40',
  connected: 'bg-green-500/20 text-green-200 ring-1 ring-green-400/50',
  error: 'bg-red-500/20 text-red-200 ring-1 ring-red-400/50',
}

type AuthStatusBadgeProps = {
  status: ConnectionState
}

export const AuthStatusBadge = ({ status }: AuthStatusBadgeProps) => (
  <span
    className={[
      'inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-medium tracking-wide backdrop-blur transition-colors',
      statusColors[status],
    ].join(' ')}
  >
    <span className="h-2 w-2 rounded-full bg-current" />
    {statusCopy[status]}
  </span>
)


