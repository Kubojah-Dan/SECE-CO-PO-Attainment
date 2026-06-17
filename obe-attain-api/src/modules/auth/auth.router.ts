import { Router } from 'express'
import * as authController from './auth.controller'
import { authenticate } from '@/middleware/auth.middleware'
import { validateBody } from '@/middleware/validate.middleware'
import {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'

const router = Router()

router.post('/login', validateBody(loginSchema), authController.login)
router.post('/logout', authenticate, authController.logout)
router.post('/refresh', validateBody(refreshSchema), authController.refresh)
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword)
router.get('/me', authenticate, authController.getMe)

export { router as authRouter }
