import { useCallback, useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { IqacInstitutionAnalytics, IqacDeptComparison } from '@/types/phase4'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatCard } from '@/components/ui/StatCard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { TrendChip } from '@/components/ui/TrendChip'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Button } from '@/components/ui/Button'
import { BarChart2, Target, Building2, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'

function DeptStatusChip({ status }: { status: IqacDeptComparison['status'] }) {
  const styles = { met: 'bg-teal-50 text-teal-600', partial: 'bg-amber-50 text-amber-700', below: 'bg-red-50 text-red-600' }
  const labels = { met: 'Met', partial: 'Partial', below: 'Below' }
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', styles[status])}>
      {labels[status]}
    </span>
  )
}

export function AnalyticsPage() {
  useEffect(() => { document.title = 'Analytics — OBE Attain' }, [])
  const navigate = useNavigate()
  const [data, setData] = useState<IqacInstitutionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiGet<IqacInstitutionAnalytics>(EP.ANALYTICS_IQAC)
      setData(d)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const deptCols: Column<Record<string, unknown>>[] = [
    { key: 'name', label: 'Department' },
    {
      key: 'poAvg', label: 'PO Avg', width: '90px',
      render: (v) => <span className="tabular-nums font-medium">{(v as number).toFixed(1)}%</span>,
    },
    {
      key: 'psoAvg', label: 'PSO Avg', width: '90px',
      render: (v) => <span className="tabular-nums font-medium">{(v as number).toFixed(1)}%</span>,
    },
    { key: 'subjects', label: 'Subjects', width: '80px' },
    {
      key: 'status', label: 'Status', width: '90px',
      render: (v) => <DeptStatusChip status={v as IqacDeptComparison['status']} />,
    },
    {
      key: 'yoyChange', label: 'Trend', width: '80px',
      render: (v) => <TrendChip value={v as number} direction={(v as number) >= 0 ? 'up' : 'down'} />,
    },
    {
      key: 'deptId', label: 'Actions', width: '100px',
      render: (v) => (
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation()
          navigate(`/hod/po-attainment?dept=${v as string}`)
        }}>
          View details
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Institution Analytics" />
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Row 1 — StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <StatCard
              label="Institution PO Avg"
              value={`${(data?.poAvg ?? 0).toFixed(1)}%`}
              icon={<BarChart2 size={17} />}
              accent="amber"
              trend={data?.poTrend !== undefined ? { value: Math.abs(data.poTrend), direction: data.poTrend >= 0 ? 'up' : 'down' } : undefined}
            />
            <StatCard
              label="Institution PSO Avg"
              value={`${(data?.psoAvg ?? 0).toFixed(1)}%`}
              icon={<Target size={17} />}
              accent="amber"
              trend={data?.psoTrend !== undefined ? { value: Math.abs(data.psoTrend), direction: data.psoTrend >= 0 ? 'up' : 'down' } : undefined}
            />
            <StatCard
              label="Depts Reporting"
              value={data?.deptsReporting ?? 0}
              icon={<Building2 size={17} />}
              accent="amber"
            />
            <StatCard
              label="Subjects Complete"
              value={data?.subjectsComplete ?? 0}
              icon={<BookOpen size={17} />}
              accent="amber"
            />
          </>
        )}
      </div>

      {/* Row 2 — PO Bar Chart */}
      <SectionCard title="Institution-wide PO Attainment" subtitle="Current vs previous year comparison">
        {loading ? (
          <div className="h-64 rounded bg-brand-100 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.poBars ?? []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF2" />
              <XAxis dataKey="po" tick={{ fontSize: 12, fill: '#9398B0' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9398B0' }} unit="%" />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8EAF2', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={60} stroke="#E24B4A" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 11 }} />
              <Bar dataKey="current" name="Current Year" fill="#4A52A3" isAnimationActive animationDuration={600} />
              <Bar dataKey="previous" name="Previous Year" fill="#A5ADD9" isAnimationActive animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Row 3 — Dept comparison table */}
      <SectionCard title="Department-wise PO Attainment">
        <DataTable
          columns={deptCols}
          data={(data?.deptComparison ?? []) as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="No department data available."
        />
      </SectionCard>

      {/* Row 4 — PSO Chart */}
      {data && data.psoBars.length > 0 && (
        <SectionCard title="PSO Attainment by Department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.psoBars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF2" />
              <XAxis dataKey="pso" tick={{ fontSize: 12, fill: '#9398B0' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9398B0' }} unit="%" />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8EAF2', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={60} stroke="#E24B4A" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 11 }} />
              {Object.keys(data.psoBars[0]?.depts ?? {}).map((dept, i) => (
                <Bar key={dept} dataKey={`depts.${dept}`} name={dept}
                  fill={['#4A52A3','#1D9E88','#B7760A','#E24B4A','#6B7ACA'][i % 5]}
                  isAnimationActive animationDuration={600} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  )
}
