import type { InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  error?: string
  onChange?: (value: string) => void
}

export function Input({
  label,
  error,
  id,
  onChange,
  className,
  ...rest
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[13px] font-medium text-brand-950"
      >
        {label}
      </label>
      <input
        id={inputId}
        onChange={(e) => onChange?.(e.target.value)}
        className={clsx(
          'w-full rounded-input border px-3.5 py-2.5 text-sm text-brand-950',
          'placeholder:text-brand-300 bg-white',
          'transition-colors duration-150',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-brand-100 focus:border-brand-900',
          rest.disabled && 'opacity-50 cursor-not-allowed bg-brand-50',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-[12px] text-red-500 font-medium"
        >
          {error}
        </p>
      )}
    </div>
  )
}
