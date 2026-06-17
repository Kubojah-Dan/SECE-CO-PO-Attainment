import { Role, type Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import {
  hashPassword,
  comparePassword,
  generateTempPassword,
} from '@/utils/password.utils'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import type {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ListUsersQuery,
} from './users.schema'

// Safe select — passwordHash NEVER returned
const safeUserSelect = {
  id: true,
  employeeId: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, code: true } },
} satisfies Prisma.UserSelect

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {}
  if (query.role) where.role = query.role as Role
  if (query.departmentId) where.departmentId = query.departmentId
  if (typeof query.isActive === 'boolean') where.isActive = query.isActive
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { employeeId: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const skip = (query.page - 1) * query.limit
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: safeUserSelect, skip, take: query.limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ])

  return { users, total }
}

export async function createUser(dto: CreateUserDto, requesterId: string) {
  // Uniqueness checks
  const existingEmail = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existingEmail) throw ApiError.conflict('A user with this email already exists')

  const existingEmpId = await prisma.user.findUnique({ where: { employeeId: dto.employeeId } })
  if (existingEmpId) throw ApiError.conflict('A user with this employee ID already exists')

  // HOD uniqueness per department
  if (dto.role === 'HOD' && dto.departmentId) {
    const existingHod = await prisma.user.findFirst({
      where: { role: Role.HOD, departmentId: dto.departmentId, isActive: true },
    })
    if (existingHod) throw ApiError.conflict('This department already has an active HOD')
  }

  const plainPassword = dto.password ?? generateTempPassword()
  const passwordHash = await hashPassword(plainPassword)

  const user = await prisma.user.create({
    data: {
      employeeId: dto.employeeId,
      email: dto.email,
      name: dto.name,
      role: dto.role as Role,
      departmentId: dto.departmentId,
      passwordHash,
    },
    select: safeUserSelect,
  })

  // Assign HOD to department
  if (dto.role === 'HOD' && dto.departmentId) {
    await prisma.department.update({
      where: { id: dto.departmentId },
      data: { hodId: user.id },
    })
  }

  void createAuditLog({ userId: requesterId, action: 'CREATE', entity: 'User', entityId: user.id })

  return {
    user,
    tempPassword: dto.password ? undefined : plainPassword,
  }
}

export async function getUserById(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id }, select: safeUserSelect })
}

export async function updateUser(id: string, dto: UpdateUserDto, requesterId: string) {
  // Prevent deactivating self / changing own role — check on requesterId !== id for isActive
  if (requesterId === id && dto.isActive === false) {
    throw ApiError.forbidden('You cannot deactivate your own account')
  }

  // If deactivating, kill all sessions
  if (dto.isActive === false) {
    await prisma.refreshToken.deleteMany({ where: { userId: id } })
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    select: safeUserSelect,
  })

  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'User', entityId: id })
  return user
}

export async function deactivateUser(id: string, requesterId: string) {
  if (id === requesterId) throw ApiError.forbidden('Cannot deactivate your own account')
  await prisma.refreshToken.deleteMany({ where: { userId: id } })
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: safeUserSelect,
  })
  void createAuditLog({ userId: requesterId, action: 'DELETE', entity: 'User', entityId: id })
  return user
}

export async function changeOwnPassword(userId: string, dto: ChangePasswordDto) {
  // Only time we select passwordHash — direct prisma call, never returned
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })

  const match = await comparePassword(dto.currentPassword, user.passwordHash)
  if (!match) throw ApiError.badRequest('Current password is incorrect')

  const passwordHash = await hashPassword(dto.newPassword)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])

  void createAuditLog({ userId, action: 'UPDATE', entity: 'User', entityId: userId, detail: 'Password changed' })
}
