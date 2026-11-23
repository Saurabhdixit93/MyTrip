import "server-only";
import type { PaymentMethod } from "@/db/generated/client";
import { can } from "@/lib/rbac";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";
import { AppError } from "../errors";
import { assertTripWritable, requireTripAccess } from "../rbac";

/**
 * Advances = money a member hands over up front (usually to the Coach's kitty).
 * In the ledger they are ordinary transfers (giver +amount, receiver −amount), so balances and
 * the settlement plan pick them up automatically once VERIFIED — no special-case maths anywhere.
 *
 * Who confirms:
 * - recorded by the receiver (or the Coach on someone else's behalf) → VERIFIED immediately
 * - reported by the giver → PAID_AWAITING_APPROVAL until the receiver/Coach approves
 */
export async function recordAdvance(
  user: CurrentUser,
  input: { tripId: string; fromMemberId: string; toMemberId: string; amount: number; paidOn: Date; method: PaymentMethod; note?: string; idempotencyKey: string },
) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "payment.create");
  assertTripWritable(trip);

  const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.tripId !== trip.id || existing.kind !== "ADVANCE") throw new AppError("CONFLICT", "This form was already used. Refresh and try again.");
    return existing;
  }

  const people = await db.tripMember.findMany({ where: { tripId: trip.id, deletedAt: null, id: { in: [input.fromMemberId, input.toMemberId] } } });
  const giver = people.find((p) => p.id === input.fromMemberId);
  const receiver = people.find((p) => p.id === input.toMemberId);
  if (!giver || !receiver || giver.id === receiver.id) throw new AppError("VALIDATION", "Pick who gave the money and who received it.");

  const isGiver = member.id === giver.id;
  const isReceiver = member.id === receiver.id;
  const manager = can(member.role, "payment.review.any");
  if (!isGiver && !isReceiver && !manager) throw new AppError("FORBIDDEN", "You can only record advances you gave or received.");

  const verified = isReceiver || (manager && !isGiver);
  const now = new Date();
  return db.$transaction(async (tx) => {
    const advance = await tx.payment.create({
      data: {
        tripId: trip.id,
        kind: "ADVANCE",
        fromMemberId: giver.id,
        toMemberId: receiver.id,
        amountPaise: input.amount,
        paidOn: input.paidOn,
        method: input.method,
        note: input.note ?? null,
        idempotencyKey: input.idempotencyKey,
        status: verified ? "VERIFIED" : "PAID_AWAITING_APPROVAL",
        submittedAt: now,
        ...(verified && { reviewedAt: now, reviewedByMemberId: member.id }),
      },
    });
    await tx.trip.update({ where: { id: trip.id }, data: { updatedAt: now } });
    await audit(tx, {
      tripId: trip.id,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "payment",
      entityId: advance.id,
      action: "advance",
      after: { from: giver.displayName, to: receiver.displayName, amountPaise: input.amount, paidOn: input.paidOn, method: input.method, status: advance.status },
    });
    return advance;
  });
}

/**
 * Cancels a wrongly recorded advance (kept for history as REJECTED with the reason, audited).
 * Receiver or Coach can void any open advance; the giver can withdraw one still awaiting approval.
 */
export async function voidAdvance(user: CurrentUser, input: { tripId: string; paymentId: string; reason?: string }) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "trip.view");
  assertTripWritable(trip);
  const advance = await db.payment.findFirst({ where: { id: input.paymentId, tripId: trip.id, kind: "ADVANCE" } });
  if (!advance) throw new AppError("NOT_FOUND", "Advance not found.");
  const allowed =
    advance.toMemberId === member.id || can(member.role, "payment.review.any") || (advance.fromMemberId === member.id && advance.status === "PAID_AWAITING_APPROVAL");
  if (!allowed) throw new AppError("FORBIDDEN", "Only the receiver or the Coach can cancel this advance.");

  await db.$transaction(async (tx) => {
    const moved = await tx.payment.updateMany({
      where: { id: advance.id, status: { in: ["VERIFIED", "PAID_AWAITING_APPROVAL"] } },
      data: { status: "REJECTED", rejectionReason: `Cancelled${input.reason ? `: ${input.reason}` : ""}`, reviewedAt: new Date(), reviewedByMemberId: member.id },
    });
    if (moved.count !== 1) throw new AppError("CONFLICT", "This advance was already cancelled.");
    await tx.trip.update({ where: { id: trip.id }, data: { updatedAt: new Date() } });
    await audit(tx, {
      tripId: trip.id,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "payment",
      entityId: advance.id,
      action: "void",
      before: { status: advance.status, amountPaise: advance.amountPaise },
      after: { status: "REJECTED", reason: input.reason ?? null },
    });
  });
}
