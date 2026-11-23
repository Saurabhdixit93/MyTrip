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
export function buildUpiLink(params: UpiLinkParams): string {
  return `upi://pay?${buildUpiQuery(params)}`;
}

/** The encoded query (pa, pn, am, cu, tn) shared by every UPI link variant. */
export function buildUpiQuery({ vpa, payeeName, amountPaise, note }: UpiLinkParams): string {
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
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

export type UpiPlatform = "android" | "ios" | "desktop";
export type UpiApp = "any" | "gpay" | "phonepe" | "paytm";

const ANDROID_PACKAGES: Record<Exclude<UpiApp, "any">, string> = {
  gpay: "com.google.android.apps.nbu.paisa.user",
  phonepe: "com.phonepe.app",
  paytm: "net.one97.paytm",
};
const IOS_SCHEMES: Record<Exclude<UpiApp, "any">, (q: string) => string> = {
  gpay: (q) => `gpay://upi/pay?${q}`,
  phonepe: (q) => `phonepe://pay?${q}`,
  paytm: (q) => `paytmmp://pay?${q}`,
};

/**
 * One-tap links into installed UPI apps with the amount pre-filled.
 * Android: `upi://` opens the system chooser; package-targeted `intent://` links open one app.
 * iOS: there is no chooser, so each app has its own URL scheme (generic upi:// kept as fallback).
 * Desktop: none (a QR is shown instead).
 */
export function buildUpiAppLinks(params: UpiLinkParams, platform: UpiPlatform): { app: UpiApp; href: string }[] {
  if (platform === "desktop") return [];
  const q = buildUpiQuery(params);
  const apps = ["gpay", "phonepe", "paytm"] as const;
  if (platform === "android") {
    return [{ app: "any", href: `upi://pay?${q}` }, ...apps.map((app) => ({ app, href: `intent://pay?${q}#Intent;scheme=upi;package=${ANDROID_PACKAGES[app]};end` }))];
  }
  return [...apps.map((app) => ({ app, href: IOS_SCHEMES[app](q) })), { app: "any", href: `upi://pay?${q}` }];
}

/** Reads a UPI QR / link payload (`upi://pay?pa=…&pn=…&am=…`). Null when it isn't a valid UPI payment request. */
export function parseUpiUri(text: string): { vpa: string; payeeName: string | null; amountPaise: number | null } | null {
  const raw = text.trim();
  if (!/^upi:\/\/pay\?/i.test(raw)) return null;
  const params = new URLSearchParams(raw.slice(raw.indexOf("?") + 1));
  const pa = params.get("pa");
  if (!pa || !isValidVpa(pa)) return null;
  const am = params.get("am");
  const amountPaise = am && /^\d+(\.\d{1,2})?$/.test(am) ? Math.round(Number(am.split(".")[0]) * 100 + Number((am.split(".")[1] ?? "").padEnd(2, "0"))) : null;
  return { vpa: normalizeVpa(pa), payeeName: params.get("pn")?.trim() || null, amountPaise };
}

/** 12-digit UPI transaction reference (UTR / RRN). */
export const UTR_REGEX = /^\d{12}$/;
