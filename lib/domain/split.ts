/**
 * Split engine (pure). Turns an expense total + split instructions into per-member paise
 * that ALWAYS add up exactly to the total. Leftover paise are distributed deterministically.
 */
import { isValidPaise, type Paise } from "./money";

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export type SplitInput =
  | { type: "EQUAL"; memberIds: readonly string[] }
  /** value = paise owed */
  | { type: "EXACT"; entries: readonly SplitEntry[] }
  /** value = basis points (1% = 100 bp); must total 10 000 */
  | { type: "PERCENTAGE"; entries: readonly SplitEntry[] }
  /** value = whole number of shares */
  | { type: "SHARES"; entries: readonly SplitEntry[] };

export interface SplitEntry {
  memberId: string;
  value: number;
}

export interface MemberShare {
  memberId: string;
  amountPaise: Paise;
  /** The raw input weight that produced this share (stored for editing later). */
  weight: number;
}

export type SplitError = "INVALID_TOTAL" | "NO_PARTICIPANTS" | "DUPLICATE_MEMBER" | "INVALID_VALUE" | "EXACT_MISMATCH" | "PERCENT_MISMATCH";

export type SplitResult = { ok: true; shares: MemberShare[] } | { ok: false; error: SplitError; difference?: number };

export const FULL_PERCENT_BP = 10_000;
const MAX_SHARES = 1_000;

/**
 * Largest-remainder allocation: floor each proportional share, then hand the leftover paise
 * one by one to the largest fractional remainders (ties → earlier position). Integer math only.
 */
export function allocateByWeights(total: Paise, weights: readonly number[]): Paise[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError("total must be a non-negative integer");
  if (weights.some((w) => !Number.isSafeInteger(w) || w < 0)) throw new RangeError("weights must be non-negative integers");
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) throw new RangeError("at least one weight must be positive");

  const big = BigInt(total);
  const bigSum = BigInt(weightSum);
  const base = weights.map((w) => (big * BigInt(w)) / bigSum);
  const remainders = weights.map((w, i) => ({ i, rem: (big * BigInt(w)) % bigSum }));
  let leftover = Number(big - base.reduce((a, b) => a + b, 0n));
  remainders.sort((x, y) => (x.rem === y.rem ? x.i - y.i : x.rem > y.rem ? -1 : 1));
  const out = base.map(Number);
  for (const { i } of remainders) {
    if (leftover <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    leftover--;
  }
  return out;
}

function hasDuplicates(ids: readonly string[]) {
  return new Set(ids).size !== ids.length;
}

/** Stable canonical order so the same participants always get the same leftover paise. */
function sortEntries(entries: readonly SplitEntry[]): SplitEntry[] {
  return [...entries].sort((a, b) => (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
}

export function computeSplit(totalPaise: Paise, input: SplitInput): SplitResult {
  if (!isValidPaise(totalPaise) || totalPaise <= 0) return { ok: false, error: "INVALID_TOTAL" };

  const entries: SplitEntry[] = input.type === "EQUAL" ? input.memberIds.map((memberId) => ({ memberId, value: 1 })) : [...input.entries];
  if (entries.length === 0) return { ok: false, error: "NO_PARTICIPANTS" };
  if (hasDuplicates(entries.map((e) => e.memberId))) return { ok: false, error: "DUPLICATE_MEMBER" };

  const maxValue = input.type === "EXACT" ? totalPaise : input.type === "PERCENTAGE" ? FULL_PERCENT_BP : MAX_SHARES;
  if (entries.some((e) => !Number.isSafeInteger(e.value) || e.value < 0 || e.value > maxValue)) return { ok: false, error: "INVALID_VALUE" };

  const active = sortEntries(entries.filter((e) => e.value > 0));
  if (active.length === 0) return { ok: false, error: "NO_PARTICIPANTS" };
  const valueSum = active.reduce((a, e) => a + e.value, 0);

  if (input.type === "EXACT") {
    if (valueSum !== totalPaise) return { ok: false, error: "EXACT_MISMATCH", difference: valueSum - totalPaise };
    return { ok: true, shares: active.map((e) => ({ memberId: e.memberId, amountPaise: e.value, weight: e.value })) };
  }
  if (input.type === "PERCENTAGE" && valueSum !== FULL_PERCENT_BP) {
    return { ok: false, error: "PERCENT_MISMATCH", difference: valueSum - FULL_PERCENT_BP };
  }

  const amounts = allocateByWeights(
    totalPaise,
    active.map((e) => e.value),
  );
  return { ok: true, shares: active.map((e, i) => ({ memberId: e.memberId, amountPaise: amounts[i] ?? 0, weight: e.value })) };
}

/** "33.33" → 3333 basis points. Up to 2 decimals, 0–100. */
export function percentToBasisPoints(input: string): number | null {
  const m = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(input.trim());
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return bp <= FULL_PERCENT_BP ? bp : null;
}

export function basisPointsToPercent(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

export interface PayerShare {
  memberId: string;
  amountPaise: Paise;
}

export type PayerResult = { ok: true } | { ok: false; error: "NO_PAYER" | "DUPLICATE_MEMBER" | "INVALID_VALUE" | "PAYER_MISMATCH"; difference?: number };

/** One or more people paid; their amounts must cover the expense exactly. */
export function validatePayers(totalPaise: Paise, payers: readonly PayerShare[]): PayerResult {
  const active = payers.filter((p) => p.amountPaise !== 0);
  if (active.length === 0) return { ok: false, error: "NO_PAYER" };
  if (hasDuplicates(payers.map((p) => p.memberId))) return { ok: false, error: "DUPLICATE_MEMBER" };
  if (payers.some((p) => !isValidPaise(p.amountPaise))) return { ok: false, error: "INVALID_VALUE" };
  const sum = active.reduce((a, p) => a + p.amountPaise, 0);
  if (sum !== totalPaise) return { ok: false, error: "PAYER_MISMATCH", difference: sum - totalPaise };
  return { ok: true };
}
