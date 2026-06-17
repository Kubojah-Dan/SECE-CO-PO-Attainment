import { Router } from 'express'
import * as academicYearsController from './academicYears.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateParams } from '@/middleware/validate.middleware'
import { z } from 'zod'

const nameSchema = z.object({ name: z.string().min(4).max(20) })
const idParamSchema = z.object({ id: z.string().cuid() })

const router = Router()

router.get('/', academicYearsController.listAcademicYears)
router.post('/', authorize('SUPER_ADMIN'), validateBody(nameSchema), academicYearsController.createAcademicYear)
router.patch('/:id/set-current', authorize('SUPER_ADMIN'), validateParams(idParamSchema), academicYearsController.setCurrent)

export { router as academicYearsRouter }
