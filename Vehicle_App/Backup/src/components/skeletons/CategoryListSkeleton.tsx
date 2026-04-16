import { Skeleton } from './Skeleton'

type CategoryListSkeletonProps = {
  count?: number
}

export const CategoryListSkeleton = ({ count = 6 }: CategoryListSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {/* Divider */}
          {index > 0 && (
            <div className="mx-4 border-t border-slate-200" />
          )}
          <div className="px-4 py-1">
            {/* Category Item */}
            <div className="group flex items-center gap-2 px-3 py-2 rounded-xl">
              {/* Chevron Skeleton */}
              <Skeleton variant="rounded" width={28} height={28} className="rounded-lg" />
              
              {/* Icon Skeleton */}
              <Skeleton variant="circular" width={80} height={80} />
              
              {/* Name Skeleton */}
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton variant="rounded" height={16} width="60%" />
                <Skeleton variant="rounded" height={12} width="40%" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}


