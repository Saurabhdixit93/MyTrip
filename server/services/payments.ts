import "server-only";
import type { PaymentMethod } from "@/db/generated/client";
import { formatPaise } from "@/lib/format";
import { can } from "@/lib/rbac";
import { parseUpiUri } from "@/lib/upi";
import { audit } from "../audit";
import type { CurrentUser } from "../auth/session";
import { db } from "../db";
import { AppError } from "../errors";
import { assertTripWritable, requireTripAccess } from "../rbac";
import { getTripSummary } from "../queries/expenses";
import { storage } from "../storage";
import { storeTripImage } from "../storage/uploads";
import { decodeQrFromImage } from "../upi/qr-decode";

export async function updatePayout(user: CurrentUser, input: { tripId: string; upiVpa?: string; upiPayeeName?: string; removeQr: boolean }, qr: File | null) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "trip.payout.update");
  let vpa = input.upiVpa;
  let payeeName = input.upiPayeeName;
  let upiQrKey = input.removeQr ? null : trip.upiQrKey;
  let upiQrVpa = input.removeQr ? null : trip.upiQrVpa;

  if (qr) {
    // The QR must be a real UPI QR, and it must pay the same UPI ID (catches someone else's QR).
    const text = await decodeQrFromImage(new Uint8Array(await qr.arrayBuffer()));
    const qrFail = (message: string) => new AppError("VALIDATION", message, { upiQr: [message] });
    if (!text) throw qrFail("We couldn't find a QR code in that image. Upload a clear screenshot of your UPI QR.");
    const parsed = parseUpiUri(text);
    if (!parsed) throw qrFail("That QR isn't a UPI payment QR. Use the 'Receive money' QR from your UPI app.");
    if (vpa && parsed.vpa !== vpa) throw qrFail(`This QR pays ${parsed.vpa}, but your UPI ID is ${vpa}. Upload your own QR or fix the UPI ID.`);
    vpa ??= parsed.vpa;
    payeeName ??= parsed.payeeName ?? undefined;
    upiQrKey = (await storeTripImage(trip.id, "upi-qr", qr)).key;
    upiQrVpa = parsed.vpa;
  }
  if (!vpa && upiQrKey) throw new AppError("VALIDATION", "Add your UPI ID.", { upiVpa: ["Add your UPI ID"] });
  if (vpa && upiQrVpa && upiQrVpa !== vpa) {
    const message = `Your saved QR pays ${upiQrVpa}. Upload a QR for ${vpa} or remove the old one.`;
    throw new AppError("VALIDATION", message, { upiQr: [message] });
  }

  const vpaChanged = (vpa ?? null) !== trip.upiVpa;
  const next = { upiVpa: vpa ?? null, upiPayeeName: payeeName ?? null, upiQrKey, upiQrVpa, ...(vpaChanged && { upiVerifiedAt: null }) };
  await db.$transaction(async (tx) => {
    await tx.trip.update({ where: { id: trip.id }, data: next });
    // Keep the Coach's member profile in sync so P2P mode can use the same UPI ID.
    if (next.upiVpa) await tx.tripMember.update({ where: { id: member.id }, data: { upiVpa: next.upiVpa } });
    await audit(tx, {
      tripId: trip.id,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "trip",
      entityId: trip.id,
      action: "update",
      before: { upiVpa: trip.upiVpa, upiPayeeName: trip.upiPayeeName, upiQr: trip.upiQrVpa },
      after: { upiVpa: next.upiVpa, upiPayeeName: next.upiPayeeName, upiQr: upiQrVpa },
    });
  });
  if (trip.upiQrKey && trip.upiQrKey !== upiQrKey) await storage.delete(trip.upiQrKey).catch(() => undefined);
  return { upiVpa: next.upiVpa, upiPayeeName: next.upiPayeeName };
}

/**
 * The Coach confirms that a UPI app showed THEIR name for the saved UPI ID (after scanning the
 * ₹1 test QR). Free alternative to a paid bank "VPA name lookup" API.
 */
export async function confirmUpiVerified(user: CurrentUser, tripId: string) {
  const { trip, member } = await requireTripAccess(user.id, tripId, "trip.payout.update");
  if (!trip.upiVpa) throw new AppError("VALIDATION", "Save your UPI ID first.");
  await db.$transaction(async (tx) => {
    await tx.trip.update({ where: { id: trip.id }, data: { upiVerifiedAt: new Date() } });
    await audit(tx, { tripId: trip.id, actorUserId: user.id, actorMemberId: member.id, entityType: "trip", entityId: trip.id, action: "verify", after: { upiVpa: trip.upiVpa } });
  });
}

/** What `fromId` still has to pay `toId`: planned transfers minus payments already awaiting approval. */
export async function outstandingDue(tripId: string, fromId: string, toId: string) {
  const [summary, awaiting] = await Promise.all([
    getTripSummary(tripId),
    db.payment.aggregate({ where: { tripId, fromMemberId: fromId, toMemberId: toId, status: "PAID_AWAITING_APPROVAL" }, _sum: { amountPaise: true } }),
  ]);
  const planned = summary.plan.filter((t) => t.from === fromId && t.to === toId).reduce((s, t) => s + t.amountPaise, 0);
  return Math.max(0, planned - (awaiting._sum.amountPaise ?? 0));
}

/**
 * Two-step, idempotent payment submission keyed by a client-generated idempotency key:
 *  - "intent": member tapped Pay Now → PENDING record (no money effect)
 *  - "paid":   member says "I have paid" → PAID_AWAITING_APPROVAL, waiting for the receiver/Coach
 * Replaying the same key returns the existing payment instead of creating a duplicate.
 */
export async function submitPayment(
  user: CurrentUser,
  input: { tripId: string; toMemberId: string; amount: number; idempotencyKey: string; stage: "intent" | "paid"; method: PaymentMethod; utr?: string; note?: string },
  proof: File | null,
) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "payment.create");
  assertTripWritable(trip);

  const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing && (existing.tripId !== trip.id || existing.fromMemberId !== member.id)) throw new AppError("CONFLICT", "This payment link was already used.");
  if (existing && (existing.status !== "PENDING" || input.stage === "intent")) return existing;

  const payee = await db.tripMember.findFirst({ where: { id: input.toMemberId, tripId: trip.id, deletedAt: null } });
  if (!payee || payee.id === member.id) throw new AppError("VALIDATION", "Choose who you're paying.");

  const due = await outstandingDue(trip.id, member.id, payee.id);
  if (due <= 0) throw new AppError("CONFLICT", `You don't owe ${payee.displayName} anything right now.`);
  if (input.amount > due) throw new AppError("VALIDATION", `You owe ${payee.displayName} ${formatPaise(due)}. Enter that amount or less.`, { amount: [`Max ${formatPaise(due)}`] });

  const proofKey = proof && input.stage === "paid" ? (await storeTripImage(trip.id, "payment-proof", proof)).key : null;
  const paidFields =
    input.stage === "paid"
      ? { status: "PAID_AWAITING_APPROVAL" as const, utr: input.utr ?? null, proofKey, note: input.note ?? null, method: input.method, submittedAt: new Date() }
      : { status: "PENDING" as const, method: input.method };

  return db.$transaction(async (tx) => {
    const payment = existing
      ? await tx.payment.update({ where: { id: existing.id }, data: { ...paidFields, amountPaise: input.amount } })
      : await tx.payment.create({
          data: { tripId: trip.id, fromMemberId: member.id, toMemberId: payee.id, amountPaise: input.amount, idempotencyKey: input.idempotencyKey, ...paidFields },
        });
    await audit(tx, {
      tripId: trip.id,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "payment",
      entityId: payment.id,
      action: input.stage === "paid" ? "submit" : "create",
      after: { to: payee.displayName, amountPaise: input.amount, status: payment.status, method: payment.method, utr: payment.utr },
    });
    return payment;
  });
}

/** Approve/reject. Allowed for the receiving member, or the Coach for any payment. Race-safe status transition. */
export async function reviewPayment(user: CurrentUser, input: { tripId: string; paymentId: string; decision: "approve" | "reject"; reason?: string }) {
  const { member } = await requireTripAccess(user.id, input.tripId, "trip.view");
  const payment = await db.payment.findFirst({ where: { id: input.paymentId, tripId: input.tripId } });
  if (!payment) throw new AppError("NOT_FOUND", "Payment not found.");
  if (payment.toMemberId !== member.id && !can(member.role, "payment.review.any")) throw new AppError("FORBIDDEN", "Only the person receiving the money or the Coach can review this.");
  if (payment.fromMemberId === member.id) {
    // Exception: the Coach paying a placeholder (who can't sign in) may confirm it themselves.
    const receiver = await db.tripMember.findUnique({ where: { id: payment.toMemberId }, select: { userId: true } });
    if (receiver?.userId || !can(member.role, "payment.review.any")) throw new AppError("FORBIDDEN", "You can't approve your own payment.");
  }

  const status = input.decision === "approve" ? ("VERIFIED" as const) : ("REJECTED" as const);
  await db.$transaction(async (tx) => {
    const moved = await tx.payment.updateMany({
      where: { id: payment.id, status: "PAID_AWAITING_APPROVAL" },
      data: { status, reviewedAt: new Date(), reviewedByMemberId: member.id, rejectionReason: status === "REJECTED" ? (input.reason ?? null) : null },
    });
    if (moved.count !== 1) throw new AppError("CONFLICT", "This payment was already reviewed.");
    await tx.trip.update({ where: { id: input.tripId }, data: { updatedAt: new Date() } });
    await audit(tx, {
      tripId: input.tripId,
      actorUserId: user.id,
      actorMemberId: member.id,
      entityType: "payment",
      entityId: payment.id,
      action: input.decision === "approve" ? "verify" : "reject",
      before: { status: payment.status },
      after: { status, reason: input.reason ?? null },
    });
  });
}

/** The payer can drop a payment they started but never marked as paid. */
export async function cancelPayment(user: CurrentUser, input: { tripId: string; paymentId: string }) {
  const { member } = await requireTripAccess(user.id, input.tripId, "trip.view");
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: input.paymentId, tripId: input.tripId, fromMemberId: member.id, status: "PENDING" } });
    if (!payment) throw new AppError("NOT_FOUND", "Only unfinished payments you started can be cancelled.");
    await tx.payment.delete({ where: { id: payment.id } });
    await audit(tx, { tripId: input.tripId, actorUserId: user.id, actorMemberId: member.id, entityType: "payment", entityId: payment.id, action: "cancel", before: { amountPaise: payment.amountPaise } });
  });
}

/**
 * The receiver records money they got directly (cash, or from a placeholder member who can't sign in).
 * Created as VERIFIED because the receiver is the one confirming it.
 */
export async function recordReceivedPayment(
  user: CurrentUser,
  input: { tripId: string; fromMemberId: string; amount: number; idempotencyKey: string; method: PaymentMethod; note?: string },
) {
  const { trip, member } = await requireTripAccess(user.id, input.tripId, "payment.create");
  assertTripWritable(trip);
  const existing = await db.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const payer = await db.tripMember.findFirst({ where: { id: input.fromMemberId, tripId: trip.id, deletedAt: null } });
  if (!payer || payer.id === member.id) throw new AppError("VALIDATION", "Choose who paid you.");
  const due = await outstandingDue(trip.id, payer.id, member.id);
  if (due <= 0) throw new AppError("CONFLICT", `${payer.displayName} doesn't owe you anything right now.`);
  if (input.amount > due) throw new AppError("VALIDATION", `${payer.displayName} owes you ${formatPaise(due)}. Enter that amount or less.`, { amount: [`Max ${formatPaise(due)}`] });

  return db.$transaction(async (tx) => {
    const now = new Date();
    const payment = await tx.payment.create({
      data: {
        tripId: trip.id,
        fromMemberId: payer.id,
        toMemberId: member.id,
        amountPaise: input.amount,
        method: input.method,
        note: input.note ?? null,
        idempotencyKey: input.idempotencyKey,
        status: "VERIFIED",
        submittedAt: now,
        reviewedAt: now,
        reviewedByMemberId: member.id,
      },
    });
    await tx.trip.update({ where: { id: trip.id }, data: { updatedAt: now } });
    await audit(tx, { tripId: trip.id, actorUserId: user.id, actorMemberId: member.id, entityType: "payment", entityId: payment.id, action: "verify", after: { from: payer.displayName, amountPaise: input.amount, method: input.method, recordedByReceiver: true } });
    return payment;
  });
}
