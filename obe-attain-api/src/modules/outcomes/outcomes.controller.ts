import type { Request, Response } from 'express'
import * as outcomesService from './outcomes.service'
import { sendSuccess } from '@/utils/ApiResponse'

export async function listPOs(_req: Request, res: Response) {
  const pos = await outcomesService.listPOs()
  return sendSuccess(res, pos)
}

export async function bulkUpdatePOs(req: Request, res: Response) {
  const results = await outcomesService.bulkUpdatePOs(req.body.updates as never, req.user!.userId)
  return sendSuccess(res, results)
}

export async function listPSOs(_req: Request, res: Response) {
  const psos = await outcomesService.listPSOs()
  return sendSuccess(res, psos)
}

export async function bulkUpdatePSOs(req: Request, res: Response) {
  const results = await outcomesService.bulkUpdatePSOs(req.body.updates as never, req.user!.userId)
  return sendSuccess(res, results)
}
