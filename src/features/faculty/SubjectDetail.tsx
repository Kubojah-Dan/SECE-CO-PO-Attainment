import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { Subject } from '@/types/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusChip } from '@/components/ui/StatusChip'
import { Button } from '@/components/ui/Button'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { useToast } from '@/hooks/useToast'
import { clsx } from 'clsx'

const CODefinitionTab    = lazy(() => import('./tabs/CODefinitionTab').then((m) => ({ default: m.CODefinitionTab })))
const COPOMappingTab     = lazy(() => import('./tabs/COPOMappingTab').then((m) => ({ default: m.COPOMappingTab })))
const MarkEntryTab       = lazy(() => import('./tabs/MarkEntryTab').then((m) => ({ default: m.MarkEntryTab })))

type TabKey = 'overview' | 'co' | 'mapping' | 'marks'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'co',       label: 'CO Definition' },
  { key: 'mapping',  label: 'CO-PO Mapping' },
  { key: 'marks',    label: 'Mark Entry' },
]

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse pt-4">
      <div className="h-8 w-40 rounded bg-brand-100" />
      <div className="h-40 rounded-card bg-brand-100" />
    </div>
  )
}

function OverviewTab({ subject }: { subject: Subject }) {
  return (
    <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[
        { label: 'Subject Code', value: subject.code },
        { label: 'Name', value: subject.name },
        { label: 'Semester', value: `Semester ${subject.semester}` },
        { label: 'Regulation', value: subject.regulation ?? '—' },
        { label: 'Faculty', value: subject.facultyName ?? '—' },
        { label: 'Type', value: subject.isLab ? 'Lab' : 'Theory' },
      ].map((item) => (
        <div key={item.label} className="bg-white border border-brand-100 rounded-card p-4">
          <p className="text-brand-300 text-[11px] uppercase tracking-wide mb-1">
            {item.label}
          </p>
          <p className="text-brand-950 text-[14px] font-medium">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function SubjectDetail() {
  const { id: subjectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const activeTab = (searchParams.get('tab') as TabKey) ?? 'overview'
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchSubject = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<Subject>(EP.SUBJECT_BY_ID(subjectId))
      setSubject(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load subject.')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => { void fetchSubject() }, [fetchSubject])

  function setTab(tab: TabKey) {
    setSearchParams({ tab })
  }

  async function handleSubmit() {
    if (!subjectId) return
    setSubmitting(true)
    try {
      await apiPost(EP.SUBJECT_SUBMIT(subjectId), {})
      toast('Subject submitted for HOD approval.', 'success')
      setSubject((s) => s ? { ...s, status: 'submitted' } : s)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to submit.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-64 rounded bg-brand-100 mb-2" />
        <div className="h-4 w-48 rounded bg-brand-100 mb-8" />
        <div className="h-40 rounded-card bg-brand-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          ← Back
        </Button>
        <ErrorBanner message={error} onRetry={fetchSubject} />
      </div>
    )
  }

  if (!subject) return null

  return (
    <div>
      <PageHeader
        title={`${subject.code} — ${subject.name}`}
        subtitle={`Semester ${subject.semester}${subject.regulation ? ` · Regulation ${subject.regulation}` : ''}${subject.facultyName ? ` · Faculty: ${subject.facultyName}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={subject.status} />
            {subject.status === 'draft' && (
              <Button
                variant="primary"
                size="sm"
                loading={submitting}
                onClick={handleSubmit}
              >
                <Send size={13} aria-hidden="true" />
                Submit for approval
              </Button>
            )}
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-brand-100 mb-6 -mt-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            id={`tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            onClick={() => setTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-brand-300 hover:text-brand-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Suspense fallback={<TabSkeleton />}>
        {activeTab === 'overview' && <OverviewTab subject={subject} />}
        {activeTab === 'co'       && subjectId && <CODefinitionTab subjectId={subjectId} />}
        {activeTab === 'mapping'  && subjectId && <COPOMappingTab subjectId={subjectId} />}
        {activeTab === 'marks'    && subjectId && (
          <MarkEntryTab subjectId={subjectId} isLab={subject.isLab ?? false} />
        )}
      </Suspense>
    </div>
  )
}
