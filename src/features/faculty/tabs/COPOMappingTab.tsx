import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { COPOMapping, CourseOutcome, MappingWeight, POItem, PSOItem } from '@/types/api'
import { MatrixCell } from '@/components/ui/MatrixCell'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { clsx } from 'clsx'

/* ─── Average cell display ─── */
const AVG_STYLES: Record<string, string> = {
  '0': 'bg-white text-brand-300 border-brand-100',
  '1': 'bg-brand-100 text-brand-700 border-brand-100',
  '2': 'bg-brand-300 text-white border-brand-300',
  '3': 'bg-brand-900 text-white border-brand-900',
}

function AvgCell({ value }: { value: number }) {
  const rounded = Math.round(value)
  const key = String(Math.min(rounded, 3))
  return (
    <div
      className={clsx(
        'flex items-center justify-center w-10 h-8 border rounded text-[11px] font-medium',
        AVG_STYLES[key]
      )}
    >
      {value.toFixed(1)}
    </div>
  )
}

interface Props { subjectId: string }

export function COPOMappingTab({ subjectId }: Props) {
  const { toast } = useToast()

  /* ── Data state ── */
  const [cos, setCos]     = useState<CourseOutcome[]>([])
  const [pos, setPos]     = useState<POItem[]>([])
  const [psos, setPsos]   = useState<PSOItem[]>([])
  /* matrix[coId][columnCode] = weight */
  const [matrix, setMatrix] = useState<Record<string, Record<string, MappingWeight>>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  useUnsavedGuard(isDirty)

  /* All column codes in display order */
  const allCols = useMemo(() => [
    ...pos.map((p) => p.code),
    ...psos.map((p) => p.code),
  ], [pos, psos])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mappingData, cosData] = await Promise.all([
        apiGet<COPOMapping>(EP.CO_PO_MAPPING(subjectId)),
        apiGet<CourseOutcome[]>(EP.COS_BY_SUBJECT(subjectId)),
      ])
      setPos(mappingData.poList)
      setPsos(mappingData.psoList)
      setCos(cosData)

      /* Initialize matrix — fill missing cells with 0 */
      const m: Record<string, Record<string, MappingWeight>> = {}
      cosData.forEach((co) => {
        m[co.id] = {}
        const existing = mappingData.mapping[co.id] ?? {}
        ;[...mappingData.poList.map((p) => p.code), ...mappingData.psoList.map((p) => p.code)].forEach(
          (code) => {
            m[co.id][code] = (existing[code] as MappingWeight | undefined) ?? 0
          }
        )
      })
      setMatrix(m)
      setIsDirty(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load mapping.')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void fetchAll() }, [fetchAll])

  function handleCellChange(coId: string, colCode: string, value: MappingWeight) {
    setMatrix((prev) => ({
      ...prev,
      [coId]: { ...prev[coId], [colCode]: value },
    }))
    setIsDirty(true)
  }

  /* Column averages */
  const colAverages = useMemo((): Record<string, number> => {
    if (cos.length === 0) return {}
    const avgs: Record<string, number> = {}
    allCols.forEach((col) => {
      const sum = cos.reduce((acc, co) => acc + (matrix[co.id]?.[col] ?? 0), 0)
      avgs[col] = sum / cos.length
    })
    return avgs
  }, [cos, matrix, allCols])

  async function handleSave() {
    setSaving(true)
    try {
      await apiPut(EP.CO_PO_MAPPING(subjectId), { mapping: matrix })
      setIsDirty(false)
      toast('Mapping saved successfully.', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save mapping.', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* ── Tooltip description lookup ── */
  const poDescMap = useMemo(() => {
    const m: Record<string, string> = {}
    pos.forEach((p)  => { m[p.code] = p.description })
    psos.forEach((p) => { m[p.code] = p.description })
    return m
  }, [pos, psos])

  if (loading) {
    return (
      <div className="pt-4 flex flex-col gap-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-brand-100" />
        <div className="h-64 rounded-card bg-brand-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-4">
        <ErrorBanner message={error} onRetry={fetchAll} />
      </div>
    )
  }

  if (cos.length === 0) {
    return (
      <div className="pt-4 text-center py-14 text-brand-300 text-[13px]">
        Define Course Outcomes in the "CO Definition" tab first.
      </div>
    )
  }

  return (
    <div className="pt-2">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-brand-950 text-[15px] font-medium">CO-PO & PSO Mapping</h2>
          {isDirty && (
            <p className="text-amber-700 text-[12px] mt-0.5">Unsaved changes</p>
          )}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-brand-300">
            {(['0', '1', '2', '3'] as const).map((v) => (
              <span key={v} className="flex items-center gap-1">
                <span
                  className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center text-[10px] font-medium',
                    AVG_STYLES[v]
                  )}
                >
                  {v === '0' ? '–' : v}
                </span>
                {v === '0' ? 'None' : v === '1' ? 'Low' : v === '2' ? 'Med' : 'High'}
              </span>
            ))}
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!isDirty || saving}
            loading={saving}
            onClick={() => void handleSave()}
          >
            <Save size={13} aria-hidden="true" />
            Save mapping
          </Button>
        </div>
      </div>

      {/* Matrix — horizontally scrollable, CO column sticky */}
      <div className="overflow-x-auto border border-brand-100 rounded-card">
        <table className="border-collapse" style={{ minWidth: `${(allCols.length + 1) * 44}px` }}>
          <thead>
            <tr>
              {/* Sticky CO header */}
              <th
                className="sticky left-0 z-10 bg-white border-b border-r border-brand-100 px-3 py-2.5 text-left text-[11px] font-medium text-brand-300 uppercase tracking-wide min-w-[100px] whitespace-nowrap"
              >
                CO
              </th>
              {/* PO / PSO column headers */}
              {allCols.map((col) => {
                const isPSO = col.startsWith('PSO')
                return (
                  <th
                    key={col}
                    className={clsx(
                      'border-b border-r border-brand-100 px-1 py-2.5 text-center text-[11px] font-medium text-brand-300 uppercase w-10',
                      isPSO && 'bg-amber-50'
                    )}
                    title={poDescMap[col] ?? col}
                  >
                    {col}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {cos.map((co, ri) => (
              <tr key={co.id} className={ri % 2 !== 0 ? 'bg-brand-50/30' : ''}>
                {/* Sticky CO label */}
                <td
                  className="sticky left-0 z-10 border-b border-r border-brand-100 px-3 py-2"
                  style={{ background: ri % 2 !== 0 ? '#F7F8FA' : '#FFFFFF' }}
                >
                  <span
                    className="text-brand-500 text-[12px] font-medium cursor-default"
                    title={co.description}
                  >
                    {co.coNumber}
                  </span>
                </td>
                {/* Weight cells */}
                {allCols.map((col) => {
                  const isPSO = col.startsWith('PSO')
                  return (
                    <td
                      key={col}
                      className={clsx(
                        'border-b border-r border-brand-100 p-1 text-center',
                        isPSO && 'bg-amber-50/40'
                      )}
                    >
                      <MatrixCell
                        value={matrix[co.id]?.[col] ?? 0}
                        onChange={(v) => handleCellChange(co.id, col, v)}
                        coLabel={co.coNumber}
                        poLabel={col}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Average row */}
            <tr className="bg-brand-50 border-t-2 border-brand-100">
              <td className="sticky left-0 z-10 bg-brand-50 border-r border-brand-100 px-3 py-2">
                <span className="text-brand-300 text-[11px] font-medium uppercase tracking-wide">
                  Avg
                </span>
              </td>
              {allCols.map((col) => (
                <td key={col} className="border-r border-brand-100 p-1 text-center">
                  <AvgCell value={colAverages[col] ?? 0} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {pos.length === 0 && (
        <p className="text-center text-brand-300 text-[12px] mt-4">
          PO and PSO data not configured. Contact your admin.
        </p>
      )}
    </div>
  )
}
