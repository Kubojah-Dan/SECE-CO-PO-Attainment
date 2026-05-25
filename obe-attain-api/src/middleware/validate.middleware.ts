import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'
import { ApiError } from '@/utils/ApiError'

function formatZodErrors(error: import('zod').ZodError) {
  return error.issues.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }))
}

export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      throw ApiError.badRequest('Validation failed', formatZodErrors(result.error))
    }
    req.body = result.data
    next()
  }

export const validateQuery =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      throw ApiError.badRequest('Query validation failed', formatZodErrors(result.error))
    }
    req.query = result.data as typeof req.query
    next()
  }

export const validateParams =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      throw ApiError.badRequest('Params validation failed', formatZodErrors(result.error))
    }
    req.params = result.data as typeof req.params
    next()
  }
