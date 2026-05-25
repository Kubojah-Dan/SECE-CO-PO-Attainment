import type { Request, Response } from 'express'
import * as mappingService from './mapping.service'
import { sendSuccess } from '@/utils/ApiResponse'

export async function getMapping(req: Request, res: Response) {
  const mapping = await mappingService.getMapping(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, mapping)
}

export async function saveMapping(req: Request, res: Response) {
  const mapping = await mappingService.saveMapping(
    req.params['subjectId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, mapping)
}

export async function getMappingStats(req: Request, res: Response) {
  const stats = await mappingService.getMappingStats(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, stats)
}
