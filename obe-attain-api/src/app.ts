import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from '@/config/env'
import { prisma } from '@/config/prisma'
import { redis } from '@/config/redis'
import { morganStream } from '@/utils/logger'
import { errorHandler } from '@/middleware/errorHandler.middleware'
import { authenticate } from '@/middleware/auth.middleware'
import { ApiError } from '@/utils/ApiError'
import { authRouter } from '@/modules/auth/auth.router'
import { usersRouter } from '@/modules/users/users.router'
import { departmentsRouter } from '@/modules/departments/departments.router'
import { regulationsRouter } from '@/modules/regulations/regulations.router'
import { academicYearsRouter } from '@/modules/academicYears/academicYears.router'
import { posRouter, psosRouter } from '@/modules/outcomes/outcomes.router'
// Phase 2 routers
import { subjectsRouter } from '@/modules/subjects/subjects.router'
import { studentsRouter } from '@/modules/students/students.router'
// Phase 3 routers
import { attainmentRouter } from '@/modules/attainment/attainment.router'
import { hodRouter } from '@/modules/hod/hod.router'
import { analyticsRouter } from '@/modules/analytics/analytics.router'
// Phase 4 routers
import { reportsRouter } from '@/modules/reports/reports.router'
import { auditRouter } from '@/modules/audit/audit.router'
import { systemConfigRouter } from '@/modules/systemConfig/systemConfig.router'
import type { Request, Response } from 'express'

export function createApp() {
  const app = express()

  // 1. Security headers
  app.use(helmet())

  // 2. CORS — locked to FRONTEND_URL
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // 3. Rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' },
  })
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts' },
  })

  // 4. Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // 5. HTTP logging
  app.use(morgan('dev', { stream: morganStream }))

  // 6. Global rate limit on /api
  app.use('/api', globalLimiter)

  // 7. Health check (no auth)
  app.get('/health', async (_req: Request, res: Response) => {
    const result: {
      status: string
      database: string
      redis: string
      uptime: number
      timestamp: string
    } = {
      status: 'ok',
      database: 'unknown',
      redis: 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }

    try {
      await prisma.$queryRaw`SELECT 1`
      result.database = 'connected'
    } catch {
      result.database = 'disconnected'
      result.status = 'degraded'
    }

    try {
      await redis.ping()
      result.redis = 'connected'
    } catch {
      result.redis = 'disconnected'
      result.status = 'degraded'
    }

    return res.status(result.status === 'ok' ? 200 : 503).json(result)
  })

  app.get('/api/version', (_req: Request, res: Response) =>
    res.json({ version: '1.0.0', environment: env.NODE_ENV })
  )

  // 8. Routers
  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api/users', authenticate, usersRouter)
  app.use('/api/departments', authenticate, departmentsRouter)
  app.use('/api/regulations', authenticate, regulationsRouter)
  app.use('/api/academic-years', authenticate, academicYearsRouter)
  app.use('/api/pos', authenticate, posRouter)
  app.use('/api/psos', authenticate, psosRouter)
  // Phase 2 — subjects (includes nested cos, mapping, marks, attainment)
  app.use('/api/subjects', authenticate, subjectsRouter)
  app.use('/api/students', authenticate, studentsRouter)
  // Phase 3 — attainment settings, hod workflow, analytics
  app.use('/api/attainment', authenticate, attainmentRouter)
  app.use('/api/hod',        authenticate, hodRouter)
  app.use('/api/analytics',  authenticate, analyticsRouter)
  // Phase 4 — reports, audit logs, system config
  app.use('/api/reports',    authenticate, reportsRouter)
  app.use('/api/audit-logs', authenticate, auditRouter)
  app.use('/api/config',     authenticate, systemConfigRouter)

  // 9. 404 handler
  app.use((_req: Request, _res: Response, next) =>
    next(ApiError.notFound('Route not found'))
  )

  // 10. Global error handler — must be last
  app.use(errorHandler)

  return app
}
