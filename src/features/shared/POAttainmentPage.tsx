import { useCallback, useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { DeptPOAttainment, POAttainmentItem, PSOAttainmentItem } from '@/types/phase4'
import type { Department } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { AttainmentBar } from '@/components/ui/AttainmentBar'
import { AttainmentHeatCell } from '@/components/ui/AttainmentHeatCell'
import { TrendChip } from '@/components/ui/TrendChip'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { clsx } from 'clsx'

const PO_COLORS = [
  '#4A52A3','#1D9E88','#B7760A','#6B7ACA','#E24B4A',
  '#0D6E5A','#8A5200','#2E3580','#9398B0','#1A1F4E','#4A52A3','#1D9E88',
]

const DEFAULT_VISIBLE = ['PO1','PO3','PO5']

interface Props { scope?: 'hod' | 'admin' }

export function POAttainmentPage({ scope = 'hod' }: Props) {
  useEffect(() => { document.title = 'PO/PSO Attainment — OBE Attain' }, [])

  const { user } = useAuthStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [data, setData] = useState<DeptPOAttainment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visiblePOs, setVisiblePOs] = useState<Set<string>>(new Set(DEFAULT_VISIBLE))

  /* Load departments (admin only) */
  useEffect(() => {
    if (scope !== 'admin') return
    apiGet<Department[]>(EP.DEPARTMENTS)
      .then((depts) => {
        setDepartments(depts)
        if (depts.length > 0) setSelectedDeptId(depts[0].id)
      })
      .catch(() => {/* silently ignore dept load error */})
  }, [scope])

  const deptId = scope === 'admin' ? selectedDeptId : (user?.id ?? 'me')

  const fetchData = useCallback(async () => {
    if (!deptId) return
    setLoading(true)
    setError(null)
    try {
      const [poData, psoData, trendData] = await Promise.all([
        apiGet<{ poAttainment: POAttainmentItem[] }>(EP.DEPT_PO_ATTAINMENT(deptId)),
        apiGet<{ psoAttainment: PSOAttainmentItem[] }>(EP.DEPT_PSO_ATTAINMENT(deptId)),
        apiGet<{ trends: DeptPOAttainment['trends'] }>(EP.DEPT_PO_TRENDS(deptId)),
      ])
      setData({
        poAttainment: poData.poAttainment,
        psoAttainment: psoData.psoAttainment,
        coPoMatrix: {},
        trends: trendData.trends,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attainment data.')
    } finally {
      setLoading(false)
    }
  }, [deptId])

  useEffect(() => { void fetchData() }, [fetchData])

  function togglePO(po: string) {
    setVisiblePOs((prev) => {
      const next = new Set(prev)
      next.has(po) ? next.delete(po) : next.add(po)
      return next
    })
  }

  const allPOs = data?.poAttainment.map((p) => p.po) ?? []
  const instAvgPO  = data ? data.poAttainment.reduce((s, p) => s + p.attainment, 0) / (data.poAttainment.length || 1) : 0
  const instAvgPSO = data ? data.psoAttainment.reduce((s, p) => s + p.attainment, 0) / (data.psoAttainment.length || 1) : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PO / PSO Attainment"
        subtitle="Department-level programme outcome attainment"
        actions={
          scope === 'admin' && departments.length > 0 ? (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white"
              aria-label="Select department"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Section 1 — PO Attainment */}
      <SectionCard
        title="Programme Outcome Attainment"
        actions={
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white"
            aria-label="Academic year"
          >
            <option value="all">All years</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
          </select>
        }
      >
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-6 rounded bg-brand-100" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.poAttainment.map((po) => (
              <div key={po.po} className="flex items-center gap-3">
                <div className="flex-1">
                  <AttainmentBar label={po.po} value={po.attainment} target={po.target} />
                </div>
                {po.trend !== undefined && (
                  <TrendChip value={po.trend} direction={po.trend >= 0 ? 'up' : 'down'} />
                )}
              </div>
            ))}
            {/* Institution average */}
            {data && data.poAttainment.length > 0 && (
              <>
                <div className="border-t border-brand-100 my-1" />
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <AttainmentBar label="Avg" value={instAvgPO} target={60} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section 2 — PSO Attainment */}
      <SectionCard title="Programme Specific Outcome Attainment">
        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-6 rounded bg-brand-100" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.psoAttainment.map((pso) => (
              <div key={pso.pso} className="flex items-center gap-3">
                <div className="flex-1">
                  <AttainmentBar label={pso.pso} value={pso.attainment} target={pso.target} />
                </div>
                {pso.trend !== undefined && (
                  <TrendChip value={pso.trend} direction={pso.trend >= 0 ? 'up' : 'down'} />
                )}
              </div>
            ))}
            {data && data.psoAttainment.length > 0 && (
              <>
                <div className="border-t border-brand-100 my-1" />
                <div className="flex-1">
                  <AttainmentBar label="Avg" value={instAvgPSO} target={60} />
                </div>
              </>
            )}
          </div>
        )}
      </SectionCard>

      {/* Section 3 — CO-PO Matrix (read-only heat) */}
      {data && Object.keys(data.coPoMatrix).length > 0 && (
        <SectionCard
          title="CO → PO Contribution Matrix"
          subtitle="Final CO attainment × mapping weight"
        >
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white border-b border-r border-brand-100 px-3 py-2 text-[11px] text-brand-300 uppercase w-16">CO</th>
                  {allPOs.map((po) => (
                    <th key={po} className="border-b border-r border-brand-100 px-1 py-2 text-[10px] text-brand-300 uppercase w-10">{po}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.coPoMatrix).map(([co, row], ri) => (
                  <tr key={co} className={ri % 2 !== 0 ? 'bg-brand-50/30' : ''}>
                    <td className="sticky left-0 border-b border-r border-brand-100 px-3 py-1"
                      style={{ background: ri % 2 !== 0 ? '#F7F8FA' : '#FFFFFF' }}>
                      <span className="text-brand-500 text-[12px] font-medium">{co}</span>
                    </td>
                    {allPOs.map((po) => (
                      <td key={po} className="border-b border-r border-brand-100 p-1">
                        <AttainmentHeatCell value={row[po] ?? 0} mode="attainment" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Section 4 — Trend Chart */}
      {data && data.trends.length > 0 && (
        <SectionCard title="PO Attainment Trend">
          {/* PO toggle checkboxes */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allPOs.map((po, idx) => (
              <label key={po} className="flex items-center gap-1 cursor-pointer text-[12px]">
                <input
                  type="checkbox"
                  checked={visiblePOs.has(po)}
                  onChange={() => togglePO(po)}
                  className="rounded"
                />
                <span style={{ color: PO_COLORS[idx % PO_COLORS.length] }}>{po}</span>
              </label>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.trends} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF2" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#9398B0' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9398B0' }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E8EAF2', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={60} stroke="#E24B4A" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 11 }} />
              {allPOs.filter((po) => visiblePOs.has(po)).map((po, idx) => (
                <Line
                  key={po}
                  type="monotone"
                  dataKey={`po.${po}`}
                  name={po}
                  stroke={PO_COLORS[allPOs.indexOf(po) % PO_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  )
}
