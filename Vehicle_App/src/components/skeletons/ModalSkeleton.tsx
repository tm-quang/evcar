import { Skeleton } from './Skeleton'

export const ModalSkeleton = () => {
  return (
    <div className="space-y-4 py-4">
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
      </div>
    </div>
  )
}


