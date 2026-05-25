import type { Request, Response } from 'express'
import * as academicYearsService from './academicYears.service'
import { sendSuccess, sendCreated } from '@/utils/ApiResponse'

export async function listAcademicYears(_req: Request, res: Response) {
  const years = await academicYearsService.listAcademicYears()
  return sendSuccess(res, years)
}

export async function createAcademicYear(req: Request, res: Response) {
  const year = await academicYearsService.createAcademicYear(req.body.name as string, req.user!.userId)
  return sendCreated(res, year)
}

export async function setCurrent(req: Request, res: Response) {
  const year = await academicYearsService.setCurrent(req.params['id'] as string, req.user!.userId)
  return sendSuccess(res, year)
}
