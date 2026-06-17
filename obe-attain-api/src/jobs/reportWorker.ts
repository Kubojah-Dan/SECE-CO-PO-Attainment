/**
 * Report Worker — Phase 4 replacement
 * Routes all 5 job types to the correct generator.
 * BullMQ handles retry (3 attempts, exponential backoff).
 */
import { Worker } from 'bullmq'
import { redis } from '@/config/redis'
import { prisma } from '@/config/prisma'
import logger from '@/utils/logger'
import type { ReportJobData } from './reportQueue'
import {
  generateCOAttainmentReport,
  generateStudentPerformanceReport,
  generatePOAttainmentReport,
  generateNBAReport,
  generateNAACReport,
} from '@/modules/reports/reports.service'
import type { ReportFormat } from '@/builders/builder.types'

export function startReportWorker(): void {
  const worker = new Worker<ReportJobData>(
    'reports',
    async (job) => {
      const { jobId, type, params, requestedBy } = job.data

      logger.info(`[ReportWorker] Starting job ${jobId} type=${type}`)

      await prisma.reportJob.update({
        where: { id: jobId },
        data:  { status: 'processing' },
      })

      let result: { filename: string; filePath: string; mimeType: string }

      const p = params as Record<string, unknown>
      const format = (p['format'] as ReportFormat | undefined) ?? 'pdf'

      switch (type) {
        case 'co-attainment':
          result = await generateCOAttainmentReport(
            p['subjectId'] as string, format, requestedBy
          )
          break

        case 'student-performance':
          result = await generateStudentPerformanceReport(
            p['subjectId'] as string, format, requestedBy
          )
          break

        case 'po-attainment':
          result = await generatePOAttainmentReport(
            p['deptId'] as string, format, requestedBy
          )
          break

        case 'nba':
          result = await generateNBAReport(requestedBy)
          break

        case 'naac':
          result = await generateNAACReport(requestedBy)
          break

        default:
          throw new Error(`Unknown report type: ${type}`)
      }

      await prisma.reportJob.update({
        where: { id: jobId },
        data: {
          status:   'done',
          filename: result.filename,
          filePath: result.filePath,
        },
      })

      logger.info(`[ReportWorker] Completed job ${jobId} → ${result.filename}`)
    },
    {
      connection: redis,
      concurrency: 2,
    }
  )

  worker.on('failed', async (job, err) => {
    logger.error(`[ReportWorker] Job ${job?.data.jobId} failed: ${err.message}`)
    if (job?.data.jobId) {
      await prisma.reportJob.update({
        where: { id: job.data.jobId },
        data:  { status: 'failed', errorMsg: err.message },
      }).catch(() => {/* swallow DB error in error handler */})
    }
  })

  logger.info('[ReportWorker] Worker started')
}
