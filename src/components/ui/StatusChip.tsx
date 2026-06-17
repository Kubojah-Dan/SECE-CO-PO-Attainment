import { clsx } from 'clsx'
import type { SubjectStatus } from '@/types/api'

type ExtendedStatus = SubjectStatus

interface StatusChipProps {
  status: ExtendedStatus
}

const CHIP_STYLES: Record<ExtendedStatus, string> = {
  draft:     'bg-brand-100 text-brand-500',
  submitted: 'bg-brand-50 text-brand-700',
  approved:  'bg-teal-50 text-teal-600',
  rejected:  'bg-red-50 text-red-600',
  pending:   'bg-amber-50 text-amber-700',
}

const CHIP_LABELS: Record<ExtendedStatus, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  approved:  'Approved',
  rejected:  'Rejected',
  pending:   'Pending',
}

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        CHIP_STYLES[status]
      )}
    >
      {CHIP_LABELS[status]}
    </span>
  )
}
