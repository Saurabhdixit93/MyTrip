/**
 * Money helpers. All amounts are integer paise (1 ₹ = 100 paise). Never floats.
 * Pure: no React / DB imports.
 */

export type Paise = number;

/** ₹1,00,00,000 per single amount. Keeps sums far below Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT_PAISE: Paise = 10_000_000_00;

export function isValidPaise(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_PAISE;
}

/**
 * Parses user input in rupees ("1,234.5", "₹ 99", "0.05") into paise using string math only.
 * Returns null for anything that isn't a non-negative amount with at most 2 decimals.
 */
export function parseRupeesToPaise(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  const m = /^(\d{1,12})(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!m) return null;
  const rupees = m[1] ?? "0";
  const fraction = (m[2] ?? "").padEnd(2, "0");
  const paise = Number(rupees) * 100 + Number(fraction);
  return isValidPaise(paise) ? paise : null;
}

/** "1234.50": plain 2-decimal rupee string (UPI `am` param, CSV). No grouping, no symbol. */
export function paiseToRupeeString(paise: Paise): string {
  if (!Number.isSafeInteger(paise)) throw new RangeError("paise must be a safe integer");
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function sumPaise(values: readonly Paise[]): Paise {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
