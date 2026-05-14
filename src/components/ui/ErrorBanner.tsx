import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-4 rounded-card border border-red-200 bg-red-50 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={16}
          className="text-red-500 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div>
          <p className="text-red-700 text-[13px] font-medium">Something went wrong</p>
          <p className="text-red-500 text-[12px] mt-0.5">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 shrink-0 text-[12px] text-red-600 font-medium hover:text-red-800 transition-colors"
        >
          <RefreshCw size={13} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}
