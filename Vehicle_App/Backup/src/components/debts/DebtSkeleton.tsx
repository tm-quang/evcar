/**
 * Debt Skeleton Components
 * Loading skeletons cho trang Quản lý Sổ nợ
 */

interface DebtListSkeletonProps {
    count?: number
}

export const DebtListSkeleton = ({ count = 3 }: DebtListSkeletonProps) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, index) => (
                <DebtCardSkeleton key={index} />
            ))}
        </div>
    )
}

export const DebtCardSkeleton = () => {
    return (
        <div className="rounded-3xl bg-white p-5 shadow-lg border border-slate-100 animate-pulse">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                        <div className="h-3 w-20 rounded bg-slate-200" />
                    </div>
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-200" />
            </div>

            {/* Amount */}
            <div className="mb-4">
                <div className="h-6 w-40 rounded bg-slate-200 mb-2" />
                <div className="h-3 w-24 rounded bg-slate-200" />
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-slate-200 mb-3" />

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                </div>
            </div>
        </div>
    )
}

export const DebtSummarySkeleton = () => {
    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[0, 1, 2].map((index) => (
                <div key={index} className="rounded-2xl bg-white p-3 sm:p-4 border border-slate-100 shadow-lg animate-pulse">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-200" />
                        <div className="h-3 w-16 rounded bg-slate-200" />
                    </div>
                    <div className="h-5 w-24 rounded bg-slate-200 mb-1" />
                    <div className="h-3 w-12 rounded bg-slate-200" />
                </div>
            ))}
        </div>
    )
}

