import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

type BarColor = 'teal' | 'amber' | 'red'

interface ProgressBarProps {
  value: number
  color?: BarColor
  showLabel?: boolean
}

const COLOR_CLASSES: Record<BarColor, string> = {
  teal:  'bg-teal-400',
  amber: 'bg-amber-400',
  red:   'bg-red-400',
}

export function ProgressBar({
  value,
  color = 'teal',
  showLabel = false,
}: ProgressBarProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const pct = Math.min(Math.max(value, 0), 100)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'width 600ms cubic-bezier(0.4,0,0.2,1)'
      el.style.width = `${pct}%`
    })
    return () => cancelAnimationFrame(raf)
  }, [pct])

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-brand-100 overflow-hidden">
        <div
          ref={fillRef}
          className={clsx('h-full rounded-full', COLOR_CLASSES[color])}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] text-brand-300 tabular-nums w-9 text-right">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
