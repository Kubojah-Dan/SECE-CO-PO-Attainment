import type { Response } from 'express'

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response =>
  res.status(statusCode).json({ success: true, data, message })

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): Response => sendSuccess(res, data, message, 201)

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response =>
  res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })

export const sendNoContent = (res: Response): Response =>
  res.status(204).send()
