import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'w-[480px]',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)

  /* Focus first focusable element on open */
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-modal-close])'
      )
      if (el) {
        firstFocusableRef.current = el
        el.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [open])

  /* Escape key closes */
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Focus trap */
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-950/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'relative bg-white border border-brand-100 rounded-panel flex flex-col',
          'max-h-[90vh] max-w-full',
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-100 shrink-0">
          <h2
            id="modal-title"
            className="text-brand-950 text-[16px] font-medium"
          >
            {title}
          </h2>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            aria-label="Close modal"
            className="text-brand-300 hover:text-brand-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-brand-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
