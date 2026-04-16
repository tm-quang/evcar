import { Skeleton } from './Skeleton'

type WalletListSkeletonProps = {
  count?: number
}

export const WalletListSkeleton = ({ count = 3 }: WalletListSkeletonProps) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton variant="rounded" height={48} width={48} className="sm:h-14 sm:w-14" />
            <div className="space-y-2">
              <Skeleton variant="rounded" height={18} width={150} className="sm:h-5 sm:w-[180px]" />
              <Skeleton variant="rounded" height={14} width={100} className="sm:h-4 sm:w-[120px]" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton variant="rounded" height={20} width={100} className="sm:h-6 sm:w-[120px]" />
            <Skeleton variant="circular" height={36} width={36} className="sm:h-10 sm:w-10" />
            <Skeleton variant="circular" height={36} width={36} className="sm:h-10 sm:w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}


