import { Skeleton } from './Skeleton'

export const TransactionModalSkeleton = () => {
  return (
    <div className="space-y-4 py-4">
      {/* Type toggle skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="rounded" height={48} width="100%" />
        <Skeleton variant="rounded" height={48} width="100%" />
      </div>

      {/* Wallet and Category skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={60} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={80} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
      </div>

      {/* Amount and Date skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={60} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
        <div className="space-y-2">
          <Skeleton variant="rounded" height={14} width={60} />
          <Skeleton variant="rounded" height={48} width="100%" />
        </div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2">
        <Skeleton variant="rounded" height={14} width={80} />
        <Skeleton variant="rounded" height={80} width="100%" />
      </div>

      {/* Tags skeleton */}
      <div className="space-y-2">
        <Skeleton variant="rounded" height={14} width={60} />
        <Skeleton variant="rounded" height={48} width="100%" />
      </div>
    </div>
  )
}


