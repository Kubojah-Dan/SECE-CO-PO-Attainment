import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AuditLog } from '@/types/phase4'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

const ACTION_TYPES = ['All','LOGIN','LOGOUT','CREATE','UPDATE','DELETE','CALCULATE','APPROVE','REJECT','EXPORT']
const PAGE_SIZE = 50

export function AuditLogPage() {
  useEffect(() => { document.title = 'Audit Logs — OBE Attain' }, [])
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [action, setAction]     = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(PAGE_SIZE),
        ...(userSearch && { user: userSearch }),
        ...(action !== 'All' && { action }),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
      })
      const data = await apiGet<{ logs: AuditLog[]; total: number }>(`${EP.AUDIT_LOGS}?${params.toString()}`)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load audit logs.') }
    finally { setLoading(false) }
  }, [page, userSearch, action, dateFrom, dateTo])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  function exportCSV() {
    window.open(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${EP.AUDIT_EXPORT}`, '_blank')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'timestamp', label: 'Timestamp', width: '140px', render: (v) => <span className="text-brand-300 text-[11px] tabular-nums">{v as string}</span> },
    { key: 'userName', label: 'User', render: (v) => <span className="font-medium text-brand-950">{v as string}</span> },
    { key: 'userRole', label: 'Role', width: '80px', render: (v) => <span className="text-brand-300 text-[12px]">{v as string}</span> },
    { key: 'action', label: 'Action', width: '100px', render: (v) => <span className="text-brand-500 font-medium text-[12px]">{v as string}</span> },
    { key: 'entity', label: 'Entity', width: '100px' },
    { key: 'details', label: 'Details', render: (v) => <span className="text-[12px] text-brand-700 line-clamp-1">{v as string}</span> },
    { key: 'ipAddress', label: 'IP', width: '110px', render: (v) => <span className="text-brand-300 text-[11px] tabular-nums">{v as string}</span> },
  ]

  return (
    <div>
      <PageHeader title="Audit Logs"
        actions={<Button variant="ghost" size="sm" onClick={exportCSV}><Download size={13} />Export CSV</Button>}
      />
      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={fetchLogs} /></div>}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950" aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950" aria-label="To date" />
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white" aria-label="Action type">
          {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="search" placeholder="Search user…" value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setPage(1) }}
          className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950" aria-label="Search user" />
      </div>

      <DataTable columns={columns} data={logs as Record<string, unknown>[]} loading={loading} emptyMessage="No audit logs found." />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-brand-300 text-[12px]">Page {page} of {totalPages} · {total} records</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
            <input type="number" min={1} max={totalPages} value={page}
              onChange={(e) => setPage(Math.min(Math.max(1, Number(e.target.value)), totalPages))}
              className="w-14 border border-brand-100 rounded-input px-2 py-1.5 text-[13px] text-center" aria-label="Page number" />
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        </div>
      )}
    </div>
  )
}
