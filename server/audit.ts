import "server-only";
import type { Prisma } from "@/db/generated/client";
import type { Tx } from "./db";

export type AuditEntity = "trip" | "member" | "expense" | "payment" | "user";
export type AuditAction = "create" | "update" | "delete" | "restore" | "join" | "claim" | "lock" | "unlock" | "role" | "invite.regenerate" | "submit" | "verify" | "reject" | "cancel";

/** JSON-safe snapshot (Dates → ISO strings, undefined dropped). */
function snapshot(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  const json: Prisma.InputJsonValue = JSON.parse(JSON.stringify(value));
  return json;
}

/** Append-only audit trail: who did what, when, old → new. Always written inside the mutation's transaction. */
export async function audit(
  tx: Tx,
  entry: {
    tripId?: string | null;
    actorUserId?: string | null;
    actorMemberId?: string | null;
    entityType: AuditEntity;
    entityId: string;
    action: AuditAction;
    before?: unknown;
    after?: unknown;
  },
) {
  await tx.auditLog.create({
    data: {
      tripId: entry.tripId ?? null,
      actorUserId: entry.actorUserId ?? null,
      actorMemberId: entry.actorMemberId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      before: snapshot(entry.before),
      after: snapshot(entry.after),
    },
  });
}

/** Only the fields that changed, for compact before/after diffs. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    const prev = before[key];
    const next = after[key];
    const same = prev instanceof Date && next instanceof Date ? prev.getTime() === next.getTime() : prev === next;
    if (!same) {
      b[key] = prev;
      a[key] = next;
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}
