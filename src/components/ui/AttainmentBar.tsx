import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface AttainmentBarProps {
  label: string
  value: number
  target: number
  showTarget?: boolean
}

function barColor(value: number, target: number) {
  if (value >= target)    return 'bg-teal-400'
  if (value >= target - 10) return 'bg-amber-400'
  return 'bg-red-400'
}

export function AttainmentBar({ label, value, target, showTarget = true }: AttainmentBarProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const pct = Math.min(Math.max(value, 0), 100)
  const tgtPct = Math.min(Math.max(target, 0), 100)

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
    <div className="flex items-center gap-3 w-full">
      <span className="text-brand-500 text-[12px] font-medium w-10 shrink-0">{label}</span>
      <div className="relative flex-1 h-2 rounded-full bg-brand-100 overflow-visible">
        <div
          ref={fillRef}
          className={clsx('absolute h-full rounded-full top-0 left-0', barColor(value, target))}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        {showTarget && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-brand-400 z-10"
            style={{ left: `${tgtPct}%` }}
            title={`Target: ${tgtPct}%`}
            aria-hidden="true"
          />
        )}
      </div>
      <span className="text-brand-950 text-[12px] tabular-nums font-medium w-10 text-right shrink-0">
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}
