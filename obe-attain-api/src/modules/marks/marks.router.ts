import { Router } from 'express'
import * as marksController from './marks.controller'
import { validateBody, validateQuery } from '@/middleware/validate.middleware'
import {
  bulkSaveMarksSchema,
  singleMarkEntrySchema,
  importMarksQuerySchema,
  marksTemplateQuerySchema,
} from './marks.schema'
import { excelUpload } from '@/config/multer'

// mergeParams: true is CRITICAL
export const marksRouter = Router({ mergeParams: true })

// ── IMPORTANT: static routes BEFORE /:studentId ──────────────────────────────

marksRouter.get('/summary',  marksController.getMarksSummary)

marksRouter.get(
  '/template',
  validateQuery(marksTemplateQuerySchema),
  marksController.downloadTemplate
)

marksRouter.post(
  '/import',
  excelUpload,
  validateQuery(importMarksQuerySchema),
  marksController.importMarks
)

// ── Main CRUD ─────────────────────────────────────────────────────────────────

marksRouter.get('/', marksController.getMarks)

marksRouter.put(
  '/',
  validateBody(bulkSaveMarksSchema),
  marksController.bulkSaveMarks
)

// ── Single student update — AFTER static routes ───────────────────────────────

marksRouter.patch(
  '/:studentId',
  validateBody(singleMarkEntrySchema),
  marksController.updateSingleMark
)
