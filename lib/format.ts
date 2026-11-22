const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** ₹1,23,456.00 — paise in, display string out. UI layer only. */
export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

/** ₹1,23,456 (no decimals) for headlines and charts. */
export function formatPaiseCompact(paise: number): string {
  return inrCompact.format(Math.round(paise / 100));
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatShortDate = (d: Date) => shortDateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);

/** yyyy-mm-dd for <input type="date"> from a @db.Date value. */
export const toDateInput = (d: Date) => d.toISOString().slice(0, 10);

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** Today's date (yyyy-mm-dd) in India, for default form values. */
export function todayInIndia(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}
