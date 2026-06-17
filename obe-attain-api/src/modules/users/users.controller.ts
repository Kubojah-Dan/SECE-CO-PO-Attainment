import type { Request, Response } from 'express'
import * as usersService from './users.service'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@/utils/ApiResponse'

export async function listUsers(req: Request, res: Response) {
  const { users, total } = await usersService.listUsers(req.query as never)
  return sendPaginated(res, users, total, Number(req.query['page']) || 1, Number(req.query['limit']) || 20)
}

export async function createUser(req: Request, res: Response) {
  const result = await usersService.createUser(req.body, req.user!.userId)
  return sendCreated(res, result)
}

export async function getUserById(req: Request, res: Response) {
  const user = await usersService.getUserById(req.params['id'] as string)
  return sendSuccess(res, user)
}

export async function updateUser(req: Request, res: Response) {
  const user = await usersService.updateUser(req.params['id'] as string, req.body, req.user!.userId)
  return sendSuccess(res, user)
}

export async function deactivateUser(req: Request, res: Response) {
  await usersService.deactivateUser(req.params['id'] as string, req.user!.userId)
  return sendNoContent(res)
}

export async function changeOwnPassword(req: Request, res: Response) {
  await usersService.changeOwnPassword(req.user!.userId, req.body)
  return sendSuccess(res, { message: 'Password changed successfully' })
}
