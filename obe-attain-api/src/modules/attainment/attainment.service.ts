/**
 * Attainment Service
 * Orchestrates: DB fetch → engine → DB persist
 * All engine calls are pure — no DB inside engine functions.
 */

import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import {
  verifySubjectAccess,
  type RequestingUser,
} from '@/utils/subjectAccess.utils'

// Engine imports
import { calculateAllCOsDirectAttainment } from '@/engine/directAttainment.engine'
import { calculateAllCOsIndirectAttainment, calculateIndirectAttainmentForCO } from '@/engine/indirectAttainment.engine'
import { calculateAllCOsFinalAttainment, calculateOverallAttainment } from '@/engine/finalAttainment.engine'
import { calculatePOAttainment, calculatePSOAttainment, buildSubjectAttainmentSummary } from '@/engine/poAttainment.engine'
import { round2, round4, sanitise, type AttainmentConfig } from '@/engine/engine.types'

import type { SubmitIndirectDto, UpdateConfigDto } from './attainment.schema'

// ─── getAttainmentConfig ──────────────────────────────────────────────────────

export async function getAttainmentConfig(): Promise<AttainmentConfig> {
  const cfg = await prisma.attainmentConfig.findFirst()
  if (!cfg) {
    return {
      directWeight:   0.8,
      indirectWeight: 0.2,
      targetMet:      60,
      nearTarget:     50,
    }
  }
  return {
    directWeight:   cfg.directWeight,
    indirectWeight: cfg.indirectWeight,
    targetMet:      cfg.targetMet,
    nearTarget:     cfg.nearTarget,
  }
}

// ─── calculateAndPersist ──────────────────────────────────────────────────────

export async function calculateAndPersist(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  // ── Step 1: Access + prerequisite checks ────────────────────────────────────
  await verifySubjectAccess(subjectId, requestingUser)

  const [coCount, mappingCount, markCount] = await Promise.all([
    prisma.courseOutcome.count({ where: { subjectId } }),
    prisma.coPoMapping.count({ where: { subjectId, level: { gt: 0 } } }),
    prisma.studentMark.count({ where: { subjectId } }),
  ])

  if (coCount === 0)      throw ApiError.conflict('Define COs before calculating attainment')
  if (mappingCount === 0) throw ApiError.conflict('Complete CO-PO mapping before calculating')
  if (markCount === 0)    throw ApiError.conflict('Upload student marks before calculating')

  // ── Step 2: Fetch all data in parallel ──────────────────────────────────────
  const [marks, cos, mappings, indirectData, config, pos, psos] =
    await Promise.all([
      prisma.studentMark.findMany({ where: { subjectId } }),
      prisma.courseOutcome.findMany({
        where:   { subjectId },
        orderBy: { number: 'asc' },
      }),
      prisma.coPoMapping.findMany({ where: { subjectId } }),
      prisma.indirectAttainment.findMany({ where: { subjectId } }),
      getAttainmentConfig(),
      prisma.programOutcome.findMany({ orderBy: { number: 'asc' } }),
      prisma.programSpecificOutcome.findMany({ orderBy: { number: 'asc' } }),
    ])

  // ── Step 3: Run pure engine ──────────────────────────────────────────────────
  const coRecords = cos.map((c) => ({
    id:            c.id,
    number:        c.number,
    targetPercent: c.targetPercent,
  }))

  const markRecords = marks.map((m) => ({
    studentId:  m.studentId,
    ia1:        m.ia1,
    ia2:        m.ia2,
    ia3:        m.ia3,
    modelExam:  m.modelExam,
    ese:        m.ese,
    assignment: m.assignment,
    lab:        m.lab,
  }))

  const surveyRecords = indirectData.map((d) => ({
    coNumber: d.coNumber,
    q1:       d.q1,
    q2:       d.q2,
    q3:       d.q3,
    q4:       d.q4,
    q5:       d.q5,
  }))

  const mappingRecords = mappings.map((m) => ({
    coId:  m.coId,
    poId:  m.poId,
    psoId: m.psoId,
    level: m.level,
  }))

  const directResults   = calculateAllCOsDirectAttainment(markRecords, coRecords, config)
  const indirectResults = calculateAllCOsIndirectAttainment(surveyRecords)
  const finalResults    = calculateAllCOsFinalAttainment(directResults, indirectResults, coRecords, config)
  const poResults       = calculatePOAttainment(finalResults, mappingRecords, pos, config)
  const psoResults      = calculatePSOAttainment(finalResults, mappingRecords, psos, config)
  const overall         = calculateOverallAttainment(finalResults)

  // ── Step 4: Persist in a single transaction ──────────────────────────────────
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Persist DirectAttainment per CO
    for (const result of directResults) {
      await tx.directAttainment.upsert({
        where:  { subjectId_coId: { subjectId, coId: result.coId } },
        create: {
          subjectId,
          coId:          result.coId,
          iaAttainment:  round4(sanitise(result.iaAttainment)),
          eseAttainment: round4(sanitise(result.eseAttainment)),
          directValue:   round4(sanitise(result.directValue)),
          status:        'CALCULATED',
          calculatedAt:  now,
        },
        update: {
          iaAttainment:  round4(sanitise(result.iaAttainment)),
          eseAttainment: round4(sanitise(result.eseAttainment)),
          directValue:   round4(sanitise(result.directValue)),
          status:        'CALCULATED',
          calculatedAt:  now,
        },
      })
    }

    // Persist FinalAttainment per CO number
    for (const result of finalResults) {
      await tx.finalAttainment.upsert({
        where:  { subjectId_coNumber: { subjectId, coNumber: result.coNumber } },
        create: {
          subjectId,
          coNumber:       result.coNumber,
          directValue:    round4(sanitise(result.directValue)),
          indirectValue:  round4(sanitise(result.indirectValue)),
          directWeight:   result.directWeight,
          indirectWeight: result.indirectWeight,
          finalValue:     round4(sanitise(result.finalValue)),
          targetPercent:  result.targetPercent,
          targetMet:      result.targetMet,
          calculatedAt:   now,
        },
        update: {
          directValue:    round4(sanitise(result.directValue)),
          indirectValue:  round4(sanitise(result.indirectValue)),
          directWeight:   result.directWeight,
          indirectWeight: result.indirectWeight,
          finalValue:     round4(sanitise(result.finalValue)),
          targetPercent:  result.targetPercent,
          targetMet:      result.targetMet,
          calculatedAt:   now,
        },
      })
    }
  })

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'CALCULATE',
    entity:   'Subject',
    entityId: subjectId,
    detail:   `Attainment calculated for ${coCount} COs`,
  })

  // Build and return summary with round2 for API display
  const summary = buildSubjectAttainmentSummary(
    subjectId,
    finalResults.map((r) => ({
      ...r,
      directValue:    round2(sanitise(r.directValue)),
      indirectValue:  round2(sanitise(r.indirectValue)),
      finalValue:     round2(sanitise(r.finalValue)),
    })),
    poResults.map((r) => ({ ...r, attainment: round2(sanitise(r.attainment)) })),
    psoResults.map((r) => ({ ...r, attainment: round2(sanitise(r.attainment)) })),
    {
      overallDirect:    round2(sanitise(overall.overallDirect)),
      overallIndirect:  round2(sanitise(overall.overallIndirect)),
      overallFinal:     round2(sanitise(overall.overallFinal)),
      cosMeetingTarget: overall.cosMeetingTarget,
    }
  )

  return summary
}

// ─── getDirectAttainment ──────────────────────────────────────────────────────

export async function getDirectAttainment(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const records = await prisma.directAttainment.findMany({
    where:   { subjectId },
    include: {
      co: {
        select: { number: true, description: true, bloomsLevel: true, targetPercent: true },
      },
    },
    orderBy: { co: { number: 'asc' } },
  })

  if (records.length === 0) {
    return { status: 'not_calculated', data: [] }
  }

  return {
    status: 'calculated',
    data: records.map((r) => ({
      coId:          r.coId,
      coNumber:      r.co.number,
      description:   r.co.description,
      bloomsLevel:   r.co.bloomsLevel,
      targetPercent: r.co.targetPercent,
      iaAttainment:  round2(sanitise(r.iaAttainment  ?? 0)),
      eseAttainment: round2(sanitise(r.eseAttainment ?? 0)),
      directValue:   round2(sanitise(r.directValue   ?? 0)),
      status:        r.status,
      calculatedAt:  r.calculatedAt,
    })),
  }
}

// ─── getIndirectAttainment ────────────────────────────────────────────────────

export async function getIndirectAttainment(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const records = await prisma.indirectAttainment.findMany({
    where:   { subjectId },
    orderBy: { coNumber: 'asc' },
  })

  if (records.length === 0) {
    return { status: 'not_submitted', data: [] }
  }

  return {
    status: 'submitted',
    data: records.map((r) => {
      const computed = calculateIndirectAttainmentForCO({
        coNumber: r.coNumber,
        q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, q5: r.q5,
      })
      return {
        coNumber:   r.coNumber,
        q1: r.q1, q2: r.q2, q3: r.q3, q4: r.q4, q5: r.q5,
        avgScore:   round2(computed.avgScore),
        attainment: round2(computed.attainment),
        updatedAt:  r.updatedAt,
      }
    }),
  }
}

// ─── submitIndirectAttainment ─────────────────────────────────────────────────

export async function submitIndirectAttainment(
  subjectId:      string,
  dto:            SubmitIndirectDto,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const now = new Date()

  await prisma.$transaction(
    dto.surveys.map((survey) =>
      prisma.indirectAttainment.upsert({
        where:  { subjectId_coNumber: { subjectId, coNumber: survey.coNumber } },
        create: {
          subjectId,
          coNumber:  survey.coNumber,
          q1: survey.q1, q2: survey.q2, q3: survey.q3,
          q4: survey.q4, q5: survey.q5,
          updatedAt: now,
        },
        update: {
          q1: survey.q1, q2: survey.q2, q3: survey.q3,
          q4: survey.q4, q5: survey.q5,
          updatedAt: now,
        },
      })
    )
  )

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'IndirectAttainment',
    entityId: subjectId,
    detail:   `Submitted ${dto.surveys.length} CO surveys`,
  })

  return getIndirectAttainment(subjectId, requestingUser)
}

// ─── getFinalAttainment ───────────────────────────────────────────────────────

export async function getFinalAttainment(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const [records, config] = await Promise.all([
    prisma.finalAttainment.findMany({
      where:   { subjectId },
      orderBy: { coNumber: 'asc' },
    }),
    getAttainmentConfig(),
  ])

  if (records.length === 0) {
    return { status: 'not_calculated', data: [], config }
  }

  const data = records.map((r) => {
    const finalValue = sanitise(r.finalValue ?? 0)
    let attainmentLevel: 'met' | 'near' | 'below'
    if (finalValue >= r.targetPercent)        attainmentLevel = 'met'
    else if (finalValue >= config.nearTarget) attainmentLevel = 'near'
    else                                      attainmentLevel = 'below'

    return {
      coNumber:        r.coNumber,
      targetPercent:   r.targetPercent,
      directValue:     round2(sanitise(r.directValue   ?? 0)),
      indirectValue:   round2(sanitise(r.indirectValue ?? 0)),
      directWeight:    r.directWeight,
      indirectWeight:  r.indirectWeight,
      finalValue:      round2(finalValue),
      targetMet:       r.targetMet,
      attainmentLevel,
      calculatedAt:    r.calculatedAt,
    }
  })

  return { status: 'calculated', data, config }
}

// ─── getCOPOAttainment ────────────────────────────────────────────────────────

export async function getCOPOAttainment(
  subjectId:      string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const [finalRecords, mappings, cos, pos, psos, config] = await Promise.all([
    prisma.finalAttainment.findMany({ where: { subjectId }, orderBy: { coNumber: 'asc' } }),
    prisma.coPoMapping.findMany({ where: { subjectId } }),
    prisma.courseOutcome.findMany({ where: { subjectId }, orderBy: { number: 'asc' } }),
    prisma.programOutcome.findMany({ orderBy: { number: 'asc' } }),
    prisma.programSpecificOutcome.findMany({ orderBy: { number: 'asc' } }),
    getAttainmentConfig(),
  ])

  if (finalRecords.length === 0) {
    return { status: 'not_calculated', poAttainment: [], psoAttainment: [], matrix: null }
  }

  // Build finalValue lookup by coNumber
  const finalByCoNumber = new Map(finalRecords.map((r) => [r.coNumber, r.finalValue]))
  // Build coId lookup by coNumber
  const coIdByNumber    = new Map(cos.map((c) => [c.number, c.id]))

  const finalResultsForEngine = cos.map((co) => ({
    coId:            co.id,
    coNumber:        co.number,
    targetPercent:   co.targetPercent,
    directValue:     0,
    indirectValue:   0,
    directWeight:    config.directWeight,
    indirectWeight:  config.indirectWeight,
    finalValue:      sanitise((finalByCoNumber.get(co.number) ?? 0) as number),
    targetMet:       false,
    attainmentLevel: 'below' as const,
  }))

  const mappingRecords = mappings.map((m) => ({
    coId:  m.coId,
    poId:  m.poId,
    psoId: m.psoId,
    level: m.level,
  }))

  const poAttainment  = calculatePOAttainment(finalResultsForEngine, mappingRecords, pos, config)
  const psoAttainment = calculatePSOAttainment(finalResultsForEngine, mappingRecords, psos, config)

  // Build contribution cells for matrix display
  const cells: {
    coNumber:     number
    poId?:        string
    psoId?:       string
    mappingLevel: number
    contribution: number
  }[] = []

  for (const m of mappings) {
    if (m.level === 0) continue
    const co         = cos.find((c) => c.id === m.coId)
    const finalValue = co ? sanitise((finalByCoNumber.get(co.number) ?? 0) as number) : 0
    const contribution = round2((m.level / 3) * finalValue)

    cells.push({
      coNumber:     co?.number ?? 0,
      poId:         m.poId ?? undefined,
      psoId:        m.psoId ?? undefined,
      mappingLevel: m.level,
      contribution,
    })
  }

  return {
    status: 'calculated',
    poAttainment:  poAttainment.map((r) => ({ ...r, attainment: round2(r.attainment) })),
    psoAttainment: psoAttainment.map((r) => ({ ...r, attainment: round2(r.attainment) })),
    matrix: {
      cos: cos.map((c) => ({
        number:      c.number,
        description: c.description,
        finalValue:  round2(sanitise((finalByCoNumber.get(c.number) ?? 0) as number)),
      })),
      pos:   pos.map((p)  => ({ id: p.id, code: p.code, description: p.description })),
      psos:  psos.map((p) => ({ id: p.id, code: p.code, description: p.description })),
      cells,
    },
  }
}

// ─── updateAttainmentConfig ───────────────────────────────────────────────────

export async function updateAttainmentConfig(
  dto:        UpdateConfigDto,
  requesterId: string
) {
  const existing = await prisma.attainmentConfig.findFirst()

  let config
  if (existing) {
    config = await prisma.attainmentConfig.update({
      where: { id: existing.id },
      data:  {
        directWeight:   dto.directWeight,
        indirectWeight: dto.indirectWeight,
        targetMet:      dto.targetMet,
        nearTarget:     dto.nearTarget,
      },
    })
  } else {
    config = await prisma.attainmentConfig.create({
      data: {
        directWeight:   dto.directWeight,
        indirectWeight: dto.indirectWeight,
        targetMet:      dto.targetMet,
        nearTarget:     dto.nearTarget,
      },
    })
  }

  void createAuditLog({
    userId:   requesterId,
    action:   'UPDATE',
    entity:   'AttainmentConfig',
    entityId: config.id,
  })

  return {
    config,
    warning:
      'Existing attainment values used the previous weightage. Recalculate each subject to apply new weights.',
  }
}

// ─── getDepartmentPOAttainment ────────────────────────────────────────────────

export async function getDepartmentPOAttainment(
  deptId:         string,
  academicYearId: string | undefined,
  requestingUser: RequestingUser
) {
  // Determine academic year
  let yearId = academicYearId
  if (!yearId) {
    const current = await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    yearId = current?.id
  }

  const whereBase = {
    departmentId:   deptId,
    status:         'APPROVED' as const,
    ...(yearId && { academicYearId: yearId }),
  }

  const subjects = await prisma.subject.findMany({
    where:   whereBase,
    select:  { id: true },
  })

  if (subjects.length === 0) {
    return {
      departmentId: deptId,
      academicYear: yearId ?? null,
      poAttainment:  [],
      psoAttainment: [],
      subjectCount:  0,
      calculatedAt:  new Date(),
    }
  }

  const subjectIds = subjects.map((s) => s.id)
  const config = await getAttainmentConfig()

  const [allFinals, allMappings, pos, psos] = await Promise.all([
    prisma.finalAttainment.findMany({ where: { subjectId: { in: subjectIds } } }),
    prisma.coPoMapping.findMany({ where: { subjectId: { in: subjectIds } } }),
    prisma.programOutcome.findMany({ orderBy: { number: 'asc' } }),
    prisma.programSpecificOutcome.findMany({ orderBy: { number: 'asc' } }),
    prisma.courseOutcome.findMany({ where: { subjectId: { in: subjectIds } } }),
  ])

  // For each subject, compute PO attainment then average across subjects
  const allCoBySubject = await prisma.courseOutcome.findMany({
    where: { subjectId: { in: subjectIds } },
  })

  // Per-subject PO attainment
  const poSumByPoId   = new Map<string, number>()
  const psoSumByPsoId = new Map<string, number>()
  let subjectPOCount  = 0

  for (const subj of subjects) {
    const subjFinals   = allFinals.filter((f) => f.subjectId === subj.id)
    const subjCos      = allCoBySubject.filter((c) => c.subjectId === subj.id)
    const subjMappings = allMappings.filter((m) => m.subjectId === subj.id)

    if (subjFinals.length === 0) continue

    const finalResultsForEngine = subjCos.map((co) => {
      const fr = subjFinals.find((f) => f.coNumber === co.number)
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

    const mappingRecs = subjMappings.map((m) => ({
      coId: m.coId, poId: m.poId, psoId: m.psoId, level: m.level,
    }))

    const poResults  = calculatePOAttainment(finalResultsForEngine, mappingRecs, pos, config)
    const psoResults = calculatePSOAttainment(finalResultsForEngine, mappingRecs, psos, config)

    subjectPOCount++
    for (const r of poResults)  poSumByPoId.set(r.poId,   (poSumByPoId.get(r.poId)  ?? 0) + r.attainment)
    for (const r of psoResults) psoSumByPsoId.set(r.psoId, (psoSumByPsoId.get(r.psoId) ?? 0) + r.attainment)
  }

  const poAttainment = pos.map((po) => ({
    poId:       po.id,
    poCode:     po.code,
    attainment: round2(sanitise(safeDivideLocal(poSumByPoId.get(po.id) ?? 0, subjectPOCount))),
    targetMet:  round2(sanitise(safeDivideLocal(poSumByPoId.get(po.id) ?? 0, subjectPOCount))) >= config.targetMet,
  }))

  const psoAttainment = psos.map((pso) => ({
    psoId:      pso.id,
    psoCode:    pso.code,
    attainment: round2(sanitise(safeDivideLocal(psoSumByPsoId.get(pso.id) ?? 0, subjectPOCount))),
    targetMet:  round2(sanitise(safeDivideLocal(psoSumByPsoId.get(pso.id) ?? 0, subjectPOCount))) >= config.targetMet,
  }))

  return {
    departmentId:  deptId,
    academicYear:  yearId ?? null,
    poAttainment,
    psoAttainment,
    subjectCount:  subjects.length,
    calculatedAt:  new Date(),
  }
}

// ─── getMultiYearPOTrends ─────────────────────────────────────────────────────

export async function getMultiYearPOTrends(
  deptId:         string,
  requestingUser: RequestingUser
) {
  // Get all academic years that have approved subjects in this dept
  const years = await prisma.academicYear.findMany({
    where: {
      subjects: {
        some: { departmentId: deptId, status: 'APPROVED' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const trends: { year: string; poAttainment: Record<string, number> }[] = []

  for (const year of years) {
    const result = await getDepartmentPOAttainment(deptId, year.id, requestingUser)
    const poRecord: Record<string, number> = {}
    for (const po of result.poAttainment) {
      poRecord[po.poCode] = po.attainment
    }
    trends.push({ year: year.name, poAttainment: poRecord })
  }

  return trends
}

// ─── Local helper ─────────────────────────────────────────────────────────────
function safeDivideLocal(num: number, den: number): number {
  return den === 0 ? 0 : num / den
}
