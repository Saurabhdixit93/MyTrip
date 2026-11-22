/**
 * UPI helpers (pure). MyTrip never processes payments; it only builds NPCI-style
 * `upi://pay` intents and QR payloads with the exact amount pre-filled.
 */
import { isValidPaise, paiseToRupeeString, type Paise } from "@/lib/domain/money";

export const VPA_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/** Payee name / note limits that UPI apps reliably accept. */
const MAX_PAYEE_NAME = 50;
const MAX_NOTE = 50;

export function normalizeVpa(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidVpa(input: string): boolean {
  return VPA_REGEX.test(input.trim());
}

export interface UpiLinkParams {
  vpa: string;
  payeeName: string;
  amountPaise: Paise;
  note: string;
}

/**
 * Keeps only letters, digits, spaces and basic punctuation (UPI apps reject emoji, &, =, #, % …),
 * then trims to a max length.
 */
export function sanitizeUpiText(text: string, max: number): string {
  return text
    .replace(/[^\p{L}\p{M}\p{N} .,\-_/()@']/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/**
 * upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 * Every param is URL-encoded; amount always has exactly 2 decimals.
 */
export function buildUpiLink({ vpa, payeeName, amountPaise, note }: UpiLinkParams): string {
  const pa = normalizeVpa(vpa);
  if (!isValidVpa(pa)) throw new Error("Invalid UPI ID");
  if (!isValidPaise(amountPaise) || amountPaise <= 0) throw new Error("Amount must be a positive number of paise");
  const params: [string, string][] = [
    ["pa", pa],
    ["pn", sanitizeUpiText(payeeName, MAX_PAYEE_NAME) || "MyTrip Coach"],
    ["am", paiseToRupeeString(amountPaise)],
    ["cu", "INR"],
    ["tn", sanitizeUpiText(note, MAX_NOTE) || "MyTrip settlement"],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}

/** 12-digit UPI transaction reference (UTR / RRN). */
export const UTR_REGEX = /^\d{12}$/;
