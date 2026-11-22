import "server-only";
import { db } from "../db";

export async function listPayments(tripId: string) {
  return db.payment.findMany({
    where: { tripId },
    include: {
      from: { select: { id: true, displayName: true } },
      to: { select: { id: true, displayName: true } },
      reviewedBy: { select: { displayName: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];

/** Payments waiting for this member's decision (as receiver, or any if they can review all). */
export async function countToReview(tripId: string, memberId: string, canReviewAny: boolean) {
  return db.payment.count({
    where: { tripId, status: "PAID_AWAITING_APPROVAL", fromMemberId: { not: memberId }, ...(canReviewAny ? {} : { toMemberId: memberId }) },
  });
}

/** Amounts I've marked as paid that the receiver hasn't verified yet, keyed by receiver. */
export async function myAwaitingByPayee(tripId: string, memberId: string) {
  const rows = await db.payment.groupBy({
    by: ["toMemberId"],
    where: { tripId, fromMemberId: memberId, status: "PAID_AWAITING_APPROVAL" },
    _sum: { amountPaise: true },
  });
  return Object.fromEntries(rows.map((r) => [r.toMemberId, r._sum.amountPaise ?? 0]));
}

export async function myOpenIntents(tripId: string, memberId: string) {
  return db.payment.findMany({ where: { tripId, fromMemberId: memberId, status: "PENDING" }, include: { to: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } });
}

/** Amounts others marked as paid to me that I haven't verified yet, keyed by payer. */
export async function awaitingToMeByPayer(tripId: string, memberId: string) {
  const rows = await db.payment.groupBy({
    by: ["fromMemberId"],
    where: { tripId, toMemberId: memberId, status: "PAID_AWAITING_APPROVAL" },
    _sum: { amountPaise: true },
  });
  return Object.fromEntries(rows.map((r) => [r.fromMemberId, r._sum.amountPaise ?? 0]));
}
