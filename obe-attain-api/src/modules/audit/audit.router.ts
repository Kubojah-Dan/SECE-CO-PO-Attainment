import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authorize } from '@/middleware/rbac.middleware'
import { validateQuery } from '@/middleware/validate.middleware'
import * as auditService from './audit.service'
import { sendSuccess } from '@/utils/ApiResponse'

export const auditRouter = Router()

const listAuditLogsQuerySchema = z.object({
  userId:   z.string().cuid().optional(),
  action:   z.string().optional(),
  entity:   z.string().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo:   z.string().datetime({ offset: true }).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
})

auditRouter.get(
  '/',
  authorize('SUPER_ADMIN'),
  validateQuery(listAuditLogsQuerySchema),
  async (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof listAuditLogsQuerySchema>
    const result = await auditService.listAuditLogs(
      {
        userId:   q.userId,
        action:   q.action,
        entity:   q.entity,
        dateFrom: q.dateFrom,
        dateTo:   q.dateTo,
        page:     Number(q.page),
        limit:    Number(q.limit),
      },
      req.user!
    )
    return sendSuccess(res, result)
  }
)

auditRouter.get(
  '/export',
  authorize('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const q = req.query as Record<string, string>
    const buffer = await auditService.exportAuditLogs(
      {
        userId:   q['userId'],
        action:   q['action'],
        entity:   q['entity'],
        dateFrom: q['dateFrom'],
        dateTo:   q['dateTo'],
      },
      req.user!
    )
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"')
    res.send(buffer)
  }
)
