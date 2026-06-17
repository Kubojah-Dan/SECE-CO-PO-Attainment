import type { Request, Response } from 'express'
import * as subjectsService from './subjects.service'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@/utils/ApiResponse'

export async function listSubjects(req: Request, res: Response) {
  const { subjects, total } = await subjectsService.listSubjects(
    req.query as never,
    req.user!
  )
  return sendPaginated(
    res,
    subjects,
    total,
    Number(req.query['page']) || 1,
    Number(req.query['limit']) || 20
  )
}

export async function createSubject(req: Request, res: Response) {
  const subject = await subjectsService.createSubject(req.body, req.user!.userId)
  return sendCreated(res, subject)
}

export async function getSubjectById(req: Request, res: Response) {
  const subject = await subjectsService.getSubjectById(
    req.params['id'] as string,
    req.user!
  )
  return sendSuccess(res, subject)
}

export async function updateSubject(req: Request, res: Response) {
  const subject = await subjectsService.updateSubject(
    req.params['id'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, subject)
}

export async function deleteSubject(req: Request, res: Response) {
  await subjectsService.deleteSubject(req.params['id'] as string, req.user!.userId)
  return sendNoContent(res)
}

export async function getFacultyForSubject(req: Request, res: Response) {
  const faculty = await subjectsService.getFacultyForSubject(
    req.params['id'] as string
  )
  return sendSuccess(res, faculty)
}

export async function assignFaculty(req: Request, res: Response) {
  const faculty = await subjectsService.assignFaculty(
    req.params['id'] as string,
    req.body,
    req.user!.userId
  )
  return sendSuccess(res, faculty)
}

export async function removeFaculty(req: Request, res: Response) {
  await subjectsService.removeFaculty(
    req.params['id'] as string,
    req.params['facultyId'] as string,
    req.user!.userId
  )
  return sendNoContent(res)
}
