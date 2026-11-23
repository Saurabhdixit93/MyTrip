import "server-only";
import { memberStatement, type StatementExpense, type StatementTransfer } from "@/lib/domain/statement";
import { db } from "../db";

export async function listAdvances(tripId: string) {
  return db.payment.findMany({
    where: { tripId, kind: "ADVANCE" },
    include: {
      from: { select: { id: true, displayName: true } },
      to: { select: { id: true, displayName: true } },
      reviewedBy: { select: { displayName: true } },
    },
    orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}

export type AdvanceRow = Awaited<ReturnType<typeof listAdvances>>[number];

/** Ledger inputs for statements: live expenses + VERIFIED transfers (advances and settlements). */
async function ledger(tripId: string) {
  const [expenses, payments] = await Promise.all([
    db.expense.findMany({
      where: { tripId, deletedAt: null },
      select: { id: true, title: true, spentAt: true, payers: { select: { memberId: true, amountPaise: true } }, splits: { select: { memberId: true, amountPaise: true } } },
      orderBy: [{ spentAt: "asc" }, { createdAt: "asc" }],
    }),
    db.payment.findMany({
      where: { tripId, status: "VERIFIED" },
      select: { id: true, kind: true, paidOn: true, reviewedAt: true, createdAt: true, fromMemberId: true, toMemberId: true, amountPaise: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const exps: StatementExpense[] = expenses.map((e) => ({ id: e.id, title: e.title, date: e.spentAt, payers: e.payers, splits: e.splits }));
  const transfers: StatementTransfer[] = payments.map((p) => ({
    id: p.id,
    kind: p.kind,
    date: p.paidOn ?? p.reviewedAt ?? p.createdAt,
    fromMemberId: p.fromMemberId,
    toMemberId: p.toMemberId,
    amountPaise: p.amountPaise,
  }));
  return { exps, transfers };
}

export async function getMemberStatement(tripId: string, memberId: string) {
  const { exps, transfers } = await ledger(tripId);
  return memberStatement(memberId, exps, transfers);
}
