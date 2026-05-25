import { Router } from 'express'
import * as subjectsController from './subjects.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateQuery, validateParams } from '@/middleware/validate.middleware'
import {
  createSubjectSchema,
  updateSubjectSchema,
  assignFacultySchema,
  listSubjectsQuerySchema,
  idParamSchema,
} from './subjects.schema'
import { z } from 'zod'

export const subjectsRouter = Router()

// ── Subject CRUD ──────────────────────────────────────────────────────────────
subjectsRouter.get(
  '/',
  validateQuery(listSubjectsQuerySchema),
  subjectsController.listSubjects
)

subjectsRouter.post(
  '/',
  authorize('SUPER_ADMIN', 'HOD'),
  validateBody(createSubjectSchema),
  subjectsController.createSubject
)

subjectsRouter.get(
  '/:id',
  validateParams(idParamSchema),
  subjectsController.getSubjectById
)

subjectsRouter.put(
  '/:id',
  authorize('SUPER_ADMIN', 'HOD'),
  validateParams(idParamSchema),
  validateBody(updateSubjectSchema),
  subjectsController.updateSubject
)

subjectsRouter.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validateParams(idParamSchema),
  subjectsController.deleteSubject
)

// ── Faculty assignment ─────────────────────────────────────────────────────────
subjectsRouter.get(
  '/:id/faculty',
  validateParams(idParamSchema),
  subjectsController.getFacultyForSubject
)

subjectsRouter.post(
  '/:id/faculty',
  authorize('SUPER_ADMIN', 'HOD'),
  validateParams(idParamSchema),
  validateBody(assignFacultySchema),
  subjectsController.assignFaculty
)

const facultyParamSchema = z.object({
  id: z.string().cuid(),
  facultyId: z.string().cuid(),
})

subjectsRouter.delete(
  '/:id/faculty/:facultyId',
  authorize('SUPER_ADMIN', 'HOD'),
  validateParams(facultyParamSchema),
  subjectsController.removeFaculty
)

// ── Nested routers (mounted AFTER all static subject routes) ──────────────────
import { cosRouter } from '@/modules/cos/cos.router'
import { mappingRouter } from '@/modules/mapping/mapping.router'
import { marksRouter } from '@/modules/marks/marks.router'

subjectsRouter.use('/:subjectId/cos',           cosRouter)
subjectsRouter.use('/:subjectId/co-po-mapping', mappingRouter)
subjectsRouter.use('/:subjectId/marks',         marksRouter)

// ── Phase 3: Attainment (nested) + submit for approval ────────────────────────
import { attainmentSubjectRouter } from '@/modules/attainment/attainment.router'
import { hodController } from '@/modules/hod/hod.controller.proxy'

subjectsRouter.use('/:subjectId/attainment', attainmentSubjectRouter)

// Faculty submits subject for HOD approval
subjectsRouter.post(
  '/:id/submit',
  authorize('FACULTY', 'SUPER_ADMIN'),
  hodController.submitForApproval
)
