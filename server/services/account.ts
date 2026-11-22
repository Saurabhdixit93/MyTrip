import "server-only";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";

export async function updateProfile(user: CurrentUser, input: { name: string; phone?: string }) {
  await db.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone ?? null } });
}

/**
 * Deletes personal data. Trip seats become unclaimed placeholders (display name kept) so other
 * members' balances and history stay correct; email, phone, photo and logins are erased.
 */
export async function deleteAccount(user: CurrentUser) {
  await db.$transaction(async (tx) => {
    await tx.tripMember.updateMany({ where: { userId: user.id }, data: { userId: null, phone: null, upiVpa: null } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { name: "Deleted user", email: null, phone: null, image: null, emailVerified: null, deletedAt: new Date() },
    });
    await audit(tx, { actorUserId: user.id, entityType: "user", entityId: user.id, action: "delete" });
  });
}
