/**
 * Net balances (pure). net > 0 → the group owes this member; net < 0 → this member owes.
 * Only VERIFIED payments should be passed in; pending ones don't move money yet.
 */
import type { Paise } from "./money";

export interface LedgerExpense {
  payers: readonly { memberId: string; amountPaise: Paise }[];
  splits: readonly { memberId: string; amountPaise: Paise }[];
}

export interface LedgerPayment {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: Paise;
}

export interface MemberBalance {
  memberId: string;
  /** Total this member paid for expenses. */
  paid: Paise;
  /** This member's share of expenses. */
  owed: Paise;
  /** Settlement payments this member sent / received. */
  sent: Paise;
  received: Paise;
  net: Paise;
}

export function computeBalances(memberIds: readonly string[], expenses: readonly LedgerExpense[], payments: readonly LedgerPayment[]): MemberBalance[] {
  const map = new Map<string, MemberBalance>();
  const get = (memberId: string) => {
    let b = map.get(memberId);
    if (!b) {
      b = { memberId, paid: 0, owed: 0, sent: 0, received: 0, net: 0 };
      map.set(memberId, b);
    }
    return b;
  };
  for (const id of memberIds) get(id);
  for (const e of expenses) {
    for (const p of e.payers) get(p.memberId).paid += p.amountPaise;
    for (const s of e.splits) get(s.memberId).owed += s.amountPaise;
  }
  for (const p of payments) {
    get(p.fromMemberId).sent += p.amountPaise;
    get(p.toMemberId).received += p.amountPaise;
  }
  for (const b of map.values()) b.net = b.paid - b.owed + b.sent - b.received;
  return [...map.values()];
}
