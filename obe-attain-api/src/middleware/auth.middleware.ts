import type { RequestHandler } from 'express'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { verifyAccessToken } from '@/utils/jwt.utils'

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    throw ApiError.unauthorized('No token provided')
  }

  const payload = verifyAccessToken(token)

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isActive: true },
  })

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account inactive or not found')
  }

  req.user = {
    userId: user.id,
    role: user.role,
    email: user.email,
  }

  next()
}
