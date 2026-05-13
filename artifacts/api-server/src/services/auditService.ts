import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";

export async function logAudit(params: {
  userId: number;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}
