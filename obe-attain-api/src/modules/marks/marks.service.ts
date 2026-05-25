import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import {
  verifySubjectAccess,
  type RequestingUser,
} from '@/utils/subjectAccess.utils'
import {
  parseMarksImport,
  generateMarksTemplate,
  cleanupUpload,
} from '@/utils/excel.utils'
import {
  MAX_MARKS,
  type MarkComponent,
  type BulkSaveMarksDto,
  type SingleMarkEntryDto,
} from './marks.schema'

// ─── verifyFacultyOwnsSubject ─────────────────────────────────────────────────

async function verifyFacultyOwnsSubject(
  subjectId: string,
  requestingUser: RequestingUser
): Promise<void> {
  if (
    requestingUser.role === 'SUPER_ADMIN' ||
    requestingUser.role === 'HOD'
  ) {
    // SA and HOD bypass faculty check — still verify subject access
    await verifySubjectAccess(subjectId, requestingUser)
    return
  }

  if (requestingUser.role === 'FACULTY') {
    const assignment = await prisma.subjectFaculty.findUnique({
      where: {
        subjectId_facultyId: {
          subjectId,
          facultyId: requestingUser.userId,
        },
      },
    })
    if (!assignment) {
      throw ApiError.forbidden('You are not assigned to this subject')
    }
    return
  }

  throw ApiError.forbidden('Insufficient permissions to enter marks')
}

// ─── getMarks ─────────────────────────────────────────────────────────────────

export async function getMarks(
  subjectId: string,
  requestingUser: RequestingUser
) {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  // Get all students in the department and all mark entries together
  const [allStudents, existingMarks] = await Promise.all([
    prisma.student.findMany({
      where:   { departmentId: subject.departmentId },
      orderBy: { rollNumber: 'asc' },
      select:  { id: true, rollNumber: true, name: true, batch: true },
    }),
    prisma.studentMark.findMany({
      where:  { subjectId },
      select: {
        studentId:  true,
        ia1:        true,
        ia2:        true,
        ia3:        true,
        modelExam:  true,
        ese:        true,
        assignment: true,
        lab:        true,
      },
    }),
  ])

  // Build mark lookup by studentId
  type MarkEntry = (typeof existingMarks)[number]
  const markByStudent = new Map<string, MarkEntry>(
    existingMarks.map((m) => [m.studentId, m])
  )

  const marks = allStudents.map((s) => {
    const m = markByStudent.get(s.id)
    return {
      studentId:  s.id,
      rollNumber: s.rollNumber,
      name:       s.name,
      batch:      s.batch,
      ia1:        m?.ia1        ?? null,
      ia2:        m?.ia2        ?? null,
      ia3:        m?.ia3        ?? null,
      modelExam:  m?.modelExam  ?? null,
      ese:        m?.ese        ?? null,
      assignment: m?.assignment ?? null,
      lab:        m?.lab        ?? null,
      hasEntry:   !!m,
    }
  })

  // Summary
  const COMPONENTS: MarkComponent[] = ['ia1', 'ia2', 'ia3', 'modelExam', 'ese', 'assignment', 'lab']
  const componentStatus = Object.fromEntries(
    COMPONENTS.map((c) => [
      c,
      marks.some((m) => m[c] !== null),
    ])
  ) as Record<MarkComponent, boolean>

  return {
    marks,
    summary: {
      totalStudents:     allStudents.length,
      studentsWithMarks: existingMarks.length,
      componentStatus,
    },
  }
}

// ─── bulkSaveMarks ────────────────────────────────────────────────────────────

export async function bulkSaveMarks(
  subjectId: string,
  dto: BulkSaveMarksDto,
  requestingUser: RequestingUser
) {
  await verifyFacultyOwnsSubject(subjectId, requestingUser)

  // Check subject not APPROVED
  const subject = await prisma.subject.findUniqueOrThrow({
    where:  { id: subjectId },
    select: { status: true, departmentId: true },
  })
  if (subject.status === 'APPROVED') {
    throw ApiError.conflict('Cannot edit marks for an approved subject')
  }

  // Verify all studentIds belong to subject's department
  const deptStudents = await prisma.student.findMany({
    where:  { departmentId: subject.departmentId },
    select: { id: true },
  })
  const validStudentIds = new Set(deptStudents.map((s) => s.id))

  const invalidIds = dto.marks
    .map((m) => m.studentId)
    .filter((id) => !validStudentIds.has(id))

  if (invalidIds.length > 0) {
    throw ApiError.badRequest(
      'One or more students do not belong to this subject\'s department',
      invalidIds
    )
  }

  const enteredById = requestingUser.userId

  // Upsert each mark entry — only update provided fields
  await prisma.$transaction(
    dto.marks.map((entry) => {
      // Build update data — only explicitly provided (non-undefined) fields
      const updateData: Record<string, number | null> = {}
      if (entry.ia1        !== undefined) updateData['ia1']        = entry.ia1
      if (entry.ia2        !== undefined) updateData['ia2']        = entry.ia2
      if (entry.ia3        !== undefined) updateData['ia3']        = entry.ia3
      if (entry.modelExam  !== undefined) updateData['modelExam']  = entry.modelExam
      if (entry.ese        !== undefined) updateData['ese']        = entry.ese
      if (entry.assignment !== undefined) updateData['assignment'] = entry.assignment
      if (entry.lab        !== undefined) updateData['lab']        = entry.lab

      return prisma.studentMark.upsert({
        where: {
          studentId_subjectId: {
            studentId: entry.studentId,
            subjectId,
          },
        },
        create: {
          studentId:    entry.studentId,
          subjectId,
          enteredById,
          ia1:          entry.ia1        ?? null,
          ia2:          entry.ia2        ?? null,
          ia3:          entry.ia3        ?? null,
          modelExam:    entry.modelExam  ?? null,
          ese:          entry.ese        ?? null,
          assignment:   entry.assignment ?? null,
          lab:          entry.lab        ?? null,
          updatedAt:    new Date(),
        },
        update: updateData,
      })
    })
  )

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'StudentMark',
    entityId: subjectId,
    detail:   `Bulk saved marks for ${dto.marks.length} students`,
  })

  // ── Guard: invalidate stale attainment ────────────────────────────────────
  const attainmentCount = await prisma.finalAttainment.count({ where: { subjectId } })
  let warning: string | undefined

  if (attainmentCount > 0) {
    // Revert SUBMITTED back to DRAFT — APPROVED is already blocked above
    if (subject.status === 'SUBMITTED') {
      await prisma.subject.update({
        where: { id: subjectId },
        data:  { status: 'DRAFT' },
      })
    }
    warning = 'Marks updated. Recalculate attainment to reflect these changes.'
  }

  return { saved: dto.marks.length, ...(warning && { warning }) }
}

// ─── updateSingleMark ─────────────────────────────────────────────────────────

export async function updateSingleMark(
  subjectId: string,
  studentId: string,
  dto: SingleMarkEntryDto,
  requestingUser: RequestingUser
) {
  await verifyFacultyOwnsSubject(subjectId, requestingUser)

  if (dto.value > MAX_MARKS[dto.component]) {
    throw ApiError.badRequest(
      `${dto.component} mark cannot exceed ${MAX_MARKS[dto.component]}`
    )
  }

  const result = await prisma.studentMark.upsert({
    where: {
      studentId_subjectId: { studentId, subjectId },
    },
    create: {
      studentId,
      subjectId,
      enteredById: requestingUser.userId,
      [dto.component]: dto.value,
      updatedAt:   new Date(),
    },
    update: {
      [dto.component]: dto.value,
    },
    include: { student: { select: { rollNumber: true, name: true } } },
  })

  return result
}

// ─── importMarksFromExcel ─────────────────────────────────────────────────────

export async function importMarksFromExcel(
  subjectId: string,
  filePath: string,
  component: MarkComponent,
  requestingUser: RequestingUser
) {
  await verifyFacultyOwnsSubject(subjectId, requestingUser)

  let parsed
  try {
    parsed = await parseMarksImport(filePath, component)
  } catch (err) {
    cleanupUpload(filePath)
    throw ApiError.badRequest(
      'Failed to parse Excel file: ' + (err instanceof Error ? err.message : 'unknown')
    )
  }

  const { valid, errors } = parsed

  if (valid.length === 0) {
    cleanupUpload(filePath)
    throw ApiError.badRequest('No valid data found in import file', errors)
  }

  try {
    // Resolve rollNumber → studentId
    const subject = await prisma.subject.findUniqueOrThrow({
      where:  { id: subjectId },
      select: { departmentId: true },
    })

    const students = await prisma.student.findMany({
      where:  { departmentId: subject.departmentId },
      select: { id: true, rollNumber: true },
    })
    const rollToId = new Map(students.map((s) => [s.rollNumber, s.id]))

    const importErrors = [...errors]
    const toUpsert: { studentId: string; mark: number }[] = []

    for (const row of valid) {
      const studentId = rollToId.get(row.rollNumber)
      if (!studentId) {
        importErrors.push({
          row: 0,
          issue: `Student with roll number ${row.rollNumber} not found in this department`,
        })
      } else {
        toUpsert.push({ studentId, mark: row.mark })
      }
    }

    if (toUpsert.length > 0) {
      await prisma.$transaction(
        toUpsert.map(({ studentId, mark }) =>
          prisma.studentMark.upsert({
            where: {
              studentId_subjectId: { studentId, subjectId },
            },
            create: {
              studentId,
              subjectId,
              enteredById:   requestingUser.userId,
              [component]:   mark,
              updatedAt:     new Date(),
            },
            update: {
              [component]: mark,
            },
          })
        )
      )
    }

    void createAuditLog({
      userId:   requestingUser.userId,
      action:   'IMPORT',
      entity:   'StudentMark',
      entityId: subjectId,
      detail:   `Imported ${toUpsert.length} ${component} marks`,
    })

    return {
      imported: toUpsert.length,
      skipped:  importErrors.length,
      errors:   importErrors,
    }
  } finally {
    cleanupUpload(filePath)
  }
}

// ─── downloadMarksTemplate ────────────────────────────────────────────────────

export async function downloadMarksTemplate(
  subjectId: string,
  component: MarkComponent,
  requestingUser: RequestingUser
): Promise<Buffer> {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  const students = await prisma.student.findMany({
    where:   { departmentId: subject.departmentId },
    orderBy: { rollNumber: 'asc' },
    select:  { rollNumber: true, name: true },
  })

  return generateMarksTemplate(students, component, MAX_MARKS[component])
}

// ─── getMarksSummary ──────────────────────────────────────────────────────────

export async function getMarksSummary(
  subjectId: string,
  requestingUser: RequestingUser
) {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  const [allStudents, marks] = await Promise.all([
    prisma.student.count({ where: { departmentId: subject.departmentId } }),
    prisma.studentMark.findMany({
      where:  { subjectId },
      select: {
        ia1: true, ia2: true, ia3: true,
        modelExam: true, ese: true,
        assignment: true, lab: true,
      },
    }),
  ])

  const COMPONENTS: MarkComponent[] = ['ia1', 'ia2', 'ia3', 'modelExam', 'ese', 'assignment', 'lab']

  const PASS_THRESHOLD = 0.4 // 40% of max mark

  const componentSummary = COMPONENTS.map((comp) => {
    const values = marks
      .map((m) => m[comp])
      .filter((v): v is number => v !== null)

    const max   = MAX_MARKS[comp]
    const pass  = Math.floor(max * PASS_THRESHOLD)
    const count = values.length
    const avg   = count > 0 ? values.reduce((a, b) => a + b, 0) / count : 0
    const maxV  = count > 0 ? Math.max(...values) : 0
    const minV  = count > 0 ? Math.min(...values) : 0
    const passing = values.filter((v) => v >= pass).length

    return {
      component:       comp,
      maxMark:         max,
      passThreshold:   pass,
      entriesCount:    count,
      avgMark:         Math.round(avg * 100) / 100,
      maxMarkAchieved: maxV,
      minMarkAchieved: minV,
      passPercentage:  count > 0 ? Math.round((passing / count) * 100) : 0,
    }
  })

  return {
    totalStudents:     allStudents,
    studentsWithMarks: marks.length,
    componentSummary,
  }
}
