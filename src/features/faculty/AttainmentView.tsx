import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Send } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { AttainmentData, COAttainmentRow } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { Button } from '@/components/ui/Button'
import { SkeletonTable } from '@/components/ui/SkeletonCard'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

function AttainmentStatus({ value, target }: { value: number; target: number }) {
  if (value >= target)
    return <span className="text-[11px] font-medium text-teal-600 bg-teal-50 rounded-full px-2.5 py-0.5">Met</span>
  if (value >= target - 10)
    return <span className="text-[11px] font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5">Near</span>
  return <span className="text-[11px] font-medium text-red-600 bg-red-50 rounded-full px-2.5 py-0.5">Below</span>
}

function barColor(v: number, t: number): 'teal' | 'amber' | 'red' {
  if (v >= t) return 'teal'
  if (v >= t - 10) return 'amber'
  return 'red'
}

/* Survey form */
function SurveyForm({
  subjectId,
  cos,
  onSubmitted,
}: {
  subjectId: string
  cos: COAttainmentRow[]
  onSubmitted: () => void
}) {
  const { toast } = useToast()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [saving, setSaving]   = useState(false)

  async function submit() {
    if (Object.keys(ratings).length < cos.length) {
      toast('Please rate all COs.', 'error')
      return
    }
    setSaving(true)
    try {
      await apiPost(EP.ATTAINMENT_CALCULATE(subjectId), { surveyRatings: ratings })
      toast('Survey submitted.', 'success')
      onSubmitted()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Submission failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {cos.map((co) => (
        <div key={co.coId} className="border border-brand-100 rounded-card p-4">
          <p className="text-brand-950 text-[13px] mb-3">
            <span className="text-brand-500 font-medium mr-1">{co.coNumber}:</span>
            How well did this course help you achieve this outcome?
          </p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRatings((r) => ({ ...r, [co.coId]: v }))}
                aria-pressed={ratings[co.coId] === v}
                className={clsx(
                  'w-9 h-9 rounded-lg border text-[13px] font-medium transition-colors',
                  ratings[co.coId] === v
                    ? 'bg-brand-900 border-brand-900 text-white'
                    : 'border-brand-100 text-brand-300 hover:border-brand-500 hover:text-brand-700'
                )}
              >{v}</button>
            ))}
            <span className="self-center text-brand-300 text-[11px]">
              1=Strongly Disagree · 5=Strongly Agree
            </span>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Button variant="primary" size="sm" loading={saving} onClick={() => void submit()}>
          <Send size={13} aria-hidden="true" />
          Submit survey
        </Button>
      </div>
    </div>
  )
}

/* Main */
export function AttainmentView() {
  const { toast } = useToast()
  const [data, setData]         = useState<AttainmentData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [recalcing, setRecalcing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const subjectId = 'current'

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await apiGet<AttainmentData>(EP.ATTAINMENT_CO(subjectId))
      setData(d)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attainment.')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void fetchData() }, [fetchData])

  async function recalculate() {
    setRecalcing(true)
    try {
      await apiPost(EP.ATTAINMENT_CALCULATE(subjectId), {})
      toast('Recalculated.', 'success')
      void fetchData()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Recalculation failed.', 'error')
    } finally {
      setRecalcing(false)
    }
  }

  async function submitToHOD() {
    setSubmitting(true)
    try {
      await apiPost(EP.SUBJECT_SUBMIT(subjectId), {})
      toast('Submitted for HOD approval.', 'success')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Submission failed.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const rows = data?.coAttainment ?? []

  return (
    <div>
      <PageHeader
        title={data ? `Attainment — ${data.subjectCode} ${data.subjectName}` : 'Attainment'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" loading={recalcing} onClick={() => void recalculate()}>
              <RefreshCw size={13} />
              Recalculate
            </Button>
            {data?.allCalculated && (
              <Button variant="primary" size="sm" loading={submitting} onClick={() => void submitToHOD()}>
                <Send size={13} />
                Submit to HOD
              </Button>
            )}
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Section 1: Direct */}
      <section className="mb-8">
        <h2 className="text-brand-950 text-[14px] font-medium mb-4">Direct Attainment</h2>
        {loading ? <SkeletonTable rows={4} /> : (
          <div className="bg-white border border-brand-100 rounded-card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-brand-100">
                  {['CO','Description','Target %','Direct %','Progress','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.coId} className={clsx('border-b border-brand-100 last:border-0', i % 2 !== 0 && 'bg-brand-50/40')}>
                    <td className="px-4 py-3 font-medium text-brand-500">{row.coNumber}</td>
                    <td className="px-4 py-3 text-brand-950 max-w-[200px]"><p className="line-clamp-2 text-[12px]">{row.description}</p></td>
                    <td className="px-4 py-3 tabular-nums">{row.targetPercentage}%</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{row.directAttainment.toFixed(1)}%</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <ProgressBar value={row.directAttainment} color={barColor(row.directAttainment, row.targetPercentage)} />
                    </td>
                    <td className="px-4 py-3">
                      <AttainmentStatus value={row.directAttainment} target={row.targetPercentage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2: Indirect survey */}
      <section className="mb-8">
        <h2 className="text-brand-950 text-[14px] font-medium mb-4">Indirect Attainment — Course Exit Survey</h2>
        {!loading && (
          data?.indirectSubmitted
            ? (
              <div className="bg-white border border-brand-100 rounded-card p-5">
                <p className="text-teal-600 text-[13px] font-medium mb-3">Survey submitted ✓</p>
                <div className="flex flex-col gap-2">
                  {rows.map((row) => (
                    <div key={row.coId} className="flex items-center gap-3">
                      <span className="text-brand-500 text-[12px] font-medium w-10">{row.coNumber}</span>
                      <ProgressBar value={(row.indirectAttainment ?? 0) * 20} color="teal" showLabel={false} />
                      <span className="text-[12px] tabular-nums w-10">{row.indirectAttainment?.toFixed(1) ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
            : (
              <div className="bg-white border border-brand-100 rounded-card p-5">
                <p className="text-brand-300 text-[13px] mb-4">Not yet submitted. Rate each CO (1–5):</p>
                <SurveyForm subjectId={subjectId} cos={rows} onSubmitted={fetchData} />
              </div>
            )
        )}
      </section>

      {/* Section 3: Final */}
      <section>
        <h2 className="text-brand-950 text-[14px] font-medium mb-1">Final Attainment</h2>
        <p className="text-brand-300 text-[12px] mb-4">Final = (Direct × 80%) + (Indirect × 20%)</p>
        {loading ? <SkeletonTable rows={4} /> : (
          <div className="bg-white border border-brand-100 rounded-card overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-brand-100">
                  {['CO','Direct %','Indirect %','Final %','Target %','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-brand-300 text-[11px] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const fin = row.finalAttainment
                  return (
                    <tr key={row.coId} className={clsx('border-b border-brand-100 last:border-0', i % 2 !== 0 && 'bg-brand-50/40')}>
                      <td className="px-4 py-3 font-medium text-brand-500">{row.coNumber}</td>
                      <td className="px-4 py-3 tabular-nums">{row.directAttainment.toFixed(1)}%</td>
                      <td className="px-4 py-3 tabular-nums">{row.indirectAttainment?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums font-medium">{fin?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{row.targetPercentage}%</td>
                      <td className="px-4 py-3">
                        {fin !== null && fin !== undefined
                          ? <AttainmentStatus value={fin} target={row.targetPercentage} />
                          : <span className="text-brand-300 text-[12px]">Pending</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
