import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // Log to error tracking service if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Clear problematic cache
    try {
      import('../lib/cache').then(({ clearAllCache }) => {
        clearAllCache()
      }).catch((e) => {
        console.warn('Could not clear cache:', e)
      })
    } catch (e) {
      console.warn('Could not clear cache:', e)
    }

    // Reload page to reset state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <FaExclamationTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="mb-2 text-xl font-bold text-slate-900">
                Đã xảy ra lỗi
              </h1>
              <p className="mb-6 text-sm text-slate-600">
                Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại.
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mb-4 w-full text-left">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                    Chi tiết lỗi (Development)
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <button
                onClick={this.handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 active:scale-95"
              >
                <FaRedo className="h-4 w-4" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary


