import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface RoleCardProps {
  id: string
  icon: ReactNode
  title: string
  description: string
  active: boolean
  onClick: () => void
  accentColor: string  // hex value used via style prop for dynamic coloring
  accentBg: string     // hex value for active background tint
}

export function RoleCard({
  id,
  icon,
  title,
  description,
  active,
  onClick,
  accentColor,
  accentBg,
}: RoleCardProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'relative flex flex-col items-start gap-2 rounded-card border p-4 text-left',
        'transition-all duration-150 cursor-pointer w-full',
        active
          ? 'border-current'
          : 'border-brand-100 hover:border-brand-300 hover:bg-brand-50'
      )}
      style={
        active
          ? { borderColor: accentColor, backgroundColor: accentBg }
          : undefined
      }
    >
      {/* Active indicator dot */}
      {active && (
        <span
          className="absolute top-3 right-3 h-2 w-2 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <span
        className="flex items-center justify-center rounded-md p-2"
        style={
          active
            ? { color: accentColor }
            : { color: '#9398B0' }
        }
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Text */}
      <div>
        <p
          className="text-[13px] font-medium leading-tight"
          style={active ? { color: accentColor } : { color: '#0F1235' }}
        >
          {title}
        </p>
        <p className="text-[12px] text-brand-300 mt-0.5 leading-snug">
          {description}
        </p>
      </div>
    </button>
  )
}
