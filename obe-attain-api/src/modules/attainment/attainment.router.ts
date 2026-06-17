import { Router } from 'express'
import * as attainmentController from './attainment.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody } from '@/middleware/validate.middleware'
import { submitIndirectSchema, updateConfigSchema } from './attainment.schema'

// ── Nested router — mounted at /:subjectId/attainment ─────────────────────────
// mergeParams:true gives access to req.params.subjectId
export const attainmentSubjectRouter = Router({ mergeParams: true })

attainmentSubjectRouter.post('/calculate',  attainmentController.calculate)
attainmentSubjectRouter.get('/direct',      attainmentController.getDirectAttainment)
attainmentSubjectRouter.get('/indirect',    attainmentController.getIndirectAttainment)
attainmentSubjectRouter.post(
  '/indirect',
  validateBody(submitIndirectSchema),
  attainmentController.submitIndirect
)
attainmentSubjectRouter.get('/final',       attainmentController.getFinalAttainment)
attainmentSubjectRouter.get('/co-po',       attainmentController.getCOPOAttainment)

// ── Top-level router — mounted at /api/attainment ─────────────────────────────
export const attainmentRouter = Router()

attainmentRouter.get(
  '/settings',
  authorize('SUPER_ADMIN', 'HOD', 'FACULTY'),
  attainmentController.getSettings
)
attainmentRouter.patch(
  '/settings',
  authorize('SUPER_ADMIN'),
  validateBody(updateConfigSchema),
  attainmentController.updateSettings
)
