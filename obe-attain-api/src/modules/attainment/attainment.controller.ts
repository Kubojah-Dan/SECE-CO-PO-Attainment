import type { Request, Response } from 'express'
import * as attainmentService from './attainment.service'
import { sendSuccess } from '@/utils/ApiResponse'

export async function calculate(req: Request, res: Response) {
  const summary = await attainmentService.calculateAndPersist(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, summary)
}

export async function getDirectAttainment(req: Request, res: Response) {
  const result = await attainmentService.getDirectAttainment(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function submitIndirect(req: Request, res: Response) {
  const result = await attainmentService.submitIndirectAttainment(
    req.params['subjectId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function getIndirectAttainment(req: Request, res: Response) {
  const result = await attainmentService.getIndirectAttainment(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function getFinalAttainment(req: Request, res: Response) {
  const result = await attainmentService.getFinalAttainment(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function getCOPOAttainment(req: Request, res: Response) {
  const result = await attainmentService.getCOPOAttainment(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function getSettings(req: Request, res: Response) {
  const config = await attainmentService.getAttainmentConfig()
  return sendSuccess(res, config)
}

export async function updateSettings(req: Request, res: Response) {
  const result = await attainmentService.updateAttainmentConfig(
    req.body,
    req.user!.userId
  )
  return sendSuccess(res, result)
}
