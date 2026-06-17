import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  BarChart3,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AdminOverview, DepartmentBreakdown } from '@/types/api'
import { StatCard } from '@/components/ui/StatCard'
import { SkeletonCard, SkeletonTable } from '@/components/ui/SkeletonCard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { clsx } from 'clsx'

/* ─── Attainment status chip ─── */
function AttainmentChip({ value }: { value: number }) {
  if (value >= 60) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-600">
        Met
      </span>
    )
  }
  if (value >= 40) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700">
        Near
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-red-50 text-red-600">
      Below
    </span>
  )
}

/* ─── Department breakdown table ─── */
function DeptTable({ rows }: { rows: DepartmentBreakdown[] }) {
  return (
    <div className="bg-white border border-brand-100 rounded-card overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-100">
        <h2 className="text-brand-950 text-[13px] font-medium">
          Department Breakdown
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-brand-100">
              <th className="text-left px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                Department
              </th>
              <th className="text-right px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                Subjects
              </th>
              <th className="text-right px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                Avg Attainment
              </th>
              <th className="text-center px-5 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className={clsx(
                  'border-b border-brand-100 last:border-0',
                  i % 2 === 0 ? 'bg-white' : 'bg-brand-50/40'
                )}
              >
                <td className="px-5 py-3.5 text-brand-950 font-medium">
                  {row.name}
                </td>
                <td className="px-5 py-3.5 text-brand-300 text-right tabular-nums">
                  {row.subjects}
                </td>
                <td className="px-5 py-3.5 text-brand-950 text-right tabular-nums font-medium">
                  {row.avgAttainment.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-center">
                  <AttainmentChip value={row.avgAttainment} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Admin Dashboard ─── */
export function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<AdminOverview>(EP.ANALYTICS_ADMIN)
      setData(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data.'
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
      {/* Error */}
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Row 1 — Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Departments"
              value={data?.totalDepartments ?? 0}
              icon={<Building2 size={17} />}
              accent="brand"
            />
            <StatCard
              label="Subjects"
              value={data?.totalSubjects ?? 0}
              icon={<BookOpen size={17} />}
              accent="brand"
            />
            <StatCard
              label="Faculty"
              value={data?.totalFaculty ?? 0}
              icon={<Users size={17} />}
              accent="brand"
            />
            <StatCard
              label="Students"
              value={data?.totalStudents ?? 0}
              icon={<GraduationCap size={17} />}
              accent="brand"
            />
          </>
        )}
      </div>

      {/* Row 2 — Submissions + attainment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Submissions Complete"
              value={data?.submissionsComplete ?? 0}
              subtext={`${data?.submissionsPending ?? 0} pending`}
              icon={<CheckCircle2 size={17} />}
              accent="teal"
            />
            <StatCard
              label="Avg Final Attainment"
              value={`${(data?.avgFinalAttainment ?? 0).toFixed(1)}%`}
              subtext={`Direct: ${(data?.avgDirectAttainment ?? 0).toFixed(1)}%`}
              icon={<BarChart3 size={17} />}
              accent="teal"
              trend={
                data
                  ? {
                      value: Math.abs(
                        Math.round(
                          data.avgFinalAttainment - data.avgDirectAttainment
                        )
                      ),
                      direction: data.avgFinalAttainment >= data.avgDirectAttainment
                        ? 'up'
                        : 'down',
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* Row 3 — Department table */}
      {loading ? (
        <div className="bg-white border border-brand-100 rounded-card p-5">
          <div className="w-40 h-4 rounded bg-brand-100 mb-4" />
          <SkeletonTable rows={5} />
        </div>
      ) : (
        data?.departmentBreakdown && data.departmentBreakdown.length > 0 && (
          <DeptTable rows={data.departmentBreakdown} />
        )
      )}
    </div>
  )
}
