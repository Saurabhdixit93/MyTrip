import "server-only";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { signGuestToken } from "../auth/guest-token";
import { db } from "../db";
import { AppError } from "../errors";
import { assertCanJoin } from "./trips";

export type InvitePreview = NonNullable<Awaited<ReturnType<typeof getInvitePreview>>>;

/** Public, minimal trip info for the join screen. Never exposes amounts or member contact details. */
export async function getInvitePreview(token: string) {
  const trip = await db.trip.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      name: true,
      destination: true,
      startDate: true,
      endDate: true,
      inviteEnabled: true,
      status: true,
      deletedAt: true,
      members: { where: { deletedAt: null }, select: { id: true, displayName: true, userId: true, role: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip || trip.deletedAt || !trip.inviteEnabled || trip.status === "ARCHIVED") return null;
  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    memberCount: trip.members.length,
    coachName: trip.members.find((m) => m.role === "COACH")?.displayName ?? null,
    placeholders: trip.members.filter((m) => !m.userId).map((m) => ({ id: m.id, displayName: m.displayName })),
    memberUserIds: trip.members.flatMap((m) => (m.userId ? [m.userId] : [])),
  };
}

export async function findTokenByCode(code: string): Promise<string | null> {
  const trip = await db.trip.findUnique({ where: { inviteCode: code }, select: { inviteToken: true, inviteEnabled: true, deletedAt: true, status: true } });
  if (!trip || trip.deletedAt || !trip.inviteEnabled || trip.status === "ARCHIVED") return null;
  return trip.inviteToken;
}

/**
 * Joins a trip by invite token. Signed-out visitors become guest users (name + optional phone).
 * Optionally claims a placeholder member the Coach created earlier.
 */
export async function joinTrip(
  user: CurrentUser | null,
  input: { token: string; displayName: string; phone?: string; claimMemberId?: string },
): Promise<{ tripId: string; guestToken?: string }> {
  return db.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { inviteToken: input.token } });
    if (!trip) throw new AppError("NOT_FOUND", "This invite link is no longer active. Ask the Coach for a new one.");
    assertCanJoin(trip);

    let userId = user?.id;
    let guestToken: string | undefined;
    if (userId) {
      const existing = await tx.tripMember.findUnique({ where: { tripId_userId: { tripId: trip.id, userId } } });
      if (existing && !existing.deletedAt) return { tripId: trip.id };
      if (existing?.deletedAt) {
        await tx.tripMember.update({ where: { id: existing.id }, data: { deletedAt: null, role: "MEMBER" } });
        await audit(tx, { tripId: trip.id, actorUserId: userId, actorMemberId: existing.id, entityType: "member", entityId: existing.id, action: "join", after: { rejoined: true } });
        return { tripId: trip.id };
      }
    } else {
      const guest = await tx.user.create({ data: { name: input.displayName, phone: input.phone ?? null, isGuest: true } });
      userId = guest.id;
      guestToken = signGuestToken(guest.id);
    }

    if (input.claimMemberId) {
      const claimed = await tx.tripMember.updateMany({
        where: { id: input.claimMemberId, tripId: trip.id, userId: null, deletedAt: null },
        data: { userId, claimedAt: new Date(), ...(input.phone && { phone: input.phone }) },
      });
      if (claimed.count !== 1) throw new AppError("CONFLICT", "That spot was already claimed. Pick another or join as new.");
      await audit(tx, { tripId: trip.id, actorUserId: userId, actorMemberId: input.claimMemberId, entityType: "member", entityId: input.claimMemberId, action: "claim" });
    } else {
      const m = await tx.tripMember.create({ data: { tripId: trip.id, userId, displayName: input.displayName, phone: input.phone ?? null, role: "MEMBER", claimedAt: new Date() } });
      await audit(tx, { tripId: trip.id, actorUserId: userId, actorMemberId: m.id, entityType: "member", entityId: m.id, action: "join", after: { displayName: m.displayName } });
    }
    return { tripId: trip.id, guestToken };
  });
}
