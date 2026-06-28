import { getDb } from "../../db/client";
import { auditLogs } from "../../db/schema";

export async function logAudit(params: {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return null;
  const [log] = await db.insert(auditLogs).values(params).returning();
  return log;
}
