import { Queue } from 'bullmq'
import { redis } from '@/config/redis'

export interface ReportJobData {
  jobId: string
  type: string
  params: Record<string, unknown>
  requestedBy: string
}

export const reportQueue = new Queue<ReportJobData>('reports', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
})

export async function addReportJob(data: ReportJobData) {
  return reportQueue.add('generate', data, { jobId: data.jobId })
}
