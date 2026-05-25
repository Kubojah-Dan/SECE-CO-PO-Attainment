import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import {
  verifySubjectAccess,
  type RequestingUser,
} from '@/utils/subjectAccess.utils'
import type { SaveMappingDto, MappingResponse } from './mapping.schema'

// ─── getMapping ───────────────────────────────────────────────────────────────

export async function getMapping(
  subjectId: string,
  requestingUser: RequestingUser
): Promise<MappingResponse> {
  await verifySubjectAccess(subjectId, requestingUser)

  const [cos, pos, psos, existingMappings] = await Promise.all([
    prisma.courseOutcome.findMany({
      where:   { subjectId },
      orderBy: { number: 'asc' },
      select:  { id: true, number: true, description: true },
    }),
    prisma.programOutcome.findMany({
      orderBy: { number: 'asc' },
      select:  { id: true, code: true, number: true, description: true },
    }),
    prisma.programSpecificOutcome.findMany({
      orderBy: { number: 'asc' },
      select:  { id: true, code: true, number: true, description: true },
    }),
    prisma.coPoMapping.findMany({
      where:   { subjectId },
      select:  { coId: true, poId: true, psoId: true, level: true },
    }),
  ])

  // Build lookup maps
  const poMappingByCo   = new Map<string, Record<string, number>>()
  const psoMappingByCo  = new Map<string, Record<string, number>>()

  for (const co of cos) {
    poMappingByCo.set(co.id, {})
    psoMappingByCo.set(co.id, {})
  }

  for (const m of existingMappings) {
    if (m.poId) {
      const obj = poMappingByCo.get(m.coId)
      if (obj) obj[m.poId] = m.level
    }
    if (m.psoId) {
      const obj = psoMappingByCo.get(m.coId)
      if (obj) obj[m.psoId] = m.level
    }
  }

  const cosWithMappings = cos.map((co) => ({
    id:          co.id,
    number:      co.number,
    description: co.description,
    mappings: {
      poMappings:  poMappingByCo.get(co.id)  ?? {},
      psoMappings: psoMappingByCo.get(co.id) ?? {},
    },
  }))

  return { cos: cosWithMappings, pos, psos }
}

// ─── saveMapping ──────────────────────────────────────────────────────────────

export async function saveMapping(
  subjectId: string,
  dto: SaveMappingDto,
  requestingUser: RequestingUser
): Promise<MappingResponse> {
  const subject = await verifySubjectAccess(subjectId, requestingUser)

  if (subject.status === 'APPROVED') {
    throw ApiError.conflict('Mapping is locked for an approved subject')
  }

  // Validate all coIds in dto.mapping belong to this subjectId
  const existingCOs = await prisma.courseOutcome.findMany({
    where:  { subjectId },
    select: { id: true },
  })
  const validCoIds = new Set(existingCOs.map((c) => c.id))

  for (const coId of Object.keys(dto.mapping)) {
    if (!validCoIds.has(coId)) {
      throw ApiError.badRequest(`CO ${coId} does not belong to this subject`)
    }
  }

  // Validate all PO and PSO ids
  const [allPOs, allPSOs] = await Promise.all([
    prisma.programOutcome.findMany({ select: { id: true } }),
    prisma.programSpecificOutcome.findMany({ select: { id: true } }),
  ])
  const validPoIds  = new Set(allPOs.map((p)  => p.id))
  const validPsoIds = new Set(allPSOs.map((p) => p.id))

  for (const [coId, entry] of Object.entries(dto.mapping)) {
    for (const poId of Object.keys(entry.poMappings)) {
      if (!validPoIds.has(poId)) {
        throw ApiError.badRequest(`PO ${poId} does not exist (CO: ${coId})`)
      }
    }
    for (const psoId of Object.keys(entry.psoMappings)) {
      if (!validPsoIds.has(psoId)) {
        throw ApiError.badRequest(`PSO ${psoId} does not exist (CO: ${coId})`)
      }
    }
  }

  // Build new records — skip level=0 (no correlation)
  const newRecords: {
    subjectId: string
    coId:      string
    poId?:     string
    psoId?:    string
    level:     number
    updatedAt: Date
  }[] = []

  const now = new Date()

  for (const [coId, entry] of Object.entries(dto.mapping)) {
    for (const [poId, level] of Object.entries(entry.poMappings)) {
      if (level > 0) {
        newRecords.push({ subjectId, coId, poId, level, updatedAt: now })
      }
    }
    for (const [psoId, level] of Object.entries(entry.psoMappings)) {
      if (level > 0) {
        newRecords.push({ subjectId, coId, psoId, level, updatedAt: now })
      }
    }
  }

  // Full replace transaction
  await prisma.$transaction([
    prisma.coPoMapping.deleteMany({ where: { subjectId } }),
    prisma.coPoMapping.createMany({ data: newRecords, skipDuplicates: true }),
  ])

  void createAuditLog({
    userId:   requestingUser.userId,
    action:   'UPDATE',
    entity:   'CoPoMapping',
    entityId: subjectId,
    detail:   `Saved ${newRecords.length} mapping records`,
  })

  // ── Guard: mark direct attainment as stale ────────────────────────────────
  const attainmentCount = await prisma.finalAttainment.count({ where: { subjectId } })
  let warning: string | undefined

  if (attainmentCount > 0) {
    await prisma.directAttainment.updateMany({
      where: { subjectId },
      data:  { status: 'PENDING' },
    })
    warning = 'CO-PO mapping changed. Recalculate attainment to reflect the new mapping.'
  }

  // Return refreshed mapping with optional warning
  const mapping = await getMapping(subjectId, requestingUser)
  return { ...mapping, ...(warning && { warning }) }
}

// ─── getMappingStats ──────────────────────────────────────────────────────────

export async function getMappingStats(
  subjectId: string,
  requestingUser: RequestingUser
) {
  await verifySubjectAccess(subjectId, requestingUser)

  const [coCount, allMappings, pos] = await Promise.all([
    prisma.courseOutcome.count({ where: { subjectId } }),
    prisma.coPoMapping.findMany({
      where:   { subjectId },
      select:  { coId: true, poId: true, psoId: true, level: true },
    }),
    prisma.programOutcome.findMany({
      orderBy: { number: 'asc' },
      select:  { id: true, code: true, number: true },
    }),
  ])

  const mappedCoIds = new Set(allMappings.map((m) => m.coId))
  const mappedCoCount = mappedCoIds.size

  // Average level per PO
  const poLevelTotals: Record<string, { sum: number; count: number }> = {}
  for (const m of allMappings) {
    if (m.poId) {
      if (!poLevelTotals[m.poId]) poLevelTotals[m.poId] = { sum: 0, count: 0 }
      poLevelTotals[m.poId]!.sum   += m.level
      poLevelTotals[m.poId]!.count += 1
    }
  }

  const avgLevelPerPO = pos.map((po) => {
    const data = poLevelTotals[po.id]
    return {
      poId:     po.id,
      poCode:   po.code,
      poNumber: po.number,
      avgLevel: data ? Math.round((data.sum / data.count) * 100) / 100 : 0,
      mappings: data?.count ?? 0,
    }
  })

  return {
    totalCOs:         coCount,
    mappedCOs:        mappedCoCount,
    unmappedCOs:      coCount - mappedCoCount,
    totalMappings:    allMappings.length,
    avgLevelPerPO,
  }
}
