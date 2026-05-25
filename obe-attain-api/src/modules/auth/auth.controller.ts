import type { Request, Response } from 'express'
import * as authService from './auth.service'
import { sendSuccess, sendNoContent } from '@/utils/ApiResponse'
import { createAuditLog, getClientIp } from '@/middleware/auditLog.middleware'

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body)
  void createAuditLog({
    userId: result.user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: result.user.id,
    ipAddress: getClientIp(req),
  })
  return sendSuccess(res, result)
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string }
  await authService.logout(refreshToken ?? '')
  if (req.user) {
    void createAuditLog({
      userId: req.user.userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: req.user.userId,
      ipAddress: getClientIp(req),
    })
  }
  return sendNoContent(res)
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refresh(req.body.refreshToken as string)
  return sendSuccess(res, result)
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email as string)
  return sendSuccess(res, result)
}

export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body)
  return sendSuccess(res, result)
}

export async function getMe(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.userId)
  return sendSuccess(res, user)
}
