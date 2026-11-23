import "server-only";
import { cache } from "react";
import { computeBalances, type MemberBalance } from "@/lib/domain/balances";
import { planSettlement, type Transfer } from "@/lib/domain/settlement";
import { db } from "../db";

const expenseInclude = {
  payers: { select: { memberId: true, amountPaise: true } },
  splits: { select: { memberId: true, amountPaise: true, weight: true } },
  attachments: { select: { id: true, fileKey: true, mimeType: true }, orderBy: { createdAt: "asc" } },
  createdBy: { select: { id: true, displayName: true } },
} as const;

export async function listExpenses(tripId: string, take = 40, cursor?: string) {
  const rows = await db.expense.findMany({
    where: { tripId, deletedAt: null },
    include: expenseInclude,
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });
  return { rows: rows.slice(0, take), nextCursor: rows.length > take ? rows[take - 1]?.id : undefined };
}

export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["rows"][number];

export async function getExpense(tripId: string, expenseId: string) {
  return db.expense.findFirst({ where: { id: expenseId, tripId, deletedAt: null }, include: expenseInclude });
}

export interface TripSummary {
  totalSpendPaise: number;
  expenseCount: number;
  balances: MemberBalance[];
  plan: Transfer[];
  coachMemberId: string | null;
  /** Verified advances handed over (the kitty), for the dashboard. */
  advancesPaise: number;
  /** Names for every member that appears in history, including removed ones. */
  names: Record<string, string>;
}

/** Full ledger → balances → settlement plan for a trip. Deduped per request. */
export const getTripSummary = cache(async (tripId: string): Promise<TripSummary> => {
  const [trip, members, expenses, payments] = await Promise.all([
    db.trip.findUniqueOrThrow({ where: { id: tripId }, select: { settlementMode: true } }),
    db.tripMember.findMany({ where: { tripId }, select: { id: true, displayName: true, role: true, deletedAt: true } }),
    db.expense.findMany({ where: { tripId, deletedAt: null }, select: { amountPaise: true, payers: { select: { memberId: true, amountPaise: true } }, splits: { select: { memberId: true, amountPaise: true } } } }),
    db.payment.findMany({ where: { tripId, status: "VERIFIED" }, select: { fromMemberId: true, toMemberId: true, amountPaise: true, kind: true } }),
  ]);
  const active = members.filter((m) => !m.deletedAt);
  const balances = computeBalances(
    active.map((m) => m.id),
    expenses,
    payments,
  );
  const coachMemberId = active.find((m) => m.role === "COACH")?.id ?? null;
  const plan = coachMemberId || trip.settlementMode === "P2P_MINIMIZED" ? planSettlement(trip.settlementMode, balances, coachMemberId ?? "") : [];
  return {
    totalSpendPaise: expenses.reduce((s, e) => s + e.amountPaise, 0),
    expenseCount: expenses.length,
    advancesPaise: payments.filter((p) => p.kind === "ADVANCE").reduce((s, p) => s + p.amountPaise, 0),
    balances,
    plan,
    coachMemberId,
    names: Object.fromEntries(members.map((m) => [m.id, m.displayName])),
  };
});
