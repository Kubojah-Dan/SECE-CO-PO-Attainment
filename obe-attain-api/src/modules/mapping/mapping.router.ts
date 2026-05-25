import { Router } from 'express'
import * as mappingController from './mapping.controller'
import { validateBody } from '@/middleware/validate.middleware'
import { saveMappingSchema } from './mapping.schema'

// mergeParams: true is CRITICAL
export const mappingRouter = Router({ mergeParams: true })

// Static routes BEFORE any params
mappingRouter.get('/stats', mappingController.getMappingStats)
mappingRouter.get('/',      mappingController.getMapping)
mappingRouter.put('/',      validateBody(saveMappingSchema), mappingController.saveMapping)
