import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({ title, subtitle, actions, children, className }: SectionCardProps) {
  return (
    <div className={`bg-white border border-brand-100 rounded-panel p-5 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-brand-950 text-[14px] font-medium">{title}</h2>
          {subtitle && (
            <p className="text-brand-300 text-[12px] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}
