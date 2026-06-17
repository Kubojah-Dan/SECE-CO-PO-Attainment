import type { Request, Response } from 'express'
import * as hodService from './hod.service'
import { sendSuccess, sendNoContent } from '@/utils/ApiResponse'

export async function getPendingApprovals(req: Request, res: Response) {
  const subjects = await hodService.getPendingApprovals(req.user!)
  return sendSuccess(res, subjects)
}

export async function getAllApprovals(req: Request, res: Response) {
  const status = req.query['status'] as 'SUBMITTED' | 'APPROVED' | 'REJECTED' | undefined
  const subjects = await hodService.getAllApprovals(req.user!, status)
  return sendSuccess(res, subjects)
}

export async function approveSubject(req: Request, res: Response) {
  const subject = await hodService.approveSubject(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, subject)
}

export async function rejectSubject(req: Request, res: Response) {
  const subject = await hodService.rejectSubject(
    req.params['subjectId'] as string,
    req.body,
    req.user!
  )
  return sendSuccess(res, subject)
}

export async function getRemarks(req: Request, res: Response) {
  const result = await hodService.getRemarks(
    req.params['subjectId'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}

export async function submitForApproval(req: Request, res: Response) {
  const result = await hodService.submitForApproval(
    req.params['id'] as string,
    req.user!
  )
  return sendSuccess(res, result)
}
