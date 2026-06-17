import { Role, type Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import type { RequestingUser } from '@/utils/subjectAccess.utils'
import type {
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignFacultyDto,
  ListSubjectsQuery,
} from './subjects.schema'

// ─── Reusable include ────────────────────────────────────────────────────────

const subjectInclude = {
  department:   { select: { id: true, name: true, code: true } },
  regulation:   { select: { id: true, name: true } },
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  faculty: {
    include: {
      faculty: {
        select: { id: true, name: true, email: true, employeeId: true },
      },
    },
  },
  _count: {
    select: { courseOutcomes: true, studentMarks: true },
  },
} satisfies Prisma.SubjectInclude

// Flatten faculty array for cleaner response
function flattenFaculty(subject: Prisma.SubjectGetPayload<{ include: typeof subjectInclude }>) {
  return {
    ...subject,
    faculty: subject.faculty.map((sf) => sf.faculty),
  }
}

// ─── listSubjects ─────────────────────────────────────────────────────────────

export async function listSubjects(
  query: ListSubjectsQuery,
  requestingUser: RequestingUser
) {
  const where: Prisma.SubjectWhereInput = {}

  // Explicit filters
  if (query.departmentId)   where.departmentId   = query.departmentId
  if (query.regulationId)   where.regulationId   = query.regulationId
  if (query.academicYearId) where.academicYearId = query.academicYearId
  if (query.semester)       where.semester       = query.semester
  if (query.status)         where.status         = query.status

  if (query.facultyId) {
    where.faculty = { some: { facultyId: query.facultyId } }
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { code: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  // Role-based scoping
  if (requestingUser.role === 'FACULTY') {
    where.faculty = { some: { facultyId: requestingUser.userId } }
  } else if (requestingUser.role === 'HOD') {
    const hodUser = await prisma.user.findUnique({
      where: { id: requestingUser.userId },
      select: { departmentId: true },
    })
    if (hodUser?.departmentId) {
      where.departmentId = hodUser.departmentId
    }
  }
  // SUPER_ADMIN and IQAC see all — no additional scope

  const skip = (query.page - 1) * query.limit

  const [rawSubjects, total] = await prisma.$transaction([
    prisma.subject.findMany({
      where,
      include: subjectInclude,
      skip,
      take: query.limit,
      orderBy: [{ academicYear: { name: 'desc' } }, { code: 'asc' }],
    }),
    prisma.subject.count({ where }),
  ])

  return { subjects: rawSubjects.map(flattenFaculty), total }
}

// ─── getSubjectById ───────────────────────────────────────────────────────────

export async function getSubjectById(
  id: string,
  requestingUser: RequestingUser
) {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id },
    include: subjectInclude,
  })

  // FACULTY must be assigned
  if (requestingUser.role === 'FACULTY') {
    const assigned = subject.faculty.some(
      (sf) => sf.facultyId === requestingUser.userId
    )
    if (!assigned) throw ApiError.forbidden('You are not assigned to this subject')
  }

  // HOD must own the department
  if (requestingUser.role === 'HOD') {
    const hodUser = await prisma.user.findUnique({
      where: { id: requestingUser.userId },
      select: { departmentId: true },
    })
    if (!hodUser?.departmentId || hodUser.departmentId !== subject.departmentId) {
      throw ApiError.forbidden('This subject belongs to a different department')
    }
  }

  return flattenFaculty(subject)
}

// ─── createSubject ────────────────────────────────────────────────────────────

export async function createSubject(
  dto: CreateSubjectDto,
  requesterId: string
) {
  // Verify FK existence
  const [dept, reg, yr] = await Promise.all([
    prisma.department.findUnique({ where: { id: dto.departmentId } }),
    prisma.regulation.findUnique({ where: { id: dto.regulationId } }),
    prisma.academicYear.findUnique({ where: { id: dto.academicYearId } }),
  ])
  if (!dept) throw ApiError.badRequest('Department not found')
  if (!reg)  throw ApiError.badRequest('Regulation not found')
  if (!yr)   throw ApiError.badRequest('Academic year not found')

  // Unique check
  const existing = await prisma.subject.findFirst({
    where: {
      code:           dto.code,
      regulationId:   dto.regulationId,
      academicYearId: dto.academicYearId,
    },
  })
  if (existing) {
    throw ApiError.conflict(
      `Subject ${dto.code} already exists for this regulation and academic year`
    )
  }

  const subject = await prisma.subject.create({
    data: {
      code:           dto.code,
      name:           dto.name,
      semester:       dto.semester,
      type:           dto.type,
      departmentId:   dto.departmentId,
      regulationId:   dto.regulationId,
      academicYearId: dto.academicYearId,
    },
    include: subjectInclude,
  })

  void createAuditLog({
    userId: requesterId,
    action: 'CREATE',
    entity: 'Subject',
    entityId: subject.id,
  })

  return flattenFaculty(subject)
}

// ─── updateSubject ────────────────────────────────────────────────────────────

export async function updateSubject(
  id: string,
  dto: UpdateSubjectDto,
  requestingUser: RequestingUser
) {
  const existing = await prisma.subject.findUniqueOrThrow({ where: { id } })

  if (existing.status === 'APPROVED') {
    throw ApiError.conflict('Cannot edit an approved subject. Contact HOD.')
  }

  const subject = await prisma.subject.update({
    where: { id },
    data: {
      ...(dto.name     !== undefined && { name: dto.name }),
      ...(dto.semester !== undefined && { semester: dto.semester }),
      ...(dto.type     !== undefined && { type: dto.type }),
    },
    include: subjectInclude,
  })

  void createAuditLog({
    userId: requestingUser.userId,
    action: 'UPDATE',
    entity: 'Subject',
    entityId: id,
  })

  return flattenFaculty(subject)
}

// ─── deleteSubject ────────────────────────────────────────────────────────────

export async function deleteSubject(id: string, requesterId: string) {
  const markCount = await prisma.studentMark.count({ where: { subjectId: id } })
  if (markCount > 0) {
    throw ApiError.conflict('Cannot delete subject with mark entries')
  }

  await prisma.subject.delete({ where: { id } })

  void createAuditLog({
    userId: requesterId,
    action: 'DELETE',
    entity: 'Subject',
    entityId: id,
  })
}

// ─── getFacultyForSubject ─────────────────────────────────────────────────────

export async function getFacultyForSubject(subjectId: string) {
  const rows = await prisma.subjectFaculty.findMany({
    where: { subjectId },
    include: {
      faculty: {
        select: { id: true, name: true, email: true, employeeId: true },
      },
    },
    orderBy: { assignedAt: 'asc' },
  })
  return rows.map((r) => r.faculty)
}

// ─── assignFaculty ────────────────────────────────────────────────────────────

export async function assignFaculty(
  subjectId: string,
  dto: AssignFacultyDto,
  requesterId: string
) {
  // Get subject to know department
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    select: { departmentId: true },
  })

  // Validate all faculty exist, have FACULTY role, and belong to dept
  const users = await prisma.user.findMany({
    where: { id: { in: dto.facultyIds } },
    select: { id: true, role: true, departmentId: true, name: true },
  })

  const invalid: string[] = []
  for (const uid of dto.facultyIds) {
    const u = users.find((x) => x.id === uid)
    if (!u) {
      invalid.push(`User ${uid} not found`)
    } else if (u.role !== Role.FACULTY) {
      invalid.push(`User ${u.name} is not a Faculty`)
    } else if (u.departmentId !== subject.departmentId) {
      invalid.push(`User ${u.name} is not in this subject's department`)
    }
  }
  if (invalid.length > 0) {
    throw ApiError.badRequest('Faculty validation failed', invalid)
  }

  // Upsert all assignments
  await prisma.$transaction(
    dto.facultyIds.map((facultyId) =>
      prisma.subjectFaculty.upsert({
        where: { subjectId_facultyId: { subjectId, facultyId } },
        create: { subjectId, facultyId },
        update: {},
      })
    )
  )

  void createAuditLog({
    userId: requesterId,
    action: 'UPDATE',
    entity: 'Subject',
    entityId: subjectId,
    detail: `Assigned ${dto.facultyIds.length} faculty`,
  })

  return getFacultyForSubject(subjectId)
}

// ─── removeFaculty ────────────────────────────────────────────────────────────

export async function removeFaculty(
  subjectId: string,
  facultyId: string,
  requesterId: string
) {
  const count = await prisma.subjectFaculty.count({ where: { subjectId } })
  if (count <= 1) {
    throw ApiError.conflict('Subject must have at least one assigned faculty')
  }

  await prisma.subjectFaculty.delete({
    where: { subjectId_facultyId: { subjectId, facultyId } },
  })

  void createAuditLog({
    userId: requesterId,
    action: 'UPDATE',
    entity: 'Subject',
    entityId: subjectId,
    detail: `Removed faculty ${facultyId}`,
  })
}
