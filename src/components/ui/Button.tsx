import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-900 text-white hover:opacity-85 active:opacity-75 disabled:opacity-50',
  ghost:
    'bg-transparent border border-brand-100 text-brand-700 hover:bg-brand-50 active:bg-brand-100 disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-input font-medium',
        'transition-opacity duration-150 cursor-pointer select-none',
        'focus:border-brand-900',
        variantClasses[variant],
        sizeClasses[size],
        (disabled ?? loading) && 'cursor-not-allowed',
        className
      )}
      {...rest}
    >
      {loading && (
        <Loader2
          size={15}
          className="animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
