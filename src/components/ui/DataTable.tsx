import type { ReactNode } from 'react'
import { FileX } from 'lucide-react'
import { clsx } from 'clsx'
import { SkeletonRow } from './SkeletonCard'

export interface Column<T> {
  key: string
  label: string
  width?: string
  render?: (value: unknown, row: T) => ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  skeletonRows?: number
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<T>) {
  return (
    <div className="bg-white border border-brand-100 rounded-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-brand-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              /* Skeleton rows */
              Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="border-b border-brand-100 last:border-0">
                  <td colSpan={columns.length} className="px-4 py-2.5">
                    <SkeletonRow />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              /* Empty state */
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-14 gap-2 text-brand-300">
                    <FileX size={32} strokeWidth={1.2} aria-hidden="true" />
                    <p className="text-[13px]">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'border-b border-brand-100 last:border-0',
                    i % 2 !== 0 ? 'bg-brand-50/40' : 'bg-white',
                    onRowClick && 'cursor-pointer hover:bg-brand-50 transition-colors'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-brand-950 whitespace-nowrap">
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
