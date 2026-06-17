import type { Request, Response } from 'express'
import * as regulationsService from './regulations.service'
import { sendSuccess, sendCreated, sendNoContent } from '@/utils/ApiResponse'

export async function listRegulations(_req: Request, res: Response) {
  const regulations = await regulationsService.listRegulations()
  return sendSuccess(res, regulations)
}

export async function createRegulation(req: Request, res: Response) {
  const regulation = await regulationsService.createRegulation(req.body.name as string, req.user!.userId)
  return sendCreated(res, regulation)
}

export async function updateRegulation(req: Request, res: Response) {
  const regulation = await regulationsService.updateRegulation(req.params['id'] as string, req.body.name as string, req.user!.userId)
  return sendSuccess(res, regulation)
}

export async function deleteRegulation(req: Request, res: Response) {
  await regulationsService.deleteRegulation(req.params['id'] as string, req.user!.userId)
  return sendNoContent(res)
}
