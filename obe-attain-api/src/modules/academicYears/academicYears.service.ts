import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'

export async function listAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: { name: 'desc' } })
}

export async function createAcademicYear(name: string, requesterId: string) {
  const existing = await prisma.academicYear.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) throw ApiError.conflict('An academic year with this name already exists')

  const academicYear = await prisma.academicYear.create({ data: { name } })
  void createAuditLog({ userId: requesterId, action: 'CREATE', entity: 'AcademicYear', entityId: academicYear.id })
  return academicYear
}

export async function setCurrent(id: string, requesterId: string) {
  await prisma.$transaction([
    prisma.academicYear.updateMany({ data: { isCurrent: false } }),
    prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
  ])
  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'AcademicYear', entityId: id, detail: 'Set as current academic year' })
  return prisma.academicYear.findUniqueOrThrow({ where: { id } })
}
