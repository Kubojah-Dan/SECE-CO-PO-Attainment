import type { ErrorRequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import multer from 'multer'
import { ApiError } from '@/utils/ApiError'
import logger from '@/utils/logger'
import { env } from '@/config/env'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. ApiError — our own typed errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    })
  }

  // 2. ZodError
  if (err instanceof ZodError) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = err.issues.map((e: any) => ({
      field: (e.path as (string | number)[]).join('.'),
      message: String(e.message),
    }))
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  // 3. Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${env.MAX_FILE_SIZE_MB}MB`,
      })
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    })
  }

  // 4. Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
      })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      })
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Related record not found',
      })
    }
  }

  // 4. Unknown errors — log and return 500
  logger.error('Unhandled error', {
    message: (err as Error).message,
    stack: env.NODE_ENV !== 'production' ? (err as Error).stack : undefined,
  })

  return res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err as Error).message ?? 'Internal server error',
  })
}
