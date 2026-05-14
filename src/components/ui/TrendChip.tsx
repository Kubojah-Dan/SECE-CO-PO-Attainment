import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface TrendChipProps {
  value: number
  direction?: 'up' | 'down' | 'neutral'
  suffix?: string
}

export function TrendChip({ value, direction, suffix = '%' }: TrendChipProps) {
  const dir = direction ?? (value > 0 ? 'up' : value < 0 ? 'down' : 'neutral')

  const styles = {
    up:      'text-teal-600 bg-teal-50',
    down:    'text-red-600 bg-red-50',
    neutral: 'text-brand-300 bg-brand-50',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
        styles[dir]
      )}
    >
      {dir === 'up'      && <TrendingUp  size={10} aria-hidden="true" />}
      {dir === 'down'    && <TrendingDown size={10} aria-hidden="true" />}
      {dir === 'neutral' && <Minus size={10} aria-hidden="true" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}
