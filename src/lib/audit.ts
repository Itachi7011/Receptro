import { randomUUID } from "crypto";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { User } from "@/db/schema";

export type AuditAction =
  | "dealer.created"
  | "dealer.updated"
  | "dealer.deleted"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.deleted"
  | "invoice.imported"
  | "invoice.reminder_sent"
  | "payment.recorded"
  | "payment.deleted"
  | "team.invited"
  | "team.role_changed"
  | "team.suspended"
  | "team.reactivated"
  | "team.removed"
  | "business.updated";

/**
 * Fire-and-forget audit log write. Never throws into the caller — a failed
 * audit write shouldn't block the underlying business action.
 */
export function logAudit(params: {
  actor: Pick<User, "id" | "name" | "businessId">;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  metadata?: Record<string, unknown>;
}) {
  void db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      businessId: params.actor.businessId,
      actorUserId: params.actor.id,
      actorName: params.actor.name,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityLabel: params.entityLabel,
      metadata: params.metadata,
    })
    .catch((err) => console.error("[audit] failed to write audit log:", err));
}
