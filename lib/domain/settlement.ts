/**
 * Settlement planning (pure).
 * - P2P_MINIMIZED: greedy debt simplification (exact matches first, then largest debtor ↔ largest
 *   creditor). Guarantees ≤ n−1 transfers; the true minimum is NP-hard, this is the standard heuristic.
 * - PAY_COACH: every debtor pays the Coach, the Coach pays every creditor.
 */
import type { Paise } from "./money";

export type SettlementMode = "PAY_COACH" | "P2P_MINIMIZED";

export interface NetBalance {
  memberId: string;
  net: Paise;
}

export interface Transfer {
  from: string;
  to: string;
  amountPaise: Paise;
}

interface Party {
  memberId: string;
  amount: Paise;
}

/** Largest amount first, then member id: same input set → same plan, regardless of order. */
function byAmountThenId(a: Party, b: Party) {
  return b.amount - a.amount || (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0);
}

function assertBalanced(nets: readonly NetBalance[]) {
  const total = nets.reduce((s, n) => s + n.net, 0);
  if (total !== 0) throw new Error(`Balances must sum to zero (got ${total})`);
  if (nets.some((n) => !Number.isSafeInteger(n.net))) throw new Error("Balances must be integer paise");
}

function split(nets: readonly NetBalance[]) {
  const debtors: Party[] = [];
  const creditors: Party[] = [];
  for (const n of nets) {
    if (n.net < 0) debtors.push({ memberId: n.memberId, amount: -n.net });
    else if (n.net > 0) creditors.push({ memberId: n.memberId, amount: n.net });
  }
  return { debtors: debtors.sort(byAmountThenId), creditors: creditors.sort(byAmountThenId) };
}

export function simplifyDebts(nets: readonly NetBalance[]): Transfer[] {
  assertBalanced(nets);
  const { debtors, creditors } = split(nets);
  const transfers: Transfer[] = [];

  // Pass 1: a debtor who owes exactly what a creditor is owed settles in one transfer.
  for (const d of debtors) {
    const c = creditors.find((x) => x.amount > 0 && x.amount === d.amount);
    if (c) {
      transfers.push({ from: d.memberId, to: c.memberId, amountPaise: d.amount });
      c.amount = 0;
      d.amount = 0;
    }
  }

  // Pass 2: greedy largest-with-largest.
  for (;;) {
    const d = debtors.filter((x) => x.amount > 0).sort(byAmountThenId)[0];
    const c = creditors.filter((x) => x.amount > 0).sort(byAmountThenId)[0];
    if (!d || !c) break;
    const amount = Math.min(d.amount, c.amount);
    transfers.push({ from: d.memberId, to: c.memberId, amountPaise: amount });
    d.amount -= amount;
    c.amount -= amount;
  }
  return transfers;
}

export function settleViaCoach(nets: readonly NetBalance[], coachId: string): Transfer[] {
  assertBalanced(nets);
  const others = nets.filter((n) => n.memberId !== coachId);
  const { debtors, creditors } = split(others);
  return [
    ...debtors.map((d) => ({ from: d.memberId, to: coachId, amountPaise: d.amount })),
    ...creditors.map((c) => ({ from: coachId, to: c.memberId, amountPaise: c.amount })),
  ];
}

export function planSettlement(mode: SettlementMode, nets: readonly NetBalance[], coachId: string): Transfer[] {
  return mode === "PAY_COACH" ? settleViaCoach(nets, coachId) : simplifyDebts(nets);
}
