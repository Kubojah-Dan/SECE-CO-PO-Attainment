import { Router } from 'express'
import * as usersController from './users.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateQuery, validateParams } from '@/middleware/validate.middleware'
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  listUsersQuerySchema,
  idParamSchema,
} from './users.schema'

const router = Router()

// All routes require authentication
router.use(authenticate)

router.get('/', authorize('SUPER_ADMIN', 'HOD'), validateQuery(listUsersQuerySchema), usersController.listUsers)
router.post('/', authorize('SUPER_ADMIN'), validateBody(createUserSchema), usersController.createUser)
router.get('/me/profile', usersController.getUserById) // special — gets self
router.patch('/me/password', validateBody(changePasswordSchema), usersController.changeOwnPassword)
router.get('/:id', authorize('SUPER_ADMIN', 'HOD'), validateParams(idParamSchema), usersController.getUserById)
router.put('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), validateBody(updateUserSchema), usersController.updateUser)
router.delete('/:id', authorize('SUPER_ADMIN'), validateParams(idParamSchema), usersController.deactivateUser)

export { router as usersRouter }
