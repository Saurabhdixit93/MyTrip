import "server-only";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { signGuestToken, verifyGuestToken } from "./guest-token";

const UPGRADE_COOKIE = "mt_guest_upgrade";

/** Remember which guest account is upgrading so its trips can be merged after sign-in. */
export async function rememberGuestForUpgrade(guestUserId: string) {
  (await cookies()).set(UPGRADE_COOKIE, signGuestToken(guestUserId, 30 * 60_000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 60,
  });
}

/** Called from Auth.js `events.signIn`: moves a guest's memberships onto the real account. */
export async function mergeUpgradingGuest(userId: string) {
  const jar = await cookies();
  const token = jar.get(UPGRADE_COOKIE)?.value;
  if (!token) return;
  jar.delete(UPGRADE_COOKIE);
  const guestId = verifyGuestToken(token);
  if (!guestId || guestId === userId) return;

  await db.$transaction(async (tx) => {
    const guest = await tx.user.findFirst({ where: { id: guestId, isGuest: true, deletedAt: null } });
    if (!guest) return;
    const memberships = await tx.tripMember.findMany({ where: { userId: guestId } });
    for (const m of memberships) {
      const clash = await tx.tripMember.findFirst({ where: { tripId: m.tripId, userId } });
      // If the real account is already in that trip, the guest seat becomes an unclaimed placeholder.
      await tx.tripMember.update({ where: { id: m.id }, data: { userId: clash ? null : userId } });
    }
    await tx.trip.updateMany({ where: { createdById: guestId }, data: { createdById: userId } });
    await tx.auditLog.updateMany({ where: { actorUserId: guestId }, data: { actorUserId: userId } });
    const target = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (!target.phone && guest.phone) await tx.user.update({ where: { id: userId }, data: { phone: guest.phone } });
    await tx.user.update({ where: { id: guestId }, data: { deletedAt: new Date() } });
  });
}
