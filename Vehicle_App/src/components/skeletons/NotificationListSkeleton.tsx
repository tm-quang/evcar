import { Skeleton } from './Skeleton'

type NotificationListSkeletonProps = {
  count?: number
}

export const NotificationListSkeleton = ({ count = 5 }: NotificationListSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-start gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="rounded" height={16} width="80%" />
              <Skeleton variant="rounded" height={14} width="60%" />
              <Skeleton variant="rounded" height={12} width="40%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


