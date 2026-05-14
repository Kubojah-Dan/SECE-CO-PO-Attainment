import { useEffect, useState } from 'react'
import { FileText, BarChart2, Map, ClipboardList, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { ReportJobBanner } from '@/components/ui/ReportJobBanner'
import { Button } from '@/components/ui/Button'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import type { AssignedSubject } from '@/types/api'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'

interface ReportCard { icon: React.ReactNode; title: string; subjectId: string; reportKey: string }

export function FacultyReportsPage() {
  useEffect(() => { document.title = 'Reports — OBE Attain' }, [])
  const { directDownload } = useReportGeneration()
  const [subjects, setSubjects] = useState<AssignedSubject[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [activeJobs, setActiveJobs] = useState<{ jobId: string; filename: string }[]>([])

  useEffect(() => {
    apiGet<{ assignedSubjects: AssignedSubject[] }>(EP.ANALYTICS_FACULTY)
      .then((d) => {
        setSubjects(d.assignedSubjects)
        if (d.assignedSubjects.length > 0) setSelectedId(d.assignedSubjects[0].id)
      })
      .catch(() => {})
  }, [])

  const selected = subjects.find((s) => s.id === selectedId)

  const REPORT_CARDS = [
    { icon: <BarChart2 size={22} />, title: 'CO Attainment Report', key: 'co-attainment' },
    { icon: <ClipboardList size={22} />, title: 'Student Performance', key: 'student-performance' },
    { icon: <Map size={22} />, title: 'CO-PO Mapping Summary', key: 'co-po-mapping' },
    { icon: <FileText size={22} />, title: 'Mark Sheet', key: 'marksheet' },
  ]

  function download(key: string, format: 'pdf' | 'excel') {
    if (!selectedId) return
    const url = key === 'co-attainment'
      ? `${EP.REPORT_SUBJECT_CO(selectedId)}?format=${format}`
      : key === 'student-performance'
      ? `${EP.REPORT_SUBJECT_PERF(selectedId)}?format=${format}`
      : `/api/reports/subjects/${selectedId}/${key}?format=${format}`
    directDownload(url, `${selected?.code ?? 'report'}-${key}.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" />

      {activeJobs.length > 0 && (
        <div className="flex flex-col gap-2">
          {activeJobs.map((j) => (
            <ReportJobBanner
              key={j.jobId}
              jobId={j.jobId}
              filename={j.filename}
              onDismiss={() => setActiveJobs((prev) => prev.filter((x) => x.jobId !== j.jobId))}
            />
          ))}
        </div>
      )}

      <SectionCard title="Subject Reports">
        <div className="mb-5">
          <label htmlFor="subject-select" className="text-[13px] font-medium text-brand-950 block mb-1.5">
            Select subject
          </label>
          <select
            id="subject-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white w-full max-w-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_CARDS.map((card) => (
            <div key={card.key} className="border border-brand-100 rounded-card p-4 flex flex-col gap-3">
              <div className="text-brand-300">{card.icon}</div>
              <p className="text-brand-950 text-[13px] font-medium">{card.title}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => download(card.key, 'pdf')}>
                  <Download size={13} aria-hidden="true" />PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => download(card.key, 'excel')}>
                  <Download size={13} aria-hidden="true" />Excel
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
