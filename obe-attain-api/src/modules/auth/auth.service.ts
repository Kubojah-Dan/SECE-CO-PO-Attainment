import { Role } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { redis } from '@/config/redis'
import { ApiError } from '@/utils/ApiError'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/utils/jwt.utils'
import { comparePassword, hashPassword, generateTempPassword } from '@/utils/password.utils'
import logger from '@/utils/logger'
import type { LoginDto, ResetPasswordDto } from './auth.schema'

// Safe user select — never returns passwordHash
const safeUserSelect = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  departmentId: true,
  createdAt: true,
  department: { select: { id: true, name: true, code: true } },
} as const

export async function login(dto: LoginDto) {
  // Always use same error message — never leak which check failed
  const INVALID = 'Invalid credentials'

  const user = await prisma.user.findUnique({ where: { email: dto.email } })

  if (!user || !user.isActive) throw ApiError.unauthorized(INVALID)
  if (user.role !== (dto.role as Role)) throw ApiError.unauthorized(INVALID)

  const passwordMatch = await comparePassword(dto.password, user.passwordHash)
  if (!passwordMatch) throw ApiError.unauthorized(INVALID)

  const payload = { userId: user.id, role: user.role, email: user.email }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Store refresh token + update last login
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.$transaction([
    prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ])

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    },
  }
}

export async function refresh(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken)

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored) throw ApiError.unauthorized('Invalid refresh token')

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    throw ApiError.unauthorized('Refresh token expired')
  }

  // Rotation — delete old token
  await prisma.refreshToken.delete({ where: { id: stored.id } })

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.isActive) throw ApiError.unauthorized('Account inactive')

  const newPayload = { userId: user.id, role: user.role, email: user.email }
  const newAccessToken = signAccessToken(newPayload)
  const newRefreshToken = signRefreshToken(newPayload)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: user.id, expiresAt },
  })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout(refreshToken: string): Promise<void> {
  // Silently succeed even if token not found
  await prisma.refreshToken
    .delete({ where: { token: refreshToken } })
    .catch(() => undefined)
}

export async function forgotPassword(email: string) {
  const message = 'If that email exists, a reset code has been sent'
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    await redis.set(`otp:${email}`, otp, 'EX', 900)
    // In dev: log OTP; in production, plug in email provider
    logger.info(`OTP for ${email}: ${otp}`)
  }

  return { message }
}

export async function resetPassword(dto: ResetPasswordDto) {
  const storedOtp = await redis.get(`otp:${dto.email}`)
  if (!storedOtp) throw ApiError.badRequest('OTP expired or invalid')
  if (storedOtp !== dto.otp) throw ApiError.badRequest('Invalid OTP')

  const user = await prisma.user.findUnique({ where: { email: dto.email } })
  if (!user) throw ApiError.badRequest('OTP expired or invalid')

  const passwordHash = await hashPassword(dto.newPassword)

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ])

  await redis.del(`otp:${dto.email}`)

  return { message: 'Password reset successful. Please log in.' }
}

export async function getMe(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: safeUserSelect,
  })
}
