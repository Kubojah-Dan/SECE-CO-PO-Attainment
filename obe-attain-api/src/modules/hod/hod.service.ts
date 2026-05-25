import { type Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import type { RequestingUser } from '@/utils/subjectAccess.utils'
import type { RejectDto } from './hod.schema'

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getHODDeptId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { departmentId: true, role: true },
  })
  if (!user || user.role !== 'HOD') {
    throw ApiError.forbidden('This action requires the HOD role')
  }
  if (!user.departmentId) {
    throw ApiError.internal('HOD account has no department assigned')
  }
  return user.departmentId
}

const subjectInclude = {
  faculty: {
    include: {
      faculty: { select: { id: true, name: true, email: true } },
    },
  },
  department:   { select: { id: true, name: true, code: true } },
  regulation:   { select: { id: true, name: true } },
  academicYear: { select: { id: true, name: true } },
  _count:       { select: { courseOutcomes: true, studentMarks: true } },
} satisfies Prisma.SubjectInclude

async function attachAttainmentSummary(subjects: Awaited<ReturnType<typeof prisma.subject.findMany<{ include: typeof subjectInclude }>>>) {
  return Promise.all(
    subjects.map(async (s) => {
      const finals = await prisma.finalAttainment.findMany({
        where:  { subjectId: s.id },
        select: { finalValue: true },
      })
      const avgFinal =
        finals.length > 0
          ? finals.reduce((a, f) => a + (f.finalValue ?? 0), 0) / finals.length
          : null


      return {
        ...s,
        faculty: s.faculty.map((sf) => sf.faculty),
        attainmentSummary: {
          calculated:  finals.length > 0,
          avgFinal:    avgFinal !== null ? Math.round(avgFinal * 100) / 100 : null,
          coCount:     finals.length,
        },
      }
    })
  )
}

// ─── getPendingApprovals ──────────────────────────────────────────────────────

export async function getPendingApprovals(requestingUser: RequestingUser) {
  const deptId = requestingUser.role === 'SUPER_ADMIN'
    ? undefined
    : await getHODDeptId(requestingUser.userId)

  const subjects = await prisma.subject.findMany({
    where: {
      ...(deptId && { departmentId: deptId }),
      status: 'SUBMITTED',
    },
    include: subjectInclude,
    orderBy: { updatedAt: 'desc' },
  })

  return attachAttainmentSummary(subjects)
}

// ─── getAllApprovals ──────────────────────────────────────────────────────────

export async function getAllApprovals(
  requestingUser: RequestingUser,
  statusFilter?:  'SUBMITTED' | 'APPROVED' | 'REJECTED'
) {
  const deptId = requestingUser.role === 'SUPER_ADMIN'
    ? undefined
    : await getHODDeptId(requestingUser.userId)

  const subjects = await prisma.subject.findMany({
    where: {
      ...(deptId && { departmentId: deptId }),
      status: statusFilter ?? { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
    },
    include: subjectInclude,
    orderBy: { updatedAt: 'desc' },
  })

  return attachAttainmentSummary(subjects)
}

// ─── approveSubject ───────────────────────────────────────────────────────────

export async function approveSubject(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  const deptId = requestingUser.role === 'SUPER_ADMIN'
    ? null
    : await getHODDeptId(requestingUser.userId)

  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })

  if (deptId && subject.departmentId !== deptId) {
    throw ApiError.forbidden('This subject belongs to a different department')
  }
  if (subject.status !== 'SUBMITTED') {
    throw ApiError.conflict('Only submitted subjects can be approved')
  }

  // CRITICAL: Block approval if attainment not calculated
  const attainmentCount = await prisma.finalAttainment.count({ where: { subjectId } })
  if (attainmentCount === 0) {
    throw ApiError.conflict('Attainment must be calculated before approval')
  }

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data:  { status: 'APPROVED', rejectionRemark: null },
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'APPROVE',
    entity:   'Subject',
    entityId: subjectId,
  })

  return updated
}

// ─── rejectSubject ────────────────────────────────────────────────────────────

export async function rejectSubject(
  subjectId:      string,
  dto:            RejectDto,
  requestingUser: RequestingUser
) {
  const deptId = requestingUser.role === 'SUPER_ADMIN'
    ? null
    : await getHODDeptId(requestingUser.userId)

  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })

  if (deptId && subject.departmentId !== deptId) {
    throw ApiError.forbidden('This subject belongs to a different department')
  }
  if (subject.status !== 'SUBMITTED') {
    throw ApiError.conflict('Only submitted subjects can be rejected')
  }

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data:  { status: 'REJECTED', rejectionRemark: dto.remark },
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'REJECT',
    entity:   'Subject',
    entityId: subjectId,
    detail:   `Remark: ${dto.remark.substring(0, 100)}`,
  })

  return updated
}

// ─── getRemarks ───────────────────────────────────────────────────────────────

export async function getRemarks(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  const subject = await prisma.subject.findUniqueOrThrow({
    where:  { id: subjectId },
    select: { status: true, rejectionRemark: true, departmentId: true },
  })

  // Access: HOD of dept OR faculty assigned to subject
  let hasAccess = false
  if (requestingUser.role === 'SUPER_ADMIN' || requestingUser.role === 'IQAC') {
    hasAccess = true
  } else if (requestingUser.role === 'HOD') {
    const user = await prisma.user.findUnique({
      where:  { id: requestingUser.userId },
      select: { departmentId: true },
    })
    hasAccess = user?.departmentId === subject.departmentId
  } else if (requestingUser.role === 'FACULTY') {
    const sf = await prisma.subjectFaculty.findUnique({
      where: {
        subjectId_facultyId: {
          subjectId,
          facultyId: requestingUser.userId,
        },
      },
    })
    hasAccess = !!sf
  }

  if (!hasAccess) throw ApiError.forbidden('Access denied')

  const history = await prisma.auditLog.findMany({
    where: {
      entity:   'Subject',
      entityId: subjectId,
      action:   { in: ['APPROVE', 'REJECT'] },
    },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return {
    subjectId,
    status:          subject.status,
    rejectionRemark: subject.rejectionRemark,
    history,
  }
}

// ─── submitForApproval ────────────────────────────────────────────────────────

export async function submitForApproval(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  // Verify faculty assignment
  const sf = await prisma.subjectFaculty.findUnique({
    where: {
      subjectId_facultyId: {
        subjectId,
        facultyId: requestingUser.userId,
      },
    },
  })

  if (requestingUser.role !== 'SUPER_ADMIN' && !sf) {
    throw ApiError.forbidden('You are not assigned to this subject')
  }

  const subject = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })

  if (!['DRAFT', 'REJECTED'].includes(subject.status)) {
    throw ApiError.conflict(
      `Subject status is '${subject.status}'. Only DRAFT or REJECTED subjects can be submitted.`
    )
  }

  // Structured prerequisite checks
  const [coCount, mappingCount, markCount, attainmentCount] = await Promise.all([
    prisma.courseOutcome.count({ where: { subjectId } }),
    prisma.coPoMapping.count({ where: { subjectId, level: { gt: 0 } } }),
    prisma.studentMark.count({ where: { subjectId } }),
    prisma.finalAttainment.count({ where: { subjectId } }),
  ])

  const missing: string[] = []
  if (coCount === 0)      missing.push('cos')
  if (mappingCount === 0) missing.push('mapping')
  if (markCount === 0)    missing.push('marks')
  if (attainmentCount === 0) missing.push('attainment')

  if (missing.length > 0) {
    return { canSubmit: false, missing }
  }

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data:  { status: 'SUBMITTED', rejectionRemark: null },
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'Subject',
    entityId: subjectId,
    detail:   'Submitted for HOD approval',
  })

  return { canSubmit: true, success: true, subject: updated }
}
