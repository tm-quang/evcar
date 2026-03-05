import { Skeleton } from './Skeleton'

export const WalletCardSkeleton = () => {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-300 to-slate-400 p-5">
      {/* Decorative waves */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-20">
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
          <path
            d="M0,50 Q100,30 200,50 T400,50 L400,100 L0,100 Z"
            fill="white"
          />
          <path
            d="M0,70 Q150,50 300,70 T400,70 L400,100 L0,100 Z"
            fill="white"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Content skeleton */}
      <div className="relative z-10 flex h-full flex-col justify-between">
        {/* Top section */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton variant="rounded" height={12} width="40%" />
            <Skeleton variant="rounded" height={20} width="60%" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" height={16} width={50} />
            <Skeleton variant="circular" height={24} width={24} />
          </div>
        </div>

        {/* Balance */}
        <div className="mt-3">
          <Skeleton variant="rounded" height={36} width="70%" />
        </div>

        {/* Bottom section */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
          <div className="flex-1 space-y-1">
            <Skeleton variant="rounded" height={12} width="50%" />
            <Skeleton variant="rounded" height={16} width="60%" />
          </div>
          <Skeleton variant="rectangular" height={24} width={1} />
          <div className="flex-1 space-y-1 text-right">
            <Skeleton variant="rounded" height={12} width="50%" className="ml-auto" />
            <Skeleton variant="rounded" height={16} width="60%" className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}


