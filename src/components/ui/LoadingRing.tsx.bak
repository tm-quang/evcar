type LoadingRingProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const LoadingRing = ({ size = 'md', className = '' }: LoadingRingProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const borderWidth = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-3',
    xl: 'border-4',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} ${borderWidth[size]} border-slate-200 border-t-sky-500 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Đang tải...</span>
      </div>
    </div>
  )
}

