import { parseRupeesToPaise, paiseToRupeeString } from "@/lib/domain/money";
import { basisPointsToPercent, computeSplit, FULL_PERCENT_BP, percentToBasisPoints, validatePayers, type SplitType } from "@/lib/domain/split";
import type { Allocation } from "@/lib/validation/expense";

export interface Member {
  id: string;
  displayName: string;
}

export interface SplitState {
  type: SplitType;
  participants: string[];
  exact: Record<string, string>;
  percent: Record<string, string>;
  shares: Record<string, string>;
}

export interface PayerState {
  multiple: boolean;
  single: string;
  amounts: Record<string, string>;
}

export interface Preview {
  /** Per-member computed paise (only when the split is valid). */
  shares: Record<string, number>;
  /** Human-facing problem, or null when valid. */
  problem: { key: "leftToAssign" | "overAssigned" | "percentLeft" | "percentOver" | "payersLeft" | "payersOver" | "pickSomeone" | "enterAmount"; value?: number } | null;
  allocation: Allocation | null;
}

export function initialSplitState(members: Member[], existing?: { type: SplitType; splits: { memberId: string; amountPaise: number; weight: number }[] }): SplitState {
  const all = members.map((m) => m.id);
  const state: SplitState = { type: existing?.type ?? "EQUAL", participants: all, exact: {}, percent: {}, shares: Object.fromEntries(all.map((id) => [id, "1"])) };
  if (!existing) return state;
  const involved = existing.splits.map((s) => s.memberId);
  state.participants = involved;
  for (const s of existing.splits) {
    state.exact[s.memberId] = paiseToRupeeString(s.amountPaise);
    if (existing.type === "PERCENTAGE") state.percent[s.memberId] = basisPointsToPercent(s.weight);
    if (existing.type === "SHARES") state.shares[s.memberId] = String(s.weight);
  }
  if (existing.type !== "SHARES") for (const id of all) state.shares[id] = involved.includes(id) ? "1" : "0";
  return state;
}

const intOrZero = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v.trim()) : 0);

/** Builds the allocation the server expects, and a live preview / validation message. */
export function buildPreview(totalPaise: number | null, members: Member[], split: SplitState, payers: PayerState): Preview {
  if (!totalPaise || totalPaise <= 0) return { shares: {}, problem: { key: "enterAmount" }, allocation: null };

  const payerList = payers.multiple
    ? members.map((m) => ({ memberId: m.id, amountPaise: parseRupeesToPaise(payers.amounts[m.id] ?? "") ?? 0 })).filter((p) => p.amountPaise > 0)
    : [{ memberId: payers.single, amountPaise: totalPaise }];

  let splitAlloc: Allocation["split"];
  if (split.type === "EQUAL") {
    if (split.participants.length === 0) return { shares: {}, problem: { key: "pickSomeone" }, allocation: null };
    splitAlloc = { type: "EQUAL", memberIds: split.participants };
  } else {
    const value = (id: string) =>
      split.type === "EXACT" ? (parseRupeesToPaise(split.exact[id] ?? "") ?? 0) : split.type === "PERCENTAGE" ? (percentToBasisPoints(split.percent[id] ?? "") ?? 0) : intOrZero(split.shares[id]);
    splitAlloc = { type: split.type, entries: members.map((m) => ({ memberId: m.id, value: value(m.id) })) };
  }

  const result = computeSplit(totalPaise, splitAlloc.type === "EQUAL" ? { type: "EQUAL", memberIds: splitAlloc.memberIds } : { type: splitAlloc.type, entries: splitAlloc.entries });
  if (!result.ok) {
    const diff = result.difference ?? 0;
    if (result.error === "EXACT_MISMATCH") return { shares: {}, problem: { key: diff < 0 ? "leftToAssign" : "overAssigned", value: Math.abs(diff) }, allocation: null };
    if (result.error === "PERCENT_MISMATCH") return { shares: {}, problem: { key: diff < 0 ? "percentLeft" : "percentOver", value: Math.abs(diff) }, allocation: null };
    return { shares: {}, problem: { key: "pickSomeone" }, allocation: null };
  }
  const shares = Object.fromEntries(result.shares.map((s) => [s.memberId, s.amountPaise]));

  const payerCheck = validatePayers(totalPaise, payerList);
  if (!payerCheck.ok) {
    const diff = payerCheck.difference ?? -totalPaise;
    return { shares, problem: { key: diff < 0 ? "payersLeft" : "payersOver", value: Math.abs(diff) }, allocation: null };
  }
  return { shares, problem: null, allocation: { payers: payerList, split: splitAlloc } };
}

export { FULL_PERCENT_BP };
