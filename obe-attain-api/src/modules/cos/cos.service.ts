import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import {
  verifySubjectAccess,
  type RequestingUser,
} from '@/utils/subjectAccess.utils'
import type { CreateCODto, UpdateCODto, SetTargetDto } from './cos.schema'

const coInclude = {
  createdBy: { select: { id: true, name: true } },
  _count:    { select: { coPoMappings: true } },
} as const

// ─── getCOsForSubject ─────────────────────────────────────────────────────────

export async function getCOsForSubject(
  subjectId: string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  return prisma.courseOutcome.findMany({
    where:   { subjectId },
    include: coInclude,
    orderBy: { number: 'asc' },
  })
}

// ─── createCO ─────────────────────────────────────────────────────────────────

export async function createCO(
  subjectId: string,
  dto: CreateCODto,
  requestingUser: RequestingUser
) {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  if (subject.status === 'APPROVED') {
    throw ApiError.conflict('Cannot add CO to an approved subject')
  }

  const count = await prisma.courseOutcome.count({ where: { subjectId } })
  if (count >= 6) {
    throw ApiError.conflict('Maximum of 6 COs allowed per subject')
  }

  const existing = await prisma.courseOutcome.findFirst({
    where: { subjectId, number: dto.number },
  })
  if (existing) {
    throw ApiError.conflict(`CO${dto.number} already exists for this subject`)
  }

  const co = await prisma.courseOutcome.create({
    data: {
      subjectId,
      number:        dto.number,
      description:   dto.description,
      bloomsLevel:   dto.bloomsLevel,
      targetPercent: dto.targetPercent,
      createdById:   requestingUser.userId,
    },
    include: coInclude,
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'CREATE',
    entity:   'CourseOutcome',
    entityId: co.id,
  })

  return co
}

// ─── updateCO ─────────────────────────────────────────────────────────────────

export async function updateCO(
  subjectId: string,
  coId: string,
  dto: UpdateCODto,
  requestingUser: RequestingUser
) {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  if (subject.status === 'APPROVED') {
    throw ApiError.conflict('Cannot edit CO for an approved subject')
  }

  // Verify CO belongs to this subject
  const co = await prisma.courseOutcome.findUniqueOrThrow({ where: { id: coId } })
  if (co.subjectId !== subjectId) {
    throw ApiError.notFound('CO not found for this subject')
  }

  // If number is changing, check uniqueness
  if (dto.number !== undefined && dto.number !== co.number) {
    const conflict = await prisma.courseOutcome.findFirst({
      where: { subjectId, number: dto.number, id: { not: coId } },
    })
    if (conflict) {
      throw ApiError.conflict(`CO${dto.number} already exists for this subject`)
    }
  }

  const updated = await prisma.courseOutcome.update({
    where: { id: coId },
    data: {
      ...(dto.number        !== undefined && { number:        dto.number }),
      ...(dto.description   !== undefined && { description:   dto.description }),
      ...(dto.bloomsLevel   !== undefined && { bloomsLevel:   dto.bloomsLevel }),
      ...(dto.targetPercent !== undefined && { targetPercent: dto.targetPercent }),
    },
    include: coInclude,
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'CourseOutcome',
    entityId: coId,
  })

  return updated
}

// ─── deleteCO ─────────────────────────────────────────────────────────────────

export async function deleteCO(
  subjectId: string,
  coId: string,
  requestingUser: RequestingUser
) {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  if (subject.status === 'APPROVED') {
    throw ApiError.conflict('Cannot delete CO for an approved subject')
  }

  const co = await prisma.courseOutcome.findUniqueOrThrow({ where: { id: coId } })
  if (co.subjectId !== subjectId) {
    throw ApiError.notFound('CO not found for this subject')
  }

  // ── Guard: delete stale attainment records before removing CO ────────────
  const attainmentExists = await prisma.finalAttainment.count({ where: { subjectId } })

  await prisma.$transaction([
    // Delete attainment data (now stale — CO is being removed)
    prisma.finalAttainment.deleteMany({ where: { subjectId } }),
    prisma.directAttainment.deleteMany({ where: { subjectId } }),
    // Delete CO-PO mappings for this CO
    prisma.coPoMapping.deleteMany({ where: { coId } }),
    // Delete the CO itself
    prisma.courseOutcome.delete({ where: { id: coId } }),
  ])

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'DELETE',
    entity:   'CourseOutcome',
    entityId: coId,
    detail:   attainmentExists > 0 ? 'Attainment records cleared (CO deleted)' : undefined,
  })

  if (attainmentExists > 0) {
    return { warning: 'COs changed. Attainment records cleared. Recalculate attainment.' }
  }
}


// ─── setTarget ────────────────────────────────────────────────────────────────

export async function setTarget(
  subjectId: string,
  coId: string,
  dto: SetTargetDto,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const co = await prisma.courseOutcome.findUniqueOrThrow({ where: { id: coId } })
  if (co.subjectId !== subjectId) {
    throw ApiError.notFound('CO not found for this subject')
  }

  const [updated] = await prisma.$transaction([
    prisma.courseOutcome.update({
      where: { id: coId },
      data:  { targetPercent: dto.targetPercent },
      include: coInclude,
    }),
    // Also update FinalAttainment if record exists
    prisma.finalAttainment.updateMany({
      where: { subjectId, coNumber: co.number },
      data:  { targetPercent: dto.targetPercent },
    }),
  ])

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'CourseOutcome',
    entityId: coId,
    detail:   `Set target to ${dto.targetPercent}%`,
  })

  return updated
}
