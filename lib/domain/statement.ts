/**
 * Per-member statement ("hisab") (pure). Every line is signed from the member's point of view:
 *   + paid for the group, + advance given, + settlement sent
 *   − own share of an expense, − advance received (held for the group), − settlement received
 * so the running balance always ends at the same `net` as computeBalances().
 */
import type { Paise } from "./money";

export type TransferKind = "ADVANCE" | "SETTLEMENT";

export interface StatementExpense {
  id: string;
  title: string;
  date: Date;
  payers: readonly { memberId: string; amountPaise: Paise }[];
  splits: readonly { memberId: string; amountPaise: Paise }[];
}

export interface StatementTransfer {
  id: string;
  kind: TransferKind;
  date: Date;
  fromMemberId: string;
  toMemberId: string;
  amountPaise: Paise;
}

export type StatementEntryType = "expense_paid" | "expense_share" | "advance_given" | "advance_received" | "settlement_sent" | "settlement_received";

export interface StatementEntry {
  type: StatementEntryType;
  refId: string;
  date: Date;
  /** Expense title for expense lines. */
  label?: string;
  /** The other member for transfer lines. */
  counterpartyId?: string;
  delta: Paise;
  balance: Paise;
}

export interface StatementTotals {
  paid: Paise;
  share: Paise;
  advancesGiven: Paise;
  advancesReceived: Paise;
  settlementsSent: Paise;
  settlementsReceived: Paise;
  net: Paise;
}

export function memberStatement(memberId: string, expenses: readonly StatementExpense[], transfers: readonly StatementTransfer[]) {
  const lines: Omit<StatementEntry, "balance">[] = [];

  for (const e of expenses) {
    const paid = e.payers.filter((p) => p.memberId === memberId).reduce((s, p) => s + p.amountPaise, 0);
    const share = e.splits.filter((s) => s.memberId === memberId).reduce((s, x) => s + x.amountPaise, 0);
    if (paid) lines.push({ type: "expense_paid", refId: e.id, date: e.date, label: e.title, delta: paid });
    if (share) lines.push({ type: "expense_share", refId: e.id, date: e.date, label: e.title, delta: -share });
  }
  for (const t of transfers) {
    if (t.fromMemberId === memberId) {
      lines.push({ type: t.kind === "ADVANCE" ? "advance_given" : "settlement_sent", refId: t.id, date: t.date, counterpartyId: t.toMemberId, delta: t.amountPaise });
    } else if (t.toMemberId === memberId) {
      lines.push({ type: t.kind === "ADVANCE" ? "advance_received" : "settlement_received", refId: t.id, date: t.date, counterpartyId: t.fromMemberId, delta: -t.amountPaise });
    }
  }

  // Stable: same-day lines keep insertion order (expenses before transfers, paid before share).
  const ordered = lines.map((l, i) => ({ l, i })).sort((a, b) => a.l.date.getTime() - b.l.date.getTime() || a.i - b.i);

  let balance = 0;
  const entries: StatementEntry[] = ordered.map(({ l }) => {
    balance += l.delta;
    return { ...l, balance };
  });

  const sum = (type: StatementEntryType) => Math.abs(lines.filter((l) => l.type === type).reduce((s, l) => s + l.delta, 0));
  const totals: StatementTotals = {
    paid: sum("expense_paid"),
    share: sum("expense_share"),
    advancesGiven: sum("advance_given"),
    advancesReceived: sum("advance_received"),
    settlementsSent: sum("settlement_sent"),
    settlementsReceived: sum("settlement_received"),
    net: balance,
  };
  return { entries, totals };
}
