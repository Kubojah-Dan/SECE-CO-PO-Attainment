import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { useToastStore, type Toast, type ToastType } from '@/hooks/useToast'

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-teal-50 border-teal-200 text-teal-700',
  error:   'bg-red-50 border-red-200 text-red-700',
  info:    'bg-brand-50 border-brand-100 text-brand-700',
}

const TOAST_ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} aria-hidden="true" />,
  error:   <AlertCircle size={15} aria-hidden="true" />,
  info:    <Info size={15} aria-hidden="true" />,
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'flex items-start gap-2.5 rounded-card border px-4 py-3 text-[13px]',
        'shadow-sm min-w-[260px] max-w-[360px]',
        'animate-in slide-in-from-bottom-2 duration-200',
        TOAST_STYLES[toast.type]
      )}
    >
      <span className="mt-0.5 shrink-0">{TOAST_ICON[toast.type]}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
