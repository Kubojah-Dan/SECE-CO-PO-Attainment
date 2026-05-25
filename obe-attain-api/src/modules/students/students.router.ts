import { Router } from 'express'
import * as studentsController from './students.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateQuery, validateParams } from '@/middleware/validate.middleware'
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema,
  idParamSchema,
} from './students.schema'
import { excelUpload } from '@/config/multer'

export const studentsRouter = Router()

// ── IMPORTANT: static routes BEFORE /:id ────────────────────────────────────

// GET /students/template
studentsRouter.get('/template', studentsController.downloadTemplate)

// POST /students/import
studentsRouter.post(
  '/import',
  authorize('SUPER_ADMIN', 'HOD'),
  excelUpload,
  studentsController.bulkImport
)

// ── CRUD ──────────────────────────────────────────────────────────────────────

studentsRouter.get(
  '/',
  validateQuery(listStudentsQuerySchema),
  studentsController.listStudents
)

studentsRouter.post(
  '/',
  authorize('SUPER_ADMIN', 'HOD'),
  validateBody(createStudentSchema),
  studentsController.createStudent
)

studentsRouter.get(
  '/:id',
  validateParams(idParamSchema),
  studentsController.getStudentById
)

studentsRouter.put(
  '/:id',
  authorize('SUPER_ADMIN', 'HOD'),
  validateParams(idParamSchema),
  validateBody(updateStudentSchema),
  studentsController.updateStudent
)

studentsRouter.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  validateParams(idParamSchema),
  studentsController.deleteStudent
)
