import { Skeleton } from '../skeletons'

export const BudgetSkeleton = () => {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Skeleton variant="circular" width={32} height={32} />
          <div className="min-w-0 flex-1">
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} className="mt-1" />
          </div>
        </div>
        <Skeleton variant="rounded" width={60} height={24} />
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="20%" height={16} />
        </div>
        <Skeleton variant="rounded" width="100%" height={10} />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <div>
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={100} height={18} className="mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>
    </div>
  )
}

export const BudgetListSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BudgetSkeleton key={i} />
      ))}
    </div>
  )
}


