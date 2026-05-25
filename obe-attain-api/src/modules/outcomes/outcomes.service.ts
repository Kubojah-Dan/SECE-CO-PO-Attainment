import { prisma } from '@/config/prisma'
import { createAuditLog } from '@/middleware/auditLog.middleware'

interface BulkUpdateItem { id: string; description: string }

export async function listPOs() {
  return prisma.programOutcome.findMany({ orderBy: { number: 'asc' } })
}

export async function listPSOs() {
  return prisma.programSpecificOutcome.findMany({ orderBy: { number: 'asc' } })
}

export async function bulkUpdatePOs(updates: BulkUpdateItem[], requesterId: string) {
  const results = await prisma.$transaction(
    updates.map((u) =>
      prisma.programOutcome.update({
        where: { id: u.id },
        data: { description: u.description, updatedAt: new Date() },
      })
    )
  )
  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'ProgramOutcome', detail: `Bulk updated ${updates.length} POs` })
  return results
}

export async function bulkUpdatePSOs(updates: BulkUpdateItem[], requesterId: string) {
  const results = await prisma.$transaction(
    updates.map((u) =>
      prisma.programSpecificOutcome.update({
        where: { id: u.id },
        data: { description: u.description, updatedAt: new Date() },
      })
    )
  )
  void createAuditLog({ userId: requesterId, action: 'UPDATE', entity: 'ProgramSpecificOutcome', detail: `Bulk updated ${updates.length} PSOs` })
  return results
}
