import { useCallback, useEffect, useState } from 'react'
import { Building2, BarChart3, Target, Download } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { IqacInstitutionData, DeptSummary, AccreditationReadiness } from '@/types/api'
import { StatCard } from '@/components/ui/StatCard'
import { SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonCard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { clsx } from 'clsx'

/* ─── Readiness banner ─── */
const READINESS_CONFIG: Record<
  AccreditationReadiness,
  { bg: string; border: string; textColor: string; message: (depts?: number) => string }
> = {
  'ready': {
    bg:        'bg-teal-50',
    border:    'border-teal-400',
    textColor: 'text-teal-600',
    message:   () => 'Institution is NBA / NAAC report-ready.',
  },
  'partial': {
    bg:        'bg-amber-50',
    border:    'border-amber-400',
    textColor: 'text-amber-700',
    message:   (depts) => `${depts ?? 'Some'} departments pending completion.`,
  },
  'not-ready': {
    bg:        'bg-red-50',
    border:    'border-red-400',
    textColor: 'text-red-600',
    message:   () => 'Attainment data incomplete across departments.',
  },
}

function ReadinessBanner({
  readiness,
  pendingCount,
}: {
  readiness: AccreditationReadiness
  pendingCount?: number
}) {
  const cfg = READINESS_CONFIG[readiness]
  return (
    <div
      className={clsx(
        'rounded-card border-l-4 px-5 py-4 flex items-center gap-3',
        cfg.bg,
        cfg.border
      )}
      role="status"
    >
      <div
        className={clsx('w-2 h-2 rounded-full shrink-0', {
          'bg-teal-400':  readiness === 'ready',
          'bg-amber-400': readiness === 'partial',
          'bg-red-400':   readiness === 'not-ready',
        })}
        aria-hidden="true"
      />
      <p className={clsx('text-[13px] font-medium', cfg.textColor)}>
        {cfg.message(pendingCount)}
      </p>
    </div>
  )
}

/* ─── Progress bar cell ─── */
function AttainmentBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-brand-100 overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-700',
            pct >= 60 ? 'bg-teal-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-brand-950 text-[12px] tabular-nums font-medium w-10 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

/* ─── Department summary table ─── */
function DeptSummaryTable({ rows }: { rows: DeptSummary[] }) {
  return (
    <div className="bg-white border border-brand-100 rounded-card overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-100">
        <h2 className="text-brand-950 text-[13px] font-medium">
          Department Summary
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-brand-100">
              <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Department</th>
              <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide min-w-[140px]">PO Attainment</th>
              <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide min-w-[140px]">PSO Attainment</th>
              <th className="text-right px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Subjects</th>
              <th className="text-center px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className={clsx('border-b border-brand-100 last:border-0', i % 2 !== 0 && 'bg-brand-50/40')}
              >
                <td className="px-5 py-3.5 text-brand-950 font-medium whitespace-nowrap">
                  {row.name}
                </td>
                <td className="px-5 py-3.5 min-w-[140px]">
                  <AttainmentBar value={row.poAttainment} />
                </td>
                <td className="px-5 py-3.5 min-w-[140px]">
                  <AttainmentBar value={row.psoAttainment} />
                </td>
                <td className="px-5 py-3.5 text-brand-300 text-right tabular-nums">
                  {row.subjectsReported}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-700 border border-brand-100 rounded-input px-3 py-1 hover:bg-brand-50 transition-colors"
                    aria-label={`Download report for ${row.name}`}
                  >
                    <Download size={11} aria-hidden="true" />
                    Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── IQAC Dashboard ─── */
export function IqacDashboard() {
  const [data, setData] = useState<IqacInstitutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<IqacInstitutionData>(EP.ANALYTICS_IQAC)
      setData(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load IQAC dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* Count partial depts for banner message */
  const partialDepts = data?.departmentSummary.filter(
    (d) => d.poAttainment < 60 || d.psoAttainment < 60
  ).length

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Departments Reported"
              value={data?.totalDepartments ?? 0}
              icon={<Building2 size={17} />}
              accent="amber"
            />
            <StatCard
              label="Overall PO Attainment"
              value={`${(data?.overallPOAttainment ?? 0).toFixed(1)}%`}
              icon={<BarChart3 size={17} />}
              accent="amber"
            />
            <StatCard
              label="Overall PSO Attainment"
              value={`${(data?.overallPSOAttainment ?? 0).toFixed(1)}%`}
              icon={<Target size={17} />}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Row 2 — Accreditation readiness banner */}
      {!loading && data && (
        <ReadinessBanner
          readiness={data.accreditationReadiness}
          pendingCount={partialDepts}
        />
      )}
      {loading && (
        <div className="h-14 rounded-card bg-brand-100 animate-pulse" />
      )}

      {/* Row 3 — Department summary table */}
      {loading ? (
        <div className="bg-white border border-brand-100 rounded-card p-5">
          <div className="w-40 h-4 rounded bg-brand-100 mb-4" />
          <SkeletonTable rows={5} />
        </div>
      ) : (
        data?.departmentSummary && data.departmentSummary.length > 0 && (
          <DeptSummaryTable rows={data.departmentSummary} />
        )
      )}
    </div>
  )
}
