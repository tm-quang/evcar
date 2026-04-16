import { Skeleton } from './Skeleton'

type ReminderListSkeletonProps = {
  count?: number
}

export const ReminderListSkeleton = ({ count = 5 }: ReminderListSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-start gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="rounded" height={18} width="70%" />
              <Skeleton variant="rounded" height={14} width="50%" />
              <div className="flex gap-2 mt-3">
                <Skeleton variant="rounded" height={36} width={80} />
                <Skeleton variant="rounded" height={36} width={40} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


