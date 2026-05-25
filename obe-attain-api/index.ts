// express-async-errors MUST be the very first import
import 'express-async-errors'
import 'dotenv/config'

import { createApp } from './src/app'
import { prisma } from './src/config/prisma'
import { redis } from './src/config/redis'
import { env } from './src/config/env'
import logger from './src/utils/logger'

import { startReportWorker } from './src/jobs/reportWorker'
import { ensureReportsDir, ensureBackupsDir } from './src/modules/reports/reports.service'
import fs from 'fs'
import path from 'path'

async function main() {
  const app = createApp()

  // Connect to database
  await prisma.$connect()
  logger.info('Database connected')

  // Connect to Redis
  await redis.connect()

  // Ensure storage directories exist
  ensureReportsDir()
  ensureBackupsDir()

  // Startup cleanup: delete report files older than 7 days
  try {
    const reportsDir = env.REPORTS_DIR
    const cutoff     = Date.now() - 7 * 24 * 60 * 60 * 1000
    fs.readdirSync(reportsDir).forEach((file) => {
      const fp   = path.join(reportsDir, file)
      const stat = fs.statSync(fp)
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        fs.unlinkSync(fp)
        logger.info(`[Cleanup] Deleted old report: ${file}`)
      }
    })
  } catch { /* dir may not exist yet — ignore */ }

  // Start report worker
  if (env.NODE_ENV !== 'test') startReportWorker()

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 OBE Attain API running on port ${env.PORT} [${env.NODE_ENV}]`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`)
    server.close(async () => {
      await prisma.$disconnect()
      redis.disconnect()
      logger.info('Shutdown complete')
      process.exit(0)
    })
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((err: Error) => {
  logger.error('Failed to start server', { error: err.message })
  process.exit(1)
})
