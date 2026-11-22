/** Where a trip is in time, from @db.Date start/end (UTC midnight) and today's date (yyyy-mm-dd). Pure. */
export type TripPhase = { kind: "upcoming"; days: number } | { kind: "ongoing"; day: number; total: number } | { kind: "ended" } | null;

const DAY = 86_400_000;

export function tripPhase(start: Date | null, end: Date | null, todayIso: string): TripPhase {
  if (!start) return null;
  const today = Date.parse(`${todayIso}T00:00:00.000Z`);
  const s = start.getTime();
  const e = (end ?? start).getTime();
  if (today < s) return { kind: "upcoming", days: Math.round((s - today) / DAY) };
  if (today <= e) return { kind: "ongoing", day: Math.round((today - s) / DAY) + 1, total: Math.round((e - s) / DAY) + 1 };
  return { kind: "ended" };
}
