import type { Request } from 'express'
import type { AuditAction } from '@prisma/client'
import { prisma } from '@/config/prisma'
import logger from '@/utils/logger'

interface AuditLogParams {
  userId: string
  action: AuditAction
  entity: string
  entityId?: string
  detail?: string
  ipAddress?: string
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  void prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail,
        ipAddress: params.ipAddress,
      },
    })
    .catch((err: Error) => {
      logger.warn('Failed to create audit log', {
        error: err.message,
        params,
      })
    })
}

export const getClientIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string | undefined)
    ?.split(',')[0]
    ?.trim() ??
  req.socket.remoteAddress ??
  'unknown'
