/**
 * Well-known UPI handles (the part after "@"). Used only for a soft "did you mean…?" warning:
 * new handles appear regularly, so an unknown handle is never blocked.
 */
export const KNOWN_UPI_HANDLES = new Set([
  // Google Pay
  "okhdfcbank", "okicici", "oksbi", "okaxis",
  // PhonePe
  "ybl", "ibl", "axl",
  // Paytm
  "paytm", "ptyes", "ptaxis", "pthdfc", "ptsbi",
  // BHIM / NPCI and Amazon Pay
  "upi", "apl", "yapl", "rapl",
  // WhatsApp, CRED, Mobikwik, Freecharge, Navi, super.money, Jupiter, Fi, slice, Airtel, Jio
  "waaxis", "wahdfcbank", "wasbi", "waicici", "axisb", "yesbankltd", "ikwik", "freecharge", "naviaxis", "superyes", "jupiteraxis", "fifederal", "fam", "slc", "airtel", "jio", "pingpay", "kmbl", "tapicici", "abfspay", "timecosmos", "goaxb", "kaypay",
  // Banks' own apps
  "sbi", "hdfcbank", "icici", "axisbank", "kotak", "yesbank", "idfcbank", "idfcfirst", "indus", "federal", "fbl", "pnb", "barodampay", "boi", "cnrb", "unionbankofindia", "uboi", "ubi", "centralbank", "cbin", "mahb", "iob", "indianbank", "idbi", "aubank", "dbs", "hsbc", "sc", "citi", "rbl", "dlb", "equitas", "ujjivan", "jkb", "kvb", "cub", "tmb", "csbpay", "kbl", "pockets", "aubankltd",
]);

export function upiHandle(vpa: string): string {
  return vpa.trim().toLowerCase().split("@")[1] ?? "";
}

export function isKnownUpiHandle(vpa: string): boolean {
  return KNOWN_UPI_HANDLES.has(upiHandle(vpa));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) (dp[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const row = dp[i] as number[];
      const prev = dp[i - 1] as number[];
      row[j] = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return (dp[a.length] as number[])[b.length] ?? 0;
}

/** Closest known handle for a likely typo (e.g. "okhdfc" → "okhdfcbank"), or null. */
export function suggestUpiHandle(vpa: string): string | null {
  const handle = upiHandle(vpa);
  if (!handle || KNOWN_UPI_HANDLES.has(handle)) return null;
  let best: { h: string; d: number } | null = null;
  for (const h of KNOWN_UPI_HANDLES) {
    // Prefix matches ("okhdfc" → "okhdfcbank") count as close.
    const d = h.startsWith(handle) && handle.length >= 3 ? 1 : editDistance(handle, h);
    if (!best || d < best.d) best = { h, d };
  }
  return best && best.d <= 2 ? best.h : null;
}
