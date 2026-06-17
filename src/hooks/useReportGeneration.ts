import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiPost, apiGet } from '@/lib/api'
import { EP } from '@/lib/endpoints'
import type { ReportJob } from '@/types/phase4'

interface ReportStore {
  jobs: ReportJob[]
  queueReport: (params: Record<string, unknown>) => Promise<ReportJob>
  updateJob: (jobId: string, update: Partial<ReportJob>) => void
  removeJob: (jobId: string) => void
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      jobs: [],

      queueReport: async (params) => {
        const job = await apiPost<ReportJob>(EP.REPORTS_JOBS, params)
        set((s) => ({ jobs: [job, ...s.jobs].slice(0, 20) }))
        return job
      },

      updateJob: (jobId, update) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, ...update } : j)),
        })),

      removeJob: (jobId) =>
        set((s) => ({ jobs: s.jobs.filter((j) => j.id !== jobId) })),
    }),
    { name: 'obe_reports' }
  )
)

export function useReportGeneration() {
  const { jobs, queueReport, updateJob, removeJob } = useReportStore()

  async function generateReport(params: Record<string, unknown>): Promise<string> {
    const job = await queueReport(params)
    // Kick off background poll
    pollJob(job.id)
    return job.id
  }

  function pollJob(jobId: string) {
    const interval = setInterval(async () => {
      try {
        const job = await apiGet<ReportJob>(EP.REPORT_JOB_BY_ID(jobId))
        updateJob(jobId, { status: job.status, downloadUrl: job.downloadUrl })
        if (job.status === 'done' || job.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
        updateJob(jobId, { status: 'failed' })
      }
    }, 3000)
  }

  function directDownload(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${url}`
    a.download = filename
    a.click()
  }

  return { jobs, generateReport, removeJob, directDownload }
}
