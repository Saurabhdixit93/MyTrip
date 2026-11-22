import "server-only";
import type { TripRole } from "@/db/generated/client";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";
import { AppError } from "../errors";
import { requireTripAccess } from "../rbac";

export async function addPlaceholderMember(user: CurrentUser, tripId: string, input: { displayName: string; phone?: string }) {
  const { member: actor } = await requireTripAccess(user.id, tripId, "member.add");
  return db.$transaction(async (tx) => {
    const m = await tx.tripMember.create({ data: { tripId, displayName: input.displayName, phone: input.phone ?? null, role: "MEMBER" } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: actor.id, entityType: "member", entityId: m.id, action: "create", after: { displayName: m.displayName, placeholder: true } });
    return m;
  });
}

/** A member who appears in any expense or payment can't be removed, or balances would silently change. */
async function hasMoneyHistory(memberId: string) {
  const [payer, split, payment] = await Promise.all([
    db.expensePayer.count({ where: { memberId, expense: { deletedAt: null } } }),
    db.expenseSplit.count({ where: { memberId, expense: { deletedAt: null } } }),
    db.payment.count({ where: { OR: [{ fromMemberId: memberId }, { toMemberId: memberId }], status: { not: "REJECTED" } } }),
  ]);
  return payer + split + payment > 0;
}

export async function removeMember(user: CurrentUser, tripId: string, memberId: string) {
  const { member: actor } = await requireTripAccess(user.id, tripId, "member.remove");
  const target = await db.tripMember.findFirst({ where: { id: memberId, tripId, deletedAt: null } });
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.role === "COACH") throw new AppError("FORBIDDEN", "The Coach can't be removed.");
  if (target.role === "CO_COACH" && actor.role !== "COACH") throw new AppError("FORBIDDEN", "Only the Coach can remove a Co-Coach.");
  if (await hasMoneyHistory(memberId)) {
    throw new AppError("CONFLICT", `${target.displayName} is part of expenses or payments. Remove them from those first.`);
  }
  await db.$transaction(async (tx) => {
    await tx.tripMember.update({ where: { id: memberId }, data: { deletedAt: new Date() } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: actor.id, entityType: "member", entityId: memberId, action: "delete", before: { displayName: target.displayName, role: target.role } });
  });
}

export async function updateMemberRole(user: CurrentUser, tripId: string, memberId: string, role: Exclude<TripRole, "COACH">) {
  const { member: actor } = await requireTripAccess(user.id, tripId, "member.role.update");
  const target = await db.tripMember.findFirst({ where: { id: memberId, tripId, deletedAt: null } });
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  if (target.role === "COACH") throw new AppError("FORBIDDEN", "The Coach's role can't be changed.");
  if (!target.userId && role !== "MEMBER") throw new AppError("VALIDATION", "Placeholder members must join before they can get a role.");
  if (target.role === role) return target;
  return db.$transaction(async (tx) => {
    const u = await tx.tripMember.update({ where: { id: memberId }, data: { role } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: actor.id, entityType: "member", entityId: memberId, action: "role", before: { role: target.role }, after: { role } });
    return u;
  });
}

export async function updateMyMemberProfile(user: CurrentUser, tripId: string, input: { displayName: string; upiVpa?: string }) {
  const { member } = await requireTripAccess(user.id, tripId, "trip.view");
  const next = { displayName: input.displayName, upiVpa: input.upiVpa ?? null };
  return db.$transaction(async (tx) => {
    const u = await tx.tripMember.update({ where: { id: member.id }, data: next });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "member", entityId: member.id, action: "update", before: { displayName: member.displayName, upiVpa: member.upiVpa }, after: next });
    return u;
  });
}
