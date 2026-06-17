import { Router } from 'express'
import * as cosController from './cos.controller'
import { validateBody } from '@/middleware/validate.middleware'
import {
  createCOSchema,
  updateCOSchema,
  setTargetSchema,
} from './cos.schema'

// mergeParams: true is CRITICAL — makes req.params.subjectId available
export const cosRouter = Router({ mergeParams: true })

cosRouter.get('/',       cosController.getCOsForSubject)
cosRouter.post('/',      validateBody(createCOSchema), cosController.createCO)
cosRouter.put('/:coId',  validateBody(updateCOSchema), cosController.updateCO)
cosRouter.delete('/:coId', cosController.deleteCO)
cosRouter.patch(
  '/:coId/target',
  validateBody(setTargetSchema),
  cosController.setTarget
)
