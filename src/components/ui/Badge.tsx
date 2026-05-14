import type { ReactNode } from 'react'

interface BadgeProps {
  label: string
  icon?: ReactNode
  bg?: string   // hex or tailwind-compatible value
  color?: string
}

export function Badge({ label, icon, bg, color }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  )
}
