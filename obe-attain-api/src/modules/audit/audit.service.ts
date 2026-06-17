import { prisma } from '@/config/prisma'
import { ApiError } from '@/utils/ApiError'
import { AuditAction } from '@prisma/client'
import type { RequestingUser } from '@/utils/subjectAccess.utils'

interface AuditQuery {
  userId?:   string
  action?:   string
  entity?:   string
  dateFrom?: string
  dateTo?:   string
  page?:     number
  limit?:    number
}

function buildWhere(q: AuditQuery) {
  return {
    ...(q.userId && { userId: q.userId }),
    ...(q.action && Object.values(AuditAction).includes(q.action as AuditAction) && {
      action: q.action as AuditAction,
    }),
    ...(q.entity && { entity: q.entity }),
    ...((q.dateFrom ?? q.dateTo) && {
      createdAt: {
        ...(q.dateFrom && { gte: new Date(q.dateFrom) }),
        ...(q.dateTo   && { lte: new Date(q.dateTo) }),
      },
    }),
  }
}

export async function listAuditLogs(query: AuditQuery, requestingUser: RequestingUser) {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Audit log access requires SUPER_ADMIN role')
  }
  const page  = query.page  ?? 1
  const limit = Math.min(query.limit ?? 50, 200)
  const where = buildWhere(query)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Enrich with user data separately (avoids include type issues)
  const enriched = await Promise.all(
    logs.map(async (log) => {
      const user = await prisma.user.findUnique({
        where:  { id: log.userId },
        select: { id: true, name: true, email: true, role: true },
      })
      return { ...log, user }
    })
  )

  return { logs: enriched, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function exportAuditLogs(query: AuditQuery, requestingUser: RequestingUser): Promise<Buffer> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('Audit log export requires SUPER_ADMIN role')
  }
  const where = buildWhere(query)
  const logs  = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const userIds = [...new Set(logs.map((l) => l.userId))]
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const escape = (val: string | null | undefined) =>
    val ? `"${String(val).replace(/"/g, '""')}"` : ''

  const header = 'Timestamp,User,Email,Role,Action,Entity,EntityId,Detail'
  const rows   = logs.map((log) => {
    const u = userMap.get(log.userId)
    return [
      log.createdAt.toISOString(),
      u?.name   ?? '',
      u?.email  ?? '',
      u?.role   ?? '',
      log.action,
      log.entity,
      log.entityId ?? '',
      escape(log.detail),
    ].join(',')
  })

  return Buffer.from([header, ...rows].join('\n'), 'utf-8')
}
