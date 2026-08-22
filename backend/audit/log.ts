import type { Database } from "@/db";
import { auditLogs } from "@/db/schema";

export async function writeAuditLog(
  db: Database,
  event: {
    companyId: string;
    actorUserId: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    companyId: event.companyId,
    actorUserId: event.actorUserId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId ?? null,
    metadata: event.metadata ?? {},
  });
}
