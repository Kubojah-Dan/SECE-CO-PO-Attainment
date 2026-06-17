import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AccreditationStatus, DeptReadiness, ChecklistItem } from '@/types/phase4'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import { clsx } from 'clsx'

const READINESS_CFG = {
  'ready':     { bg: 'bg-teal-50 border-teal-400',  text: 'text-teal-700',  msg: 'All departments have submitted and met targets.' },
  'partial':   { bg: 'bg-amber-50 border-amber-400', text: 'text-amber-700', msg: (n: number, t: number) => `${n} of ${t} departments complete.` },
  'not-ready': { bg: 'bg-red-50 border-red-300',    text: 'text-red-700',   msg: 'Attainment data incomplete across departments.' },
}

function CheckRow({ item }: { item: ChecklistItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-3 py-2.5 px-1 cursor-pointer hover:bg-brand-50 rounded',
          item.deptBreakdown && 'cursor-pointer'
        )}
        onClick={() => item.deptBreakdown && setOpen((o) => !o)}
      >
        {item.passed
          ? <CheckCircle2 size={16} className="text-teal-500 shrink-0" aria-hidden="true" />
          : <XCircle size={16} className="text-red-500 shrink-0" aria-hidden="true" />}
        <span className={clsx('text-[13px] flex-1', item.passed ? 'text-brand-950' : 'text-brand-700')}>
          {item.label}
        </span>
        {item.deptBreakdown && (
          open ? <ChevronDown size={14} className="text-brand-300" /> : <ChevronRight size={14} className="text-brand-300" />
        )}
      </div>
      {open && item.deptBreakdown && (
        <div className="ml-7 mb-1 flex flex-col gap-1">
          {item.deptBreakdown.map((d) => (
            <div key={d.deptName} className="flex items-center gap-2 py-1 text-[12px]">
              {d.passed
                ? <CheckCircle2 size={13} className="text-teal-400" />
                : <XCircle size={13} className="text-red-400" />}
              <span className={d.passed ? 'text-brand-700' : 'text-red-600'}>{d.deptName}</span>
              {d.details && <span className="text-brand-300">· {d.details}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeptAccordion({ dept }: { dept: DeptReadiness }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-brand-100 rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-50 transition-colors"
      >
        <span className="text-brand-950 text-[13px] font-medium">{dept.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-brand-300 text-[12px]">
            {dept.checklist.filter((c) => c.passed).length}/{dept.checklist.length} complete
          </span>
          {open ? <ChevronDown size={14} className="text-brand-300" /> : <ChevronRight size={14} className="text-brand-300" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-brand-100 px-4 py-2 divide-y divide-brand-100">
          {dept.checklist.map((item) => (
            <CheckRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export function AccreditationPage() {
  useEffect(() => { document.title = 'Accreditation — OBE Attain' }, [])
  const { generateReport } = useReportGeneration()
  const [data, setData] = useState<AccreditationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiGet<AccreditationStatus>(EP.ANALYTICS_IQAC)
      setData(d)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accreditation data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  async function handleReport(type: 'nba' | 'naac') {
    setGenerating(type)
    try {
      await generateReport({ type, format: 'pdf' })
    } catch {/* handled */} finally {
      setGenerating(null)
    }
  }

  const readiness = data?.readiness ?? 'not-ready'
  const cfg = READINESS_CFG[readiness]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="NBA / NAAC Accreditation" />
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Readiness Banner */}
      {!loading && data && (
        <div className={clsx('rounded-card border-l-4 px-6 py-5', cfg.bg)}>
          <p className={clsx('text-[14px] font-medium mb-1', cfg.text)}>
            {readiness === 'partial'
              ? READINESS_CFG.partial.msg(data.completeDepts, data.totalDepts)
              : readiness === 'ready'
              ? READINESS_CFG.ready.msg
              : READINESS_CFG['not-ready'].msg}
          </p>
          {readiness !== 'ready' && data.blockingItems.length > 0 && (
            <ul className={clsx('list-disc list-inside mt-2 text-[12px]', cfg.text)}>
              {data.blockingItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          )}
          {readiness === 'ready' && (
            <div className="flex gap-3 mt-3">
              <Button variant="primary" size="sm" loading={generating === 'nba'} onClick={() => void handleReport('nba')}>
                <Download size={13} aria-hidden="true" />NBA Report
              </Button>
              <Button variant="ghost" size="sm" loading={generating === 'naac'} onClick={() => void handleReport('naac')}>
                <Download size={13} aria-hidden="true" />NAAC Report
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      <SectionCard title="Accreditation Readiness Checklist">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-8 rounded bg-brand-100" />)}
          </div>
        ) : (
          <div className="divide-y divide-brand-100">
            {data?.checklist.map((item) => <CheckRow key={item.id} item={item} />)}
          </div>
        )}
      </SectionCard>

      {/* Department accordion */}
      {!loading && data?.deptReadiness && data.deptReadiness.length > 0 && (
        <SectionCard title="Department Drill-down">
          <div className="flex flex-col gap-2">
            {data.deptReadiness.map((dept) => (
              <DeptAccordion key={dept.deptId} dept={dept} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
