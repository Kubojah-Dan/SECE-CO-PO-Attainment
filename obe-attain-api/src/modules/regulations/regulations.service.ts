import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'

export async function listRegulations() {
  return prisma.regulation.findMany({
    include: { _count: { select: { subjects: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createRegulation(name: string, requesterId: string) {
  const existing = await prisma.regulation.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) throw ApiError.conflict('A regulation with this name already exists')

  const regulation = await prisma.regulation.create({ data: { name } })
  void createAuditLog({ userId: requesterId, action: 'CREATE', entity: 'Regulation', entityId: regulation.id })
  return regulation
}

export async function updateRegulation(id: string, name: string, requesterId: string) {
  const existing = await prisma.regulation.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
  })
  if (existing) throw ApiError.conflict('A regulation with this name already exists')

  const regulation = await prisma.regulation.update({ where: { id }, data: { name } })
  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'Regulation', entityId: id })
  return regulation
}

export async function deleteRegulation(id: string, requesterId: string) {
  const count = await prisma.subject.count({ where: { regulationId: id } })
  if (count > 0) throw ApiError.conflict('Cannot delete regulation with linked subjects')

  await prisma.regulation.delete({ where: { id } })
  void createAuditLog({ userId: requesterId, action: 'DELETE', entity: 'Regulation', entityId: id })
}
