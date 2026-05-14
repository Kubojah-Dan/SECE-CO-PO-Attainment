import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Upload, BarChart3, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { FacultySubjectsData, AssignedSubject, SubjectStatus } from '@/types/api'
import { StatCard } from '@/components/ui/StatCard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { clsx } from 'clsx'

/* ─── Checklist item ─── */
function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
          done ? 'bg-teal-400' : 'bg-brand-100'
        )}
        aria-hidden="true"
      >
        {done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={clsx('text-[11px]', done ? 'text-brand-950' : 'text-brand-300')}>
        {label}
      </span>
    </div>
  )
}

/* ─── Status chip ─── */
const STATUS_STYLES: Record<SubjectStatus, string> = {
  draft:     'bg-brand-50 text-brand-500',
  submitted: 'bg-amber-50 text-amber-700',
  approved:  'bg-teal-50 text-teal-600',
  rejected:  'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<SubjectStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected',
}

/* ─── Subject card ─── */
function SubjectCard({ subject }: { subject: AssignedSubject }) {
  const navigate = useNavigate()

  return (
    <article className="bg-white border border-brand-100 rounded-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block bg-brand-50 text-brand-500 text-[11px] font-medium rounded px-2 py-0.5 mb-1.5">
            {subject.code}
          </span>
          <h3 className="text-brand-950 text-[13px] font-medium leading-snug">
            {subject.name}
          </h3>
          <p className="text-brand-300 text-[11px] mt-0.5">
            Semester {subject.semester}
          </p>
        </div>
        <span
          className={clsx(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0',
            STATUS_STYLES[subject.status]
          )}
        >
          {STATUS_LABEL[subject.status]}
        </span>
      </div>

      {/* Progress checklist */}
      <div className="flex flex-col gap-2">
        <CheckItem
          done={subject.cosDefined > 0}
          label={`CO Defined (${subject.cosDefined})`}
        />
        <CheckItem done={subject.marksUploaded} label="Marks Uploaded" />
        <CheckItem
          done={subject.attainmentCalculated}
          label="Attainment Calculated"
        />
      </div>

      {/* Rejection remark */}
      {subject.status === 'rejected' && subject.rejectionRemark && (
        <div className="rounded bg-red-50 border border-red-100 px-3 py-2">
          <p className="text-red-600 text-[11px]">
            <span className="font-medium">Remark:</span> {subject.rejectionRemark}
          </p>
        </div>
      )}

      {/* Open button */}
      <button
        type="button"
        onClick={() => navigate(`/faculty/subjects/${subject.id}`)}
        className="flex items-center justify-center gap-1.5 w-full border border-brand-100 rounded-input py-2 text-[12px] text-brand-700 hover:bg-brand-50 hover:border-brand-300 transition-colors"
      >
        <ExternalLink size={12} aria-hidden="true" />
        Open
      </button>
    </article>
  )
}

/* ─── Faculty Dashboard ─── */
export function FacultyDashboard() {
  const [data, setData] = useState<FacultySubjectsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<FacultySubjectsData>(EP.ANALYTICS_FACULTY)
      setData(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load faculty dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const subjects = data?.assignedSubjects ?? []
  const marksCount = subjects.filter((s) => s.marksUploaded).length
  const attainmentCount = subjects.filter((s) => s.attainmentCalculated).length

  return (
    <div className="flex flex-col gap-6">
      {data?.facultyName && (
        <div>
          <h2 className="text-brand-950 text-[15px] font-medium">
            Welcome, {data.facultyName}
          </h2>
          <p className="text-brand-300 text-[12px] mt-0.5">
            Your subject assignments this semester
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
              label="Subjects Assigned"
              value={subjects.length}
              icon={<BookOpen size={17} />}
              accent="brand"
            />
            <StatCard
              label="Marks Uploaded"
              value={marksCount}
              subtext={`${subjects.length - marksCount} remaining`}
              icon={<Upload size={17} />}
              accent="teal"
            />
            <StatCard
              label="Attainment Done"
              value={attainmentCount}
              subtext={`${subjects.length - attainmentCount} pending`}
              icon={<BarChart3 size={17} />}
              accent="brand"
            />
          </>
        )}
      </div>

      {/* Row 2 — Subject cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-brand-100 rounded-card p-5 animate-pulse"
            >
              <div className="w-16 h-4 rounded bg-brand-100 mb-3" />
              <div className="w-40 h-4 rounded bg-brand-100 mb-4" />
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-brand-100" />
                    <div className="w-28 h-3 rounded bg-brand-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
          {subjects.length === 0 && (
            <div className="col-span-2 text-center py-12 text-brand-300 text-[13px]">
              No subjects assigned yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
