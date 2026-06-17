import { Router } from 'express'
import * as regulationsController from './regulations.controller'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateParams } from '@/middleware/validate.middleware'
import { z } from 'zod'

const nameSchema = z.object({ name: z.string().min(1).max(50) })
const idParamSchema = z.object({ id: z.string().cuid() })

const router = Router()

router.get('/', authorize('SUPER_ADMIN', 'HOD', 'FACULTY'), regulationsController.listRegulations)
router.post('/', authorize('SUPER_ADMIN'), validateBody(nameSchema), regulationsController.createRegulation)
router.put('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), validateBody(nameSchema), regulationsController.updateRegulation)
router.delete('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), regulationsController.deleteRegulation)

export { router as regulationsRouter }
