import type { PropsWithChildren } from 'react'

export const AuroraBackground = ({ children }: PropsWithChildren) => (
  <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-white via-blue-100 to-cyan-100 text-slate-900">
    <div className="absolute inset-0 bg-gradient-to-br from-sky-200 via-blue-200 via-cyan-200 to-teal-200 animate-gradient-xy" />

    <div className="absolute inset-0 opacity-60">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <path
          d="M0,400 Q300,200 600,400 T1200,400 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-1)"
          opacity="0.7"
        />
        <path
          d="M0,500 Q400,300 800,500 T1200,500 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-2)"
          opacity="0.6"
        />
        <path
          d="M0,600 Q500,400 1000,600 T1200,600 L1200,800 L0,800 Z"
          fill="url(#aurora-gradient-3)"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="aurora-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="aurora-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="aurora-gradient-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div className="absolute top-0 left-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-300 mix-blend-multiply blur-3xl opacity-50 animate-blob md:h-96 md:w-96" />
    <div className="absolute top-0 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-blue-300 mix-blend-multiply blur-3xl opacity-50 animate-blob animation-delay-2000 md:h-96 md:w-96" />
    <div className="absolute -bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-300 mix-blend-multiply blur-3xl opacity-50 animate-blob animation-delay-4000 md:h-96 md:w-96" />

    <div className="relative z-10 flex h-full w-full flex-col overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 sm:py-4">
        {children}
      </div>
    </div>
  </div>
)


