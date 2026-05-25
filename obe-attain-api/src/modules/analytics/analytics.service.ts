import { prisma } from '@/config/prisma'
import { sanitise, round2 } from '@/engine/engine.types'
import { getAttainmentConfig } from '@/modules/attainment/attainment.service'
import { calculatePOAttainment, calculatePSOAttainment } from '@/engine/poAttainment.engine'
import type { RequestingUser } from '@/utils/subjectAccess.utils'
import { ApiError } from '@/utils/ApiError'

// ─── getAdminOverview ─────────────────────────────────────────────────────────

export async function getAdminOverview() {
  const [
    totalDepartments,
    totalSubjects,
    totalFaculty,
    totalStudents,
    submissionsComplete,
    submissionsPending,
    avgResult,
    departments,
  ] = await Promise.all([
    prisma.department.count(),
    prisma.subject.count(),
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.student.count(),
    prisma.subject.count({ where: { status: 'APPROVED' } }),
    prisma.subject.count({ where: { status: 'SUBMITTED' } }),
    prisma.finalAttainment.aggregate({ _avg: { finalValue: true } }),
    prisma.department.findMany({
      select: {
        id:   true,
        name: true,
        code: true,
        _count: { select: { subjects: true } },
      },
    }),
  ])

  const deptBreakdown = await Promise.all(
    departments.map(async (dept) => {
      const avg = await prisma.finalAttainment.aggregate({
        where:  { subject: { departmentId: dept.id } },
        _avg:   { finalValue: true },
      })
      return {
        departmentId:   dept.id,
        name:           dept.name,
        code:           dept.code,
        subjectCount:   dept._count.subjects,
        avgAttainment:  avg._avg.finalValue !== null
                          ? round2(sanitise(avg._avg.finalValue))
                          : null,
      }
    })
  )

  return {
    totalDepartments,
    totalSubjects,
    totalFaculty,
    totalStudents,
    submissionsComplete,
    submissionsPending,
    avgFinalAttainment: avgResult._avg.finalValue !== null
                          ? round2(sanitise(avgResult._avg.finalValue))
                          : null,
    departmentBreakdown: deptBreakdown,
  }
}

// ─── getHODDepartmentOverview ─────────────────────────────────────────────────

export async function getHODDepartmentOverview(requestingUser: RequestingUser) {
  const user = await prisma.user.findUnique({
    where:  { id: requestingUser.userId },
    select: { departmentId: true, role: true },
  })

  if (!user?.departmentId) throw ApiError.badRequest('HOD has no department assigned')

  const deptId = user.departmentId

  const [totalSubjects, completedSubjects, pendingApprovals, facultyList, subjectStatus] =
    await Promise.all([
      prisma.subject.count({ where: { departmentId: deptId } }),
      prisma.subject.count({ where: { departmentId: deptId, status: 'APPROVED' } }),
      prisma.subject.count({ where: { departmentId: deptId, status: 'SUBMITTED' } }),
      prisma.user.findMany({
        where:  { departmentId: deptId, role: 'FACULTY' },
        select: {
          id:    true,
          name:  true,
          email: true,
          subjectFaculty: {
            include: {
              subject: { select: { id: true, status: true } },
            },
          },
        },
      }),
      prisma.subject.findMany({
        where:   { departmentId: deptId },
        include: {
          faculty: {
            include: { faculty: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

  const facultyWithStats = facultyList.map((f) => ({
    id:               f.id,
    name:             f.name,
    email:            f.email,
    subjectsAssigned: f.subjectFaculty.length,
    submitted:        f.subjectFaculty.filter(
      (sf) => ['SUBMITTED', 'APPROVED'].includes(sf.subject.status)
    ).length,
  }))

  return {
    totalSubjects,
    completedSubjects,
    pendingApprovals,
    facultyList: facultyWithStats,
    subjectStatus: subjectStatus.map((s) => ({
      id:          s.id,
      code:        s.code,
      name:        s.name,
      status:      s.status,
      facultyName: s.faculty.map((sf) => sf.faculty.name).join(', '),
      updatedAt:   s.updatedAt,
    })),
  }
}

// ─── getFacultySubjectOverview ────────────────────────────────────────────────

export async function getFacultySubjectOverview(requestingUser: RequestingUser) {
  const assignments = await prisma.subjectFaculty.findMany({
    where:   { facultyId: requestingUser.userId },
    include: {
      subject: {
        include: {
          _count: { select: { courseOutcomes: true, studentMarks: true } },
        },
      },
    },
  })

  const result = await Promise.all(
    assignments.map(async ({ subject: s }) => {
      const attainmentCount = await prisma.finalAttainment.count({
        where: { subjectId: s.id },
      })

      return {
        subjectId:             s.id,
        code:                  s.code,
        name:                  s.name,
        semester:              s.semester,
        status:                s.status,
        rejectionRemark:       s.rejectionRemark,
        cosDefined:            s._count.courseOutcomes,
        marksUploaded:         s._count.studentMarks > 0,
        attainmentCalculated:  attainmentCount > 0,
      }
    })
  )

  return result
}

// ─── getIQACInstitutionOverview ───────────────────────────────────────────────

export async function getIQACInstitutionOverview() {
  const config = await getAttainmentConfig()

  const [departments, pos, psos] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true, code: true },
    }),
    prisma.programOutcome.findMany({ orderBy: { number: 'asc' } }),
    prisma.programSpecificOutcome.findMany({ orderBy: { number: 'asc' } }),
  ])

  const totalDepartments = departments.length

  // For each dept: compute PO attainment from APPROVED subjects
  const deptSummaries = await Promise.all(
    departments.map(async (dept) => {
      const subjects = await prisma.subject.findMany({
        where:  { departmentId: dept.id, status: 'APPROVED' },
        select: { id: true },
      })

      if (subjects.length === 0) {
        return {
          departmentId:   dept.id,
          name:           dept.name,
          code:           dept.code,
          subjectsReported: 0,
          avgPOAttainment:  null,
          avgPSOAttainment: null,
          poAttainment:     [],
          psoAttainment:    [],
        }
      }

      const subjectIds = subjects.map((s) => s.id)

      const [allFinals, allMappings, allCOs] = await Promise.all([
        prisma.finalAttainment.findMany({ where: { subjectId: { in: subjectIds } } }),
        prisma.coPoMapping.findMany({ where: { subjectId: { in: subjectIds } } }),
        prisma.courseOutcome.findMany({ where: { subjectId: { in: subjectIds } } }),
      ])

      if (allFinals.length === 0) {
        return {
          departmentId:   dept.id,
          name:           dept.name,
          code:           dept.code,
          subjectsReported: 0,
          avgPOAttainment:  null,
          avgPSOAttainment: null,
          poAttainment:     [],
          psoAttainment:    [],
        }
      }

      // Aggregate across all subjects
      const finalResultsForEngine = allCOs.map((co) => {
        const fr = allFinals.find((f) => f.subjectId === co.subjectId && f.coNumber === co.number)
        return {
          coId:            co.id,
          coNumber:        co.number,
          targetPercent:   co.targetPercent,
          directValue:     0,
          indirectValue:   0,
          directWeight:    config.directWeight,
          indirectWeight:  config.indirectWeight,
          finalValue:      fr ? sanitise(fr.finalValue ?? 0) : 0,
          targetMet:       false,
          attainmentLevel: 'below' as const,
        }
      })

      const mappingRecs = allMappings.map((m) => ({
        coId: m.coId, poId: m.poId, psoId: m.psoId, level: m.level,
      }))

      const poResults  = calculatePOAttainment(finalResultsForEngine, mappingRecs, pos, config)
      const psoResults = calculatePSOAttainment(finalResultsForEngine, mappingRecs, psos, config)

      const validPO  = poResults.filter((p) => p.attainment > 0)
      const validPSO = psoResults.filter((p) => p.attainment > 0)

      const avgPO  = validPO.length  > 0 ? validPO.reduce((a,  b) => a + b.attainment, 0) / validPO.length  : null
      const avgPSO = validPSO.length > 0 ? validPSO.reduce((a, b) => a + b.attainment, 0) / validPSO.length : null

      return {
        departmentId:     dept.id,
        name:             dept.name,
        code:             dept.code,
        subjectsReported: subjects.length,
        avgPOAttainment:  avgPO  !== null ? round2(sanitise(avgPO))  : null,
        avgPSOAttainment: avgPSO !== null ? round2(sanitise(avgPSO)) : null,
        poAttainment:     poResults.map((r)  => ({ ...r, attainment: round2(r.attainment) })),
        psoAttainment:    psoResults.map((r) => ({ ...r, attainment: round2(r.attainment) })),
      }
    })
  )

  // Overall averages
  const deptsWithData = deptSummaries.filter((d) => d.avgPOAttainment !== null)
  const overallPO  = deptsWithData.length > 0
    ? deptsWithData.reduce((a, d) => a + (d.avgPOAttainment ?? 0), 0) / deptsWithData.length
    : 0
  const overallPSO = deptsWithData.length > 0
    ? deptsWithData.reduce((a, d) => a + (d.avgPSOAttainment ?? 0), 0) / deptsWithData.length
    : 0

  // Accreditation readiness
  const allDeptsHaveApproved = deptSummaries.every((d) => d.subjectsReported > 0)
  const someDeptsHaveApproved = deptSummaries.some((d) => d.subjectsReported > 0)

  let accreditationReadiness: 'ready' | 'partial' | 'not-ready'
  if (allDeptsHaveApproved && round2(overallPO) >= config.targetMet) {
    accreditationReadiness = 'ready'
  } else if (someDeptsHaveApproved) {
    accreditationReadiness = 'partial'
  } else {
    accreditationReadiness = 'not-ready'
  }

  return {
    totalDepartments,
    overallPOAttainment:  round2(sanitise(overallPO)),
    overallPSOAttainment: round2(sanitise(overallPSO)),
    departmentSummary:    deptSummaries,
    accreditationReadiness,
    calculatedAt:         new Date(),
  }
}
