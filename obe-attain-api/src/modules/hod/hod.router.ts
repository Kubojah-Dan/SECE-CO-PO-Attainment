import { Router } from 'express'
import * as hodController from './hod.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateQuery } from '@/middleware/validate.middleware'
import { rejectSchema, approvalStatusSchema } from './hod.schema'

export const hodRouter = Router()

// All HOD routes require HOD or SUPER_ADMIN
const hodAuth = authorize('HOD', 'SUPER_ADMIN')

hodRouter.get(
  '/pending-approvals',
  hodAuth,
  hodController.getPendingApprovals
)

hodRouter.get(
  '/approvals',
  hodAuth,
  validateQuery(approvalStatusSchema),
  hodController.getAllApprovals
)

hodRouter.post(
  '/subjects/:subjectId/approve',
  hodAuth,
  hodController.approveSubject
)

hodRouter.post(
  '/subjects/:subjectId/reject',
  hodAuth,
  validateBody(rejectSchema),
  hodController.rejectSubject
)

hodRouter.get(
  '/subjects/:subjectId/remarks',
  hodController.getRemarks  // access check is inside service
)
