import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, Clock } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { HodDepartmentData, SubjectStatus } from '@/types/api'
import { StatCard } from '@/components/ui/StatCard'
import { SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonCard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { clsx } from 'clsx'

/* ─── Status chip ─── */
const STATUS_STYLES: Record<SubjectStatus, string> = {
  draft:     'bg-brand-50 text-brand-500',
  submitted: 'bg-amber-50 text-amber-700',
  approved:  'bg-teal-50 text-teal-600',
  rejected:  'bg-red-50 text-red-600',
}

const STATUS_LABEL: Record<SubjectStatus, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  approved:  'Approved',
  rejected:  'Rejected',
}

function StatusChip({ status }: { status: SubjectStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

/* ─── Faculty progress bar ─── */
function FacultyProgressItem({
  name,
  submitted,
  total,
}: {
  name: string
  submitted: number
  total: number
}) {
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-brand-950 text-[13px] font-medium truncate max-w-[60%]">
          {name}
        </p>
        <span className="text-brand-300 text-[11px] tabular-nums">
          {submitted}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-brand-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name} progress: ${pct}%`}
        />
      </div>
    </div>
  )
}

/* ─── HOD Dashboard ─── */
export function HodDashboard() {
  const [data, setData] = useState<HodDepartmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<HodDepartmentData>(EP.ANALYTICS_HOD)
      setData(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load HOD dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6">
      {data?.departmentName && (
        <div>
          <h2 className="text-brand-950 text-[15px] font-medium">
            {data.departmentName}
          </h2>
          <p className="text-brand-300 text-[12px] mt-0.5">
            Department overview
          </p>
        </div>
      )}

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
              label="Total Subjects"
              value={data?.totalSubjects ?? 0}
              icon={<BookOpen size={17} />}
              accent="teal"
            />
            <StatCard
              label="Completed Subjects"
              value={data?.completedSubjects ?? 0}
              icon={<CheckCircle2 size={17} />}
              accent="teal"
            />
            <StatCard
              label="Pending Approvals"
              value={data?.pendingApprovals ?? 0}
              icon={<Clock size={17} />}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Row 2 — Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faculty Progress */}
        <div className="bg-white border border-brand-100 rounded-card p-5">
          <h2 className="text-brand-950 text-[13px] font-medium mb-4">
            Faculty Progress
          </h2>
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                  <div className="flex justify-between">
                    <div className="w-32 h-3 rounded bg-brand-100" />
                    <div className="w-8 h-3 rounded bg-brand-100" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-brand-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {data?.facultyList.map((f) => (
                <FacultyProgressItem
                  key={f.name}
                  name={f.name}
                  submitted={f.submitted}
                  total={f.subjectsAssigned}
                />
              ))}
              {(!data?.facultyList || data.facultyList.length === 0) && (
                <p className="text-brand-300 text-[12px]">No faculty data available.</p>
              )}
            </div>
          )}
        </div>

        {/* Subject Status Table */}
        <div className="bg-white border border-brand-100 rounded-card overflow-hidden">
          <div className="px-5 py-4 border-b border-brand-100">
            <h2 className="text-brand-950 text-[13px] font-medium">
              Subject Status
            </h2>
          </div>
          {loading ? (
            <div className="p-5">
              <SkeletonTable rows={4} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-brand-100">
                    <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Code</th>
                    <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Subject</th>
                    <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Faculty</th>
                    <th className="text-center px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.subjectStatus?.map((s, i) => (
                    <tr key={s.code} className={clsx('border-b border-brand-100 last:border-0', i % 2 === 0 ? '' : 'bg-brand-50/40')}>
                      <td className="px-5 py-3 text-brand-500 font-medium">{s.code}</td>
                      <td className="px-5 py-3 text-brand-950 max-w-[120px] truncate">{s.name}</td>
                      <td className="px-5 py-3 text-brand-300 truncate max-w-[100px]">{s.faculty}</td>
                      <td className="px-5 py-3 text-center"><StatusChip status={s.status} /></td>
                    </tr>
                  ))}
                  {(!data?.subjectStatus || data.subjectStatus.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-brand-300 text-[12px]">
                        No subjects found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
