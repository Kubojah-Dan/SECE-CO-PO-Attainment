import type { Request, Response } from 'express'
import * as marksService from './marks.service'
import { sendSuccess } from '@/utils/ApiResponse'
import { ApiError } from '@/utils/ApiError'
import type { MarkComponent } from './marks.schema'

export async function getMarks(req: Request, res: Response) {
  const result = await marksService.getMarks(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function bulkSaveMarks(req: Request, res: Response) {
  const result = await marksService.bulkSaveMarks(
    req.params['subjectId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function updateSingleMark(req: Request, res: Response) {
  const result = await marksService.updateSingleMark(
    req.params['subjectId'] as string,
    req.params['studentId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function getMarksSummary(req: Request, res: Response) {
  const summary = await marksService.getMarksSummary(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, summary)
}

export async function importMarks(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded. Send an Excel file in the "file" field.')
  }
  const component = req.query['component'] as MarkComponent
  const result = await marksService.importMarksFromExcel(
    req.params['subjectId'] as string,
    req.file.path,
    component,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function downloadTemplate(req: Request, res: Response) {
  const component = req.query['component'] as MarkComponent
  const buffer = await marksService.downloadMarksTemplate(
    req.params['subjectId'] as string,
    component,
    req.user!
  )
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="marks_template_${component}.xlsx"`
  )
  return res.send(buffer)
}
