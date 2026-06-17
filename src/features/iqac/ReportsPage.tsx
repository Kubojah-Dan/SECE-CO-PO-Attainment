import { useCallback, useEffect, useState } from 'react'
import { FileText, Award, BarChart2, Building2, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { ReportJobBanner } from '@/components/ui/ReportJobBanner'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusChip } from '@/components/ui/StatusChip'
import { Button } from '@/components/ui/Button'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import { apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { ReportJob } from '@/types/phase4'

const INST_REPORTS = [
  { icon: <Award size={20} />,    title: 'NBA Comprehensive Report',    type: 'nba',  queued: true  },
  { icon: <FileText size={20} />, title: 'NAAC Report',                 type: 'naac', queued: true  },
  { icon: <BarChart2 size={20} />,title: 'Institution PO Attainment',   type: 'institution-po', queued: false },
  { icon: <Building2 size={20} />,title: 'All Departments Summary',     type: 'dept-summary',   queued: false },
]

export function IqacReportsPage() {
  useEffect(() => { document.title = 'Reports — OBE Attain' }, [])
  const { generateReport, jobs, removeJob, directDownload } = useReportGeneration()
  const [history, setHistory] = useState<ReportJob[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [generating, setGenerating] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<ReportJob[]>(EP.REPORT_HISTORY)
      setHistory(data)
    } catch {/* ignore */} finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { void fetchHistory() }, [fetchHistory])

  async function handleGenerate(type: string, queued: boolean) {
    setGenerating(type)
    try {
      if (queued) {
        const jobId = await generateReport({ type, format: 'pdf' })
        setActiveJobIds((prev) => [jobId, ...prev])
      } else {
        directDownload(`/api/reports/${type}?format=pdf`, `${type}.pdf`)
      }
    } catch {/* toast handled in hook */} finally {
      setGenerating(null)
    }
  }

  const recentJobs = jobs.filter((j) => activeJobIds.includes(j.id))

  const histCols: Column<Record<string, unknown>>[] = [
    { key: 'filename', label: 'File' },
    { key: 'type', label: 'Type' },
    { key: 'createdAt', label: 'Generated On' },
    {
      key: 'status',
      label: 'Status',
      width: '100px',
      render: (v) => <StatusChip status={v as 'approved'} />,
    },
    {
      key: 'downloadUrl',
      label: 'Download',
      width: '80px',
      render: (v, row) =>
        v ? (
          <a href={v as string} download={row.filename as string}
            className="text-brand-700 hover:underline text-[12px] flex items-center gap-1">
            <Download size={12} />PDF
          </a>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" />

      {recentJobs.length > 0 && (
        <SectionCard title="Active Jobs">
          <div className="flex flex-col gap-2">
            {recentJobs.map((j) => (
              <ReportJobBanner key={j.id} jobId={j.id} filename={j.filename} onDismiss={() => removeJob(j.id)} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Institution Reports">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INST_REPORTS.map((r) => (
            <div key={r.type} className="border border-brand-100 rounded-card p-4 flex flex-col gap-3">
              <div className="text-brand-300">{r.icon}</div>
              <p className="text-brand-950 text-[13px] font-medium">{r.title}</p>
              <p className="text-brand-300 text-[11px]">{r.queued ? 'Large report — queued generation' : 'Direct download available'}</p>
              <Button
                variant="primary" size="sm"
                loading={generating === r.type}
                onClick={() => void handleGenerate(r.type, r.queued)}
              >
                {r.queued ? 'Generate PDF' : 'Download PDF'}
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Report History">
        <DataTable
          columns={histCols}
          data={history as Record<string, unknown>[]}
          loading={historyLoading}
          emptyMessage="No reports generated yet."
        />
      </SectionCard>
    </div>
  )
}
