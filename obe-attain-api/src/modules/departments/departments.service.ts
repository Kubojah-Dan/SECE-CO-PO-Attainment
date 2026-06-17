import { Role } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import type { CreateDepartmentDto, UpdateDepartmentDto } from './departments.schema'

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    include: {
      hod: { select: { id: true, name: true, email: true } },
      _count: { select: { subjects: true, users: true, students: true } },
    },
    orderBy: { name: 'asc' },
  })
  return departments.map(({ _count, ...d }) => ({
    ...d,
    subjectCount: _count.subjects,
    userCount: _count.users,
    studentCount: _count.students,
  }))
}

export async function createDepartment(dto: CreateDepartmentDto, requesterId: string) {
  const existingCode = await prisma.department.findFirst({
    where: { code: { equals: dto.code, mode: 'insensitive' } },
  })
  if (existingCode) throw ApiError.conflict('A department with this code already exists')

  if (dto.hodId) {
    const hodUser = await prisma.user.findUnique({ where: { id: dto.hodId } })
    if (!hodUser || hodUser.role !== Role.HOD) {
      throw ApiError.badRequest('HOD user not found or not assigned HOD role')
    }
  }

  const department = await prisma.department.create({
    data: {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      hodId: dto.hodId,
    },
    include: {
      hod: { select: { id: true, name: true, email: true } },
    },
  })

  if (dto.hodId) {
    await prisma.user.update({
      where: { id: dto.hodId },
      data: { departmentId: department.id },
    })
  }

  void createAuditLog({ userId: requesterId, action: 'CREATE', entity: 'Department', entityId: department.id })
  return department
}

export async function getDepartmentById(id: string) {
  const dept = await prisma.department.findUniqueOrThrow({
    where: { id },
    include: {
      hod: { select: { id: true, name: true, email: true } },
      _count: { select: { subjects: true, users: true, students: true } },
    },
  })
  const { _count, ...rest } = dept
  return { ...rest, subjectCount: _count.subjects, userCount: _count.users, studentCount: _count.students }
}

export async function updateDepartment(id: string, dto: UpdateDepartmentDto, requesterId: string) {
  if (dto.code) {
    const existing = await prisma.department.findFirst({
      where: { code: { equals: dto.code, mode: 'insensitive' }, id: { not: id } },
    })
    if (existing) throw ApiError.conflict('A department with this code already exists')
  }

  if (dto.hodId) {
    const current = await prisma.department.findUnique({ where: { id } })
    const newHodUser = await prisma.user.findUnique({ where: { id: dto.hodId } })
    if (!newHodUser || newHodUser.role !== Role.HOD) {
      throw ApiError.badRequest('HOD user not found or not assigned HOD role')
    }
    // Clear old HOD's departmentId if different
    if (current?.hodId && current.hodId !== dto.hodId) {
      await prisma.user.update({
        where: { id: current.hodId },
        data: { departmentId: null },
      })
    }
    // Set new HOD's departmentId
    await prisma.user.update({
      where: { id: dto.hodId },
      data: { departmentId: id },
    })
  }

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.hodId !== undefined && { hodId: dto.hodId }),
    },
    include: { hod: { select: { id: true, name: true, email: true } } },
  })

  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'Department', entityId: id })
  return department
}

export async function deleteDepartment(id: string, requesterId: string) {
  const subjectCount = await prisma.subject.count({ where: { departmentId: id } })
  if (subjectCount > 0) {
    throw ApiError.conflict('Cannot delete department with existing subjects')
  }
  await prisma.department.delete({ where: { id } })
  void createAuditLog({ userId: requesterId, action: 'DELETE', entity: 'Department', entityId: id })
}
