import { Router } from 'express'
import * as outcomesController from './outcomes.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody } from '@/middleware/validate.middleware'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().cuid(),
        description: z.string().min(10).max(500),
      })
    )
    .min(1),
})

// PO Router — mounted at /api/pos
export const posRouter = Router()
posRouter.get('/', authorize('SUPER_ADMIN', 'HOD', 'FACULTY', 'IQAC'), outcomesController.listPOs)
posRouter.put('/', authorize('SUPER_ADMIN'), validateBody(bulkUpdateSchema), outcomesController.bulkUpdatePOs)

// PSO Router — mounted at /api/psos
export const psosRouter = Router()
psosRouter.get('/', authorize('SUPER_ADMIN', 'HOD', 'FACULTY', 'IQAC'), outcomesController.listPSOs)
psosRouter.put('/', authorize('SUPER_ADMIN'), validateBody(bulkUpdateSchema), outcomesController.bulkUpdatePSOs)
