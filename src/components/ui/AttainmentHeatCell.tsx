import { clsx } from 'clsx'

interface AttainmentHeatCellProps {
  value: number
  mode: 'mapping' | 'attainment'
}

/* mapping mode: 0/1/2/3 integer */
const MAPPING_STYLES: Record<number, string> = {
  0: 'bg-white border-brand-100 text-brand-300',
  1: 'bg-brand-100 border-brand-100 text-brand-700',
  2: 'bg-brand-300 border-brand-300 text-white',
  3: 'bg-brand-900 border-brand-900 text-white',
}

function attainmentStyle(v: number) {
  if (v >= 80) return 'bg-teal-50 text-brand-900 border-teal-200'
  if (v >= 60) return 'bg-teal-100 text-teal-800 border-teal-200'
  if (v >= 40) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

export function AttainmentHeatCell({ value, mode }: AttainmentHeatCellProps) {
  const displayValue = mode === 'mapping'
    ? (value === 0 ? '–' : String(Math.round(value)))
    : `${value.toFixed(0)}`

  const style = mode === 'mapping'
    ? (MAPPING_STYLES[Math.round(value)] ?? MAPPING_STYLES[0])
    : attainmentStyle(value)

  return (
    <div
      className={clsx(
        'flex items-center justify-center border rounded w-10 h-10 text-[12px] font-medium select-none',
        style
      )}
    >
      {displayValue}
    </div>
  )
}
