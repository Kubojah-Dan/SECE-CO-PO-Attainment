import type { Request, Response } from 'express'
import * as cosService from './cos.service'
import { sendSuccess, sendCreated, sendNoContent } from '@/utils/ApiResponse'

export async function getCOsForSubject(req: Request, res: Response) {
  const cos = await cosService.getCOsForSubject(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, cos)
}

export async function createCO(req: Request, res: Response) {
  const co = await cosService.createCO(
    req.params['subjectId'] as string,
    req.body,
    req.user!
  )
  return sendCreated(res, co)
}

export async function updateCO(req: Request, res: Response) {
  const co = await cosService.updateCO(
    req.params['subjectId'] as string,
    req.params['coId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, co)
}

export async function deleteCO(req: Request, res: Response) {
  await cosService.deleteCO(
    req.params['subjectId'] as string,
    req.params['coId'] as string,
    req.user!
  )
  return sendNoContent(res)
}

export async function setTarget(req: Request, res: Response) {
  const co = await cosService.setTarget(
    req.params['subjectId'] as string,
    req.params['coId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, co)
}
