import { useEffect, useState } from 'react'
import { BarChart2, FileText, Users, BookOpen, GraduationCap, Award } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { ReportJobBanner } from '@/components/ui/ReportJobBanner'
import { Button } from '@/components/ui/Button'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import { EP } from '@/lib/endpoints'

const REPORT_CARDS = [
  { icon: <BarChart2 size={20} />, title: 'PO Attainment — Dept',    type: 'dept-po-attainment' },
  { icon: <Award size={20} />,     title: 'PSO Attainment — Dept',   type: 'dept-pso-attainment' },
  { icon: <Users size={20} />,     title: 'Faculty Submission Summary', type: 'faculty-submission' },
  { icon: <BookOpen size={20} />,  title: 'CO Attainment — All Subjects', type: 'co-attainment-all' },
  { icon: <GraduationCap size={20} />, title: 'Student Performance — Dept', type: 'student-perf-dept' },
  { icon: <FileText size={20} />,  title: 'Department NBA Summary',  type: 'dept-nba' },
]

export function HodReportsPage() {
  useEffect(() => { document.title = 'Reports — OBE Attain' }, [])
  const { generateReport, jobs, removeJob } = useReportGeneration()
  const [year, setYear] = useState('2025-26')
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  async function handleGenerate(type: string, format: 'pdf' | 'excel') {
    setGenerating(`${type}-${format}`)
    try {
      const jobId = await generateReport({ type, format, academicYear: year })
      setActiveJobIds((prev) => [jobId, ...prev].slice(0, 5))
    } catch {
      // toast shown inside hook
    } finally {
      setGenerating(null)
    }
  }

  const recentJobs = jobs.filter((j) => activeJobIds.includes(j.id))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        actions={
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-brand-100 rounded-input px-3 py-2 text-[13px] text-brand-950 bg-white"
            aria-label="Academic year"
          >
            {['2025-26','2024-25','2023-24'].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      />

      {/* Active jobs */}
      {recentJobs.length > 0 && (
        <SectionCard title="Active Jobs">
          <div className="flex flex-col gap-2">
            {recentJobs.map((j) => (
              <ReportJobBanner
                key={j.id}
                jobId={j.id}
                filename={j.filename}
                onDismiss={() => removeJob(j.id)}
              />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Department Reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_CARDS.map((card) => (
            <div key={card.type} className="border border-brand-100 rounded-card p-4 flex flex-col gap-3">
              <div className="text-brand-300">{card.icon}</div>
              <p className="text-brand-950 text-[13px] font-medium">{card.title}</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost" size="sm"
                  loading={generating === `${card.type}-pdf`}
                  onClick={() => void handleGenerate(card.type, 'pdf')}
                >Generate PDF</Button>
                <Button
                  variant="ghost" size="sm"
                  loading={generating === `${card.type}-excel`}
                  onClick={() => void handleGenerate(card.type, 'excel')}
                >Excel</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
