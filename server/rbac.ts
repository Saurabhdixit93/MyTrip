import "server-only";
import type { Trip, TripMember } from "@/db/generated/client";
import { can, type Permission } from "@/lib/rbac";
import { db } from "./db";
import { AppError } from "./errors";

export type TripAccess = { trip: Trip; member: TripMember };

/**
 * Loads the trip and the caller's membership, and enforces a permission.
 * Throws NOT_FOUND for non-members so trip existence isn't leaked.
 */
export async function requireTripAccess(userId: string, tripId: string, permission: Permission): Promise<TripAccess> {
  const member = await db.tripMember.findFirst({
    where: { tripId, userId, deletedAt: null, trip: { deletedAt: null } },
    include: { trip: true },
  });
  if (!member) throw new AppError("NOT_FOUND", "Trip not found.");
  if (!can(member.role, permission)) throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  const { trip, ...rest } = member;
  return { trip, member: rest };
}

/** Mutations on expenses/payments are blocked once the Coach locks or archives the trip. */
export function assertTripWritable(trip: Trip) {
  if (trip.status !== "ACTIVE") throw new AppError("LOCKED", "This trip is locked. Ask the Coach to unlock it.");
}
