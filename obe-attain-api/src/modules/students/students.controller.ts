import type { Request, Response } from 'express'
import * as studentsService from './students.service'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@/utils/ApiResponse'
import { ApiError } from '@/utils/ApiError'

export async function listStudents(req: Request, res: Response) {
  const { students, total } = await studentsService.listStudents(req.query as never)
  return sendPaginated(
    res,
    students,
    total,
    Number(req.query['page']) || 1,
    Number(req.query['limit']) || 50
  )
}

export async function createStudent(req: Request, res: Response) {
  const student = await studentsService.createStudent(req.body, req.user!.userId)
  return sendCreated(res, student)
}

export async function getStudentById(req: Request, res: Response) {
  const student = await studentsService.getStudentById(req.params['id'] as string)
  return sendSuccess(res, student)
}

export async function updateStudent(req: Request, res: Response) {
  const student = await studentsService.updateStudent(
    req.params['id'] as string,
    req.body,
    req.user!.userId
  )
  return sendSuccess(res, student)
}

export async function deleteStudent(req: Request, res: Response) {
  await studentsService.deleteStudent(req.params['id'] as string, req.user!.userId)
  return sendNoContent(res)
}

export async function bulkImport(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded. Send an Excel file in the "file" field.')
  }
  const departmentId = req.body.departmentId as string | undefined
  if (!departmentId) {
    throw ApiError.badRequest('departmentId is required in the request body')
  }

  const result = await studentsService.bulkImportStudents(
    req.file.path,
    departmentId,
    req.user!.userId
  )
  return sendSuccess(res, result)
}

export async function downloadTemplate(req: Request, res: Response) {
  const buffer = await studentsService.downloadTemplate()
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  res.setHeader('Content-Disposition', 'attachment; filename="students_template.xlsx"')
  return res.send(buffer)
}
