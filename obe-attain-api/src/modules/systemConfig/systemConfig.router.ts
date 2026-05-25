import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authorize } from '@/middleware/rbac.middleware'
import { validateBody, validateParams } from '@/middleware/validate.middleware'
import { updateThresholdsSchema, restoreSchema } from './systemConfig.schema'
import * as sysService from './systemConfig.service'
import { sendSuccess } from '@/utils/ApiResponse'
import { ApiError } from '@/utils/ApiError'

export const systemConfigRouter = Router()

const SA = authorize('SUPER_ADMIN')

systemConfigRouter.get(
  '/thresholds',
  SA,
  async (_req: Request, res: Response) => {
    const cfg = await sysService.getThresholds()
    return sendSuccess(res, cfg)
  }
)

systemConfigRouter.put(
  '/thresholds',
  SA,
  validateBody(updateThresholdsSchema),
  async (req: Request, res: Response) => {
    const result = await sysService.updateThresholds(req.body, req.user!.userId)
    return sendSuccess(res, result)
  }
)

systemConfigRouter.post(
  '/backup',
  SA,
  async (req: Request, res: Response) => {
    const result = await sysService.createBackup(req.user!.userId)
    return sendSuccess(res, result)
  }
)

systemConfigRouter.get(
  '/backup/list',
  SA,
  async (_req: Request, res: Response) => {
    const list = await sysService.listBackups()
    return sendSuccess(res, list)
  }
)

systemConfigRouter.post(
  '/backup/:filename/restore',
  SA,
  validateParams(z.object({ filename: z.string() })),
  validateBody(restoreSchema),
  async (req: Request, res: Response) => {
    // confirmed:true is enforced by restoreSchema — if we reach here it's confirmed
    if (!req.body?.confirmed) {
      throw ApiError.badRequest('Send { confirmed: true } to proceed with restore')
    }
    const result = await sysService.restoreBackup(
      req.params['filename'] as string,
      req.user!.userId
    )
    return sendSuccess(res, result)
  }
)
