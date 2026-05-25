import type { Request, Response } from 'express'
import * as departmentsService from './departments.service'
import { sendSuccess, sendCreated, sendNoContent } from '@/utils/ApiResponse'

export async function listDepartments(_req: Request, res: Response) {
  const departments = await departmentsService.listDepartments()
  return sendSuccess(res, departments)
}

export async function createDepartment(req: Request, res: Response) {
  const department = await departmentsService.createDepartment(req.body, req.user!.userId)
  return sendCreated(res, department)
}

export async function getDepartmentById(req: Request, res: Response) {
  const department = await departmentsService.getDepartmentById(req.params['id'] as string)
  return sendSuccess(res, department)
}

export async function updateDepartment(req: Request, res: Response) {
  const department = await departmentsService.updateDepartment(req.params['id'] as string, req.body, req.user!.userId)
  return sendSuccess(res, department)
}

export async function deleteDepartment(req: Request, res: Response) {
  await departmentsService.deleteDepartment(req.params['id'] as string, req.user!.userId)
  return sendNoContent(res)
}
