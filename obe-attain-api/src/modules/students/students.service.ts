import { type Prisma } from '@prisma/client'
import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import {
  parseStudentImport,
  generateStudentTemplate,
  cleanupUpload,
} from '@/utils/excel.utils'
import type {
  CreateStudentDto,
  UpdateStudentDto,
  ListStudentsQuery,
} from './students.schema'

const deptSelect = { select: { id: true, name: true, code: true } } as const

// ─── listStudents ─────────────────────────────────────────────────────────────

export async function listStudents(query: ListStudentsQuery) {
  const where: Prisma.StudentWhereInput = {}

  if (query.departmentId) where.departmentId = query.departmentId
  if (query.batch)        where.batch        = query.batch

  if (query.search) {
    where.OR = [
      { rollNumber: { contains: query.search, mode: 'insensitive' } },
      { name:       { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const skip = (query.page - 1) * query.limit

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      include: { department: deptSelect },
      skip,
      take: query.limit,
      orderBy: [{ batch: 'desc' }, { rollNumber: 'asc' }],
    }),
    prisma.student.count({ where }),
  ])

  return { students, total }
}

// ─── createStudent ────────────────────────────────────────────────────────────

export async function createStudent(dto: CreateStudentDto, requesterId: string) {
  const existing = await prisma.student.findFirst({
    where: {
      rollNumber:   dto.rollNumber,
      departmentId: dto.departmentId,
    },
  })
  if (existing) {
    throw ApiError.conflict(
      `Roll number ${dto.rollNumber} already exists in this department`
    )
  }

  const student = await prisma.student.create({
    data: {
      rollNumber:   dto.rollNumber,
      name:         dto.name,
      email:        dto.email,
      batch:        dto.batch,
      departmentId: dto.departmentId,
    },
    include: { department: deptSelect },
  })

  void createAuditLog({
    userId: requesterId,
    action: 'CREATE',
    entity: 'Student',
    entityId: student.id,
  })

  return student
}

// ─── getStudentById ───────────────────────────────────────────────────────────

export async function getStudentById(id: string) {
  return prisma.student.findUniqueOrThrow({
    where: { id },
    include: { department: deptSelect },
  })
}

// ─── updateStudent ────────────────────────────────────────────────────────────

export async function updateStudent(
  id: string,
  dto: UpdateStudentDto,
  requesterId: string
) {
  const existing = await prisma.student.findUniqueOrThrow({ where: { id } })

  // If roll number is changing, check uniqueness within same department
  if (dto.rollNumber && dto.rollNumber !== existing.rollNumber) {
    const conflict = await prisma.student.findFirst({
      where: {
        rollNumber:   dto.rollNumber,
        departmentId: existing.departmentId,
        id:           { not: id },
      },
    })
    if (conflict) {
      throw ApiError.conflict(
        `Roll number ${dto.rollNumber} already exists in this department`
      )
    }
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...(dto.rollNumber !== undefined && { rollNumber: dto.rollNumber }),
      ...(dto.name       !== undefined && { name:       dto.name }),
      ...(dto.email      !== undefined && { email:      dto.email }),
      ...(dto.batch      !== undefined && { batch:      dto.batch }),
    },
    include: { department: deptSelect },
  })

  void createAuditLog({
    userId: requesterId,
    action: 'UPDATE',
    entity: 'Student',
    entityId: id,
  })

  return student
}

// ─── deleteStudent ────────────────────────────────────────────────────────────

export async function deleteStudent(id: string, requesterId: string) {
  const markCount = await prisma.studentMark.count({ where: { studentId: id } })
  if (markCount > 0) {
    throw ApiError.conflict('Cannot delete student with mark entries')
  }

  await prisma.student.delete({ where: { id } })

  void createAuditLog({
    userId: requesterId,
    action: 'DELETE',
    entity: 'Student',
    entityId: id,
  })
}

// ─── bulkImportStudents ───────────────────────────────────────────────────────

export async function bulkImportStudents(
  filePath: string,
  departmentId: string,
  requesterId: string
) {
  let parsed
  try {
    parsed = await parseStudentImport(filePath)
  } catch (err) {
    cleanupUpload(filePath)
    throw ApiError.badRequest(
      'Failed to parse Excel file: ' + (err instanceof Error ? err.message : 'unknown error')
    )
  }

  const { valid, errors } = parsed

  if (valid.length === 0 && errors.length > 0) {
    cleanupUpload(filePath)
    throw ApiError.badRequest('No valid rows found in import file', errors)
  }

  if (valid.length === 0) {
    cleanupUpload(filePath)
    throw ApiError.badRequest('The uploaded file contains no data rows')
  }

  try {
    await prisma.$transaction(
      valid.map((row) =>
        prisma.student.upsert({
          where: {
            rollNumber_departmentId: {
              rollNumber:   row.rollNumber,
              departmentId,
            },
          },
          create: {
            rollNumber:   row.rollNumber,
            name:         row.name,
            email:        row.email,
            batch:        row.batch,
            departmentId,
          },
          update: {
            name:  row.name,
            email: row.email,
            batch: row.batch,
          },
        })
      )
    )
  } finally {
    cleanupUpload(filePath)
  }

  void createAuditLog({
    userId: requesterId,
    action: 'IMPORT',
    entity: 'Student',
    detail: `Imported ${valid.length} students to dept ${departmentId}`,
  })

  return {
    imported: valid.length,
    skipped:  errors.length,
    errors,
  }
}

// ─── downloadTemplate ─────────────────────────────────────────────────────────

export async function downloadTemplate(): Promise<Buffer> {
  return generateStudentTemplate()
}
