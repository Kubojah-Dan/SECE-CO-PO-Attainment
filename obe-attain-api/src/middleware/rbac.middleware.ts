import type { RequestHandler } from 'express'
import type { Role } from '@prisma/client'
import { ApiError } from '@/utils/ApiError'

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized()
    }
    if (!roles.includes(req.user.role as Role)) {
      throw ApiError.forbidden(
        `Role ${req.user.role} is not authorized for this action`
      )
    }
    next()
  }
