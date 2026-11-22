import { describe, expect, it } from "vitest";
import { tripPhase } from "@/lib/trip-phase";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("tripPhase", () => {
  it("is null without a start date", () => expect(tripPhase(null, null, "2026-12-01")).toBeNull());
  it("counts days until the trip", () => {
    expect(tripPhase(d("2026-12-20"), d("2026-12-24"), "2026-12-01")).toEqual({ kind: "upcoming", days: 19 });
    expect(tripPhase(d("2026-12-20"), d("2026-12-24"), "2026-12-19")).toEqual({ kind: "upcoming", days: 1 });
  });
  it("reports the current day during the trip", () => {
    expect(tripPhase(d("2026-12-20"), d("2026-12-24"), "2026-12-20")).toEqual({ kind: "ongoing", day: 1, total: 5 });
    expect(tripPhase(d("2026-12-20"), d("2026-12-24"), "2026-12-24")).toEqual({ kind: "ongoing", day: 5, total: 5 });
    expect(tripPhase(d("2026-12-20"), null, "2026-12-20")).toEqual({ kind: "ongoing", day: 1, total: 1 });
  });
  it("ends after the last day", () => expect(tripPhase(d("2026-12-20"), d("2026-12-24"), "2026-12-25")).toEqual({ kind: "ended" }));
});
