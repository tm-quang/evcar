import { Skeleton } from './Skeleton'

export const AccountInfoSkeleton = () => {
  return (
    <div className="space-y-4 py-4">
      {/* Avatar skeleton */}
      <div className="flex flex-col items-center gap-4">
        <Skeleton variant="circular" height={120} width={120} />
        <Skeleton variant="rounded" height={16} width={120} />
      </div>

      {/* Form fields skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={80} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={80} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={80} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={80} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
      </div>
    </div>
  )
}


