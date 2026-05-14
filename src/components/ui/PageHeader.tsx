import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-5 mb-6 border-b border-brand-100">
      <div>
        <h1 className="text-brand-950 text-[18px] font-medium leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-brand-300 text-[12px] mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}
