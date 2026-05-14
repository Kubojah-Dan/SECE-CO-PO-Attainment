import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { clsx } from 'clsx'

type AccentVariant = 'brand' | 'teal' | 'amber' | 'red'

interface TrendInfo {
  value: number
  direction: 'up' | 'down'
}

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon: ReactNode
  trend?: TrendInfo
  accent?: AccentVariant
}

/* ─── Count-up animation ─── */
function useCountUp(target: number, duration = 900): number {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) {
      setCurrent(target)
      return
    }
    const startVal = 0

    function tick(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return current
}

/* ─── Accent icon bg classes ─── */
const ICON_BG: Record<AccentVariant, string> = {
  brand: 'bg-brand-50  text-brand-700',
  teal:  'bg-teal-50   text-teal-600',
  amber: 'bg-amber-50  text-amber-700',
  red:   'bg-red-50    text-red-600',
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  accent = 'brand',
}: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : NaN
  const displayNum = useCountUp(isNaN(numericValue) ? 0 : numericValue)
  const displayValue = isNaN(numericValue) ? value : displayNum

  return (
    <article className="bg-white border border-brand-100 rounded-card p-5 flex flex-col gap-4">
      {/* Icon + label row */}
      <div className="flex items-start justify-between">
        <div
          className={clsx(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            ICON_BG[accent]
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* Trend chip */}
        {trend && (
          <div
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              trend.direction === 'up'
                ? 'bg-teal-50 text-teal-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp size={11} aria-hidden="true" />
            ) : (
              <TrendingDown size={11} aria-hidden="true" />
            )}
            {trend.value}%
          </div>
        )}
      </div>

      {/* Value + label */}
      <div>
        <p className="text-brand-950 text-2xl font-medium leading-none tabular-nums">
          {displayValue}
        </p>
        <p className="text-brand-300 text-[12px] mt-1.5 leading-tight">{label}</p>
        {subtext && (
          <p className="text-brand-300 text-[11px] mt-0.5 leading-tight">{subtext}</p>
        )}
      </div>
    </article>
  )
}
