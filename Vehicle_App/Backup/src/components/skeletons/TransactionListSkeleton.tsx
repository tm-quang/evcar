import { Skeleton } from './Skeleton'

type TransactionListSkeletonProps = {
  count?: number
}

export const TransactionListSkeleton = ({ count = 3 }: TransactionListSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" height={48} width={48} />
            <div className="space-y-2">
              <Skeleton variant="rounded" height={16} width={150} />
              <Skeleton variant="rounded" height={12} width={100} />
            </div>
          </div>
          <Skeleton variant="rounded" height={16} width={80} />
        </div>
      ))}
    </div>
  )
}


