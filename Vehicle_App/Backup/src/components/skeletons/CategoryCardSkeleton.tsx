import { Skeleton } from './Skeleton'

type CategoryCardSkeletonProps = {
  count?: number
}

export const CategoryCardSkeleton = ({ count = 6 }: CategoryCardSkeletonProps) => {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200/50 bg-white p-3 shadow-sm sm:gap-3 sm:p-3.5"
        >
          <Skeleton variant="rounded" height={56} width={56} className="rounded-2xl sm:h-16 sm:w-16" />
          <div className="w-full space-y-1.5 text-center">
            <Skeleton variant="rounded" height={14} width="80%" className="mx-auto" />
            <Skeleton variant="rounded" height={18} width="60%" className="mx-auto rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}


