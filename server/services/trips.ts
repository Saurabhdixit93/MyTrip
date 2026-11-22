import "server-only";
import type { TripStatus } from "@/db/generated/client";
import { randomCode, randomToken } from "@/lib/ids";
import type { TripInput } from "@/lib/validation/trip";
import { audit, diff } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";
import { AppError } from "../errors";
import { requireTripAccess } from "../rbac";
import { storage } from "../storage";
import { storeTripImage } from "../storage/uploads";

async function uniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(6);
    const clash = await db.trip.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!clash) return code;
  }
  throw new Error("Could not allocate a unique invite code");
}

function tripFields(input: TripInput) {
  return {
    name: input.name,
    destination: input.destination ?? null,
    description: input.description ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    budgetPaise: input.budget ?? null,
    settlementMode: input.settlementMode,
  };
}

export async function createTrip(user: CurrentUser, input: TripInput, cover: File | null) {
  const inviteCode = await uniqueInviteCode();
  const trip = await db.$transaction(async (tx) => {
    const created = await tx.trip.create({
      data: { ...tripFields(input), inviteCode, inviteToken: randomToken(), createdById: user.id },
    });
    const coach = await tx.tripMember.create({
      data: { tripId: created.id, userId: user.id, displayName: user.name || "Coach", phone: user.phone, role: "COACH", claimedAt: new Date() },
    });
    await audit(tx, { tripId: created.id, actorUserId: user.id, actorMemberId: coach.id, entityType: "trip", entityId: created.id, action: "create", after: tripFields(input) });
    return created;
  });
  if (cover) {
    const { key } = await storeTripImage(trip.id, "cover", cover);
    await db.trip.update({ where: { id: trip.id }, data: { coverKey: key } });
  }
  return trip;
}

export async function updateTrip(user: CurrentUser, tripId: string, input: TripInput, cover: File | null) {
  const { trip, member } = await requireTripAccess(user.id, tripId, "trip.update");
  const next = tripFields(input);
  let coverKey = trip.coverKey;
  if (cover) coverKey = (await storeTripImage(trip.id, "cover", cover)).key;
  else if (input.removeCover) coverKey = null;

  const changes = diff({ ...trip }, { ...next, coverKey });
  if (!changes.changed) return trip;
  const updated = await db.$transaction(async (tx) => {
    const u = await tx.trip.update({ where: { id: trip.id }, data: { ...next, coverKey } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "trip", entityId: tripId, action: "update", before: changes.before, after: changes.after });
    return u;
  });
  if (trip.coverKey && trip.coverKey !== coverKey) await storage.delete(trip.coverKey).catch(() => undefined);
  return updated;
}

export async function setTripStatus(user: CurrentUser, tripId: string, status: TripStatus) {
  const { trip, member } = await requireTripAccess(user.id, tripId, "trip.lock");
  if (trip.status === status) return trip;
  return db.$transaction(async (tx) => {
    const u = await tx.trip.update({ where: { id: tripId }, data: { status } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "trip", entityId: tripId, action: status === "ACTIVE" ? "unlock" : "lock", before: { status: trip.status }, after: { status } });
    return u;
  });
}

export async function deleteTrip(user: CurrentUser, tripId: string) {
  const { member } = await requireTripAccess(user.id, tripId, "trip.delete");
  await db.$transaction(async (tx) => {
    await tx.trip.update({ where: { id: tripId }, data: { deletedAt: new Date(), inviteEnabled: false } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "trip", entityId: tripId, action: "delete" });
  });
}

export async function regenerateInvite(user: CurrentUser, tripId: string, enabled: boolean) {
  const { member } = await requireTripAccess(user.id, tripId, "invite.manage");
  const inviteCode = await uniqueInviteCode();
  return db.$transaction(async (tx) => {
    const u = await tx.trip.update({ where: { id: tripId }, data: { inviteCode, inviteToken: randomToken(), inviteEnabled: enabled } });
    await audit(tx, { tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "trip", entityId: tripId, action: "invite.regenerate", after: { inviteEnabled: enabled } });
    return u;
  });
}

export function assertCanJoin(trip: { deletedAt: Date | null; inviteEnabled: boolean; status: TripStatus }) {
  if (trip.deletedAt || !trip.inviteEnabled || trip.status === "ARCHIVED") throw new AppError("NOT_FOUND", "This invite link is no longer active. Ask the Coach for a new one.");
}
