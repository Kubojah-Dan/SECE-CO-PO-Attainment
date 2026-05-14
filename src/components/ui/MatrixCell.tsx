import { clsx } from 'clsx'
import type { MappingWeight } from '@/types/api'

interface MatrixCellProps {
  value: MappingWeight
  onChange?: (v: MappingWeight) => void
  readonly?: boolean
  coLabel?: string
  poLabel?: string
}

const CELL_STYLES: Record<MappingWeight, string> = {
  0: 'bg-white border-brand-100 text-brand-300',
  1: 'bg-brand-100 border-brand-100 text-brand-700',
  2: 'bg-brand-300 border-brand-300 text-white',
  3: 'bg-brand-900 border-brand-900 text-white',
}

const CYCLE: MappingWeight[] = [0, 1, 2, 3]

export function MatrixCell({
  value,
  onChange,
  readonly = false,
  coLabel,
  poLabel,
}: MatrixCellProps) {
  function handleClick() {
    if (readonly || !onChange) return
    const next = CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length] as MappingWeight
    onChange(next)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const label = value === 0 ? '–' : String(value)
  const ariaLabel = `${coLabel ?? 'CO'} to ${poLabel ?? 'PO'} mapping: ${value}`

  return (
    <div
      role={readonly ? 'cell' : 'button'}
      tabIndex={readonly ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className={clsx(
        'flex items-center justify-center border rounded text-[13px] font-medium',
        'w-10 h-10 select-none transition-colors duration-100',
        CELL_STYLES[value],
        !readonly && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1'
      )}
    >
      {label}
    </div>
  )
}
