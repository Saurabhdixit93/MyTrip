import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser, type CurrentUser } from "../auth/session";
import { db } from "../db";

export async function listMyTrips(userId: string) {
  return db.tripMember.findMany({
    where: { userId, deletedAt: null, trip: { deletedAt: null } },
    include: {
      trip: {
        include: { _count: { select: { members: { where: { deletedAt: null } } } } },
      },
    },
    orderBy: { trip: { updatedAt: "desc" } },
  });
}

/** Trip + caller's membership + active members, deduped per request. Null when not a member. */
export const getTripContext = cache(async (userId: string, tripId: string) => {
  const me = await db.tripMember.findFirst({
    where: { tripId, userId, deletedAt: null, trip: { deletedAt: null } },
    include: { trip: true },
  });
  if (!me) return null;
  const members = await db.tripMember.findMany({
    where: { tripId, deletedAt: null },
    include: { user: { select: { image: true, isGuest: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  const { trip, ...membership } = me;
  return { trip, me: membership, members };
});

export type TripContext = NonNullable<Awaited<ReturnType<typeof getTripContext>>>;

/** For trip pages: requires sign-in and membership (404 otherwise, so trip ids aren't confirmed to outsiders). */
export async function requireTripPage(tripId: string, path = ""): Promise<{ user: CurrentUser } & TripContext> {
  const user = await requireUser(`/trips/${tripId}${path}`);
  const ctx = await getTripContext(user.id, tripId);
  if (!ctx) notFound();
  return { user, ...ctx };
}

export async function getAuditLog(tripId: string, take = 30, cursor?: string) {
  const rows = await db.auditLog.findMany({
    where: { tripId },
    include: { actorMember: { select: { displayName: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });
  return { rows: rows.slice(0, take), nextCursor: rows.length > take ? rows[take - 1]?.id : undefined };
}
