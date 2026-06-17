import fs from 'fs'
import path from 'path'
import { prisma } from '@/config/prisma'
import { env } from '@/config/env'
import { ApiError } from '@/utils/ApiError'
import { createAuditLog } from '@/middleware/auditLog.middleware'
import logger from '@/utils/logger'
import type { UpdateThresholdsDto } from './systemConfig.schema'

const DEFAULT_CFG = {
  directWeight: 0.8, indirectWeight: 0.2, targetMet: 60, nearTarget: 50,
}

// ── Thresholds ────────────────────────────────────────────────────────────────

export async function getThresholds() {
  const cfg = await prisma.attainmentConfig.findFirst()
  return cfg ?? DEFAULT_CFG
}

export async function updateThresholds(dto: UpdateThresholdsDto, requesterId: string) {
  const existing = await prisma.attainmentConfig.findFirst()
  const data = {
    targetMet:      dto.targetMet,
    nearTarget:     dto.nearTarget,
    directWeight:   dto.directWeight   ?? (existing?.directWeight   ?? DEFAULT_CFG.directWeight),
    indirectWeight: dto.indirectWeight ?? (existing?.indirectWeight ?? DEFAULT_CFG.indirectWeight),
  }

  const cfg = existing
    ? await prisma.attainmentConfig.update({ where: { id: existing.id }, data })
    : await prisma.attainmentConfig.create({ data })

  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'AttainmentConfig', entityId: cfg.id })
  return {
    config: cfg,
    warning: 'Existing attainment values used the previous weightage. Recalculate each subject to apply new weights.',
  }
}

// ── Backups ───────────────────────────────────────────────────────────────────

export async function createBackup(requesterId: string) {
  fs.mkdirSync(env.BACKUPS_DIR, { recursive: true })
  const filename = `backup-${Date.now()}.json`
  const filePath = path.join(env.BACKUPS_DIR, filename)

  const [
    departments, users, regulations, academicYears, subjects, students,
    pos, psos, cos, mappings, marks,
    directAtt, indirectAtt, finalAtt, attainmentCfg,
  ] = await Promise.all([
    prisma.department.findMany(),
    prisma.user.findMany({ select: { id:true, name:true, email:true, role:true, departmentId:true, createdAt:true, updatedAt:true } }),
    prisma.regulation.findMany(),
    prisma.academicYear.findMany(),
    prisma.subject.findMany(),
    prisma.student.findMany(),
    prisma.programOutcome.findMany(),
    prisma.programSpecificOutcome.findMany(),
    prisma.courseOutcome.findMany(),
    prisma.coPoMapping.findMany(),
    prisma.studentMark.findMany(),
    prisma.directAttainment.findMany(),
    prisma.indirectAttainment.findMany(),
    prisma.finalAttainment.findMany(),
    prisma.attainmentConfig.findFirst(),
  ])

  const backup = {
    version:   '1.0.0',
    createdAt: new Date(),
    data: {
      departments, users, regulations, academicYears, subjects, students,
      pos, psos, cos, mappings, marks,
      directAtt, indirectAtt, finalAtt,
      attainmentCfg: attainmentCfg ? [attainmentCfg] : [],
    },
  }

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2))
  const stat = fs.statSync(filePath)

  void createAuditLog({ userId: requesterId, action: 'CREATE', entity: 'Backup', entityId: filename })
  return { filename, size: stat.size, createdAt: new Date() }
}

export async function listBackups() {
  fs.mkdirSync(env.BACKUPS_DIR, { recursive: true })
  const files = fs.readdirSync(env.BACKUPS_DIR)
    .filter((f) => /^backup-\d+\.json$/.test(f))
    .map((filename) => {
      const stat = fs.statSync(path.join(env.BACKUPS_DIR, filename))
      return { filename, size: stat.size, createdAt: stat.mtime }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return files
}

export async function restoreBackup(filename: string, requesterId: string) {
  // Safety: path traversal guard
  if (!/^backup-\d+\.json$/.test(filename)) {
    throw ApiError.badRequest('Invalid backup filename')
  }
  const filePath = path.join(env.BACKUPS_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Backup file not found')
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  let backup: { version: string; data: Record<string, unknown[]> }
  try {
    backup = JSON.parse(raw)
  } catch {
    throw ApiError.badRequest('Backup file is corrupted or invalid JSON')
  }
  if (!backup.version) throw ApiError.badRequest('Backup file missing version field')

  logger.warn(`[RESTORE] Initiated by ${requesterId} from ${filename}`)
  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'System', entityId: 'restore', detail: filename })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cast = <T>(arr: unknown): T[] => (Array.isArray(arr) ? arr : []) as T[]

  await prisma.$transaction(
    async (tx) => {
      // Delete children first
      await tx.finalAttainment.deleteMany()
      await tx.directAttainment.deleteMany()
      await tx.indirectAttainment.deleteMany()
      await tx.studentMark.deleteMany()
      await tx.coPoMapping.deleteMany()
      await tx.courseOutcome.deleteMany()
      await tx.subjectFaculty.deleteMany()
      await tx.subject.deleteMany()
      await tx.student.deleteMany()
      await tx.attainmentConfig.deleteMany()
      await tx.user.deleteMany({ where: { id: { not: requesterId } } })
      await tx.department.deleteMany()
      await tx.regulation.deleteMany()
      await tx.academicYear.deleteMany()
      await tx.programOutcome.deleteMany()
      await tx.programSpecificOutcome.deleteMany()

      // Insert parents first — cast via unknown to bypass strict Prisma generics
      const r = backup.data as unknown as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ins = async (fn: (args: any) => Promise<unknown>, arr: unknown) => {
        const rows = cast<object>(arr)
        if (rows.length) await fn({ data: rows, skipDuplicates: true })
      }

      await ins(tx.department.createMany.bind(tx.department),           r['departments'])
      await ins(tx.regulation.createMany.bind(tx.regulation),           r['regulations'])
      await ins(tx.academicYear.createMany.bind(tx.academicYear),       r['academicYears'])
      await ins(tx.programOutcome.createMany.bind(tx.programOutcome),   r['pos'])
      await ins(tx.programSpecificOutcome.createMany.bind(tx.programSpecificOutcome), r['psos'])
      await ins(tx.attainmentConfig.createMany.bind(tx.attainmentConfig), r['attainmentCfg'])

      const usersToRestore = cast<{ id: string }>(r['users'])
        .filter((u) => u.id !== requesterId)
      if (usersToRestore.length) {
        await tx.user.createMany({ data: usersToRestore as never, skipDuplicates: true })
      }

      await ins(tx.subject.createMany.bind(tx.subject),                   r['subjects'])
      await ins(tx.student.createMany.bind(tx.student),                   r['students'])
      await ins(tx.courseOutcome.createMany.bind(tx.courseOutcome),       r['cos'])
      await ins(tx.coPoMapping.createMany.bind(tx.coPoMapping),           r['mappings'])
      await ins(tx.studentMark.createMany.bind(tx.studentMark),           r['marks'])
      await ins(tx.directAttainment.createMany.bind(tx.directAttainment), r['directAtt'])
      await ins(tx.indirectAttainment.createMany.bind(tx.indirectAttainment), r['indirectAtt'])
      await ins(tx.finalAttainment.createMany.bind(tx.finalAttainment),   r['finalAtt'])
    },
    { timeout: 120_000 }
  )

  logger.warn(`[RESTORE] Completed by ${requesterId} from ${filename}`)
  return { message: 'Restore complete', filename }
}
