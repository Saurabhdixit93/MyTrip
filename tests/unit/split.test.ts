import { describe, expect, it } from "vitest";
import { allocateByWeights, computeSplit, percentToBasisPoints, validatePayers } from "@/lib/domain/split";

const sum = (xs: { amountPaise: number }[]) => xs.reduce((a, b) => a + b.amountPaise, 0);
const byId = (xs: { memberId: string; amountPaise: number }[]) => Object.fromEntries(xs.map((x) => [x.memberId, x.amountPaise]));

describe("allocateByWeights (largest remainder)", () => {
  it("splits exactly when divisible", () => {
    expect(allocateByWeights(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  it("gives leftover paise to the largest fractional parts, ties by position", () => {
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateByWeights(101, [1, 1, 1])).toEqual([34, 34, 33]);
    expect(allocateByWeights(10, [1, 2])).toEqual([3, 7]);
  });

  it("always sums to the total", () => {
    for (let total = 0; total < 500; total += 7) {
      const weights = [3, 1, 4, 1, 5, 9, 2, 6];
      expect(allocateByWeights(total, weights).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it("handles zero weights", () => {
    expect(allocateByWeights(100, [0, 1, 0])).toEqual([0, 100, 0]);
  });

  it("rejects invalid weights", () => {
    expect(() => allocateByWeights(100, [0, 0])).toThrow();
    expect(() => allocateByWeights(100, [-1, 2])).toThrow();
    expect(() => allocateByWeights(100, [1.5])).toThrow();
  });
});

describe("computeSplit", () => {
  it("EQUAL splits among participants and is order-independent", () => {
    const a = computeSplit(100, { type: "EQUAL", memberIds: ["c", "a", "b"] });
    const b = computeSplit(100, { type: "EQUAL", memberIds: ["b", "c", "a"] });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(byId(a.shares)).toEqual({ a: 34, b: 33, c: 33 });
    expect(byId(a.shares)).toEqual(byId(b.shares));
    expect(sum(a.shares)).toBe(100);
  });

  it("EQUAL with excluded members just leaves them out", () => {
    const r = computeSplit(240000, { type: "EQUAL", memberIds: ["rahul", "priya", "dev"] });
    expect(r.ok && byId(r.shares)).toEqual({ rahul: 80000, priya: 80000, dev: 80000 });
  });

  it("EXACT must add up to the total", () => {
    const ok = computeSplit(1000, { type: "EXACT", entries: [{ memberId: "a", value: 600 }, { memberId: "b", value: 400 }] });
    expect(ok.ok && byId(ok.shares)).toEqual({ a: 600, b: 400 });
    const bad = computeSplit(1000, { type: "EXACT", entries: [{ memberId: "a", value: 600 }, { memberId: "b", value: 300 }] });
    expect(bad).toEqual({ ok: false, error: "EXACT_MISMATCH", difference: -100 });
  });

  it("EXACT allows zero for someone in the list", () => {
    const r = computeSplit(500, { type: "EXACT", entries: [{ memberId: "a", value: 500 }, { memberId: "b", value: 0 }] });
    expect(r.ok && byId(r.shares)).toEqual({ a: 500 });
  });

  it("PERCENTAGE uses basis points and must total 100%", () => {
    const r = computeSplit(1001, {
      type: "PERCENTAGE",
      entries: [
        { memberId: "a", value: 5000 },
        { memberId: "b", value: 2500 },
        { memberId: "c", value: 2500 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sum(r.shares)).toBe(1001);
    expect(byId(r.shares)).toEqual({ a: 501, b: 250, c: 250 });
    const bad = computeSplit(1000, { type: "PERCENTAGE", entries: [{ memberId: "a", value: 3333 }, { memberId: "b", value: 3333 }, { memberId: "c", value: 3333 }] });
    expect(bad).toEqual({ ok: false, error: "PERCENT_MISMATCH", difference: -1 });
  });

  it("SHARES splits proportionally", () => {
    const r = computeSplit(1000, { type: "SHARES", entries: [{ memberId: "couple", value: 2 }, { memberId: "solo", value: 1 }] });
    expect(r.ok && byId(r.shares)).toEqual({ couple: 667, solo: 333 });
  });

  it("drops members with zero weight and records weights", () => {
    const r = computeSplit(300, { type: "SHARES", entries: [{ memberId: "a", value: 1 }, { memberId: "b", value: 0 }, { memberId: "c", value: 2 }] });
    expect(r.ok && r.shares).toEqual([
      { memberId: "a", amountPaise: 100, weight: 1 },
      { memberId: "c", amountPaise: 200, weight: 2 },
    ]);
  });

  it("rejects empty, duplicate and invalid input", () => {
    expect(computeSplit(100, { type: "EQUAL", memberIds: [] })).toEqual({ ok: false, error: "NO_PARTICIPANTS" });
    expect(computeSplit(100, { type: "EQUAL", memberIds: ["a", "a"] })).toEqual({ ok: false, error: "DUPLICATE_MEMBER" });
    expect(computeSplit(100, { type: "SHARES", entries: [{ memberId: "a", value: 0 }] })).toEqual({ ok: false, error: "NO_PARTICIPANTS" });
    expect(computeSplit(100, { type: "SHARES", entries: [{ memberId: "a", value: -1 }] })).toEqual({ ok: false, error: "INVALID_VALUE" });
    expect(computeSplit(0, { type: "EQUAL", memberIds: ["a"] })).toEqual({ ok: false, error: "INVALID_TOTAL" });
    expect(computeSplit(10.5, { type: "EQUAL", memberIds: ["a"] })).toEqual({ ok: false, error: "INVALID_TOTAL" });
  });

  it("property: every split type sums exactly to the total", () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 2000; i++) {
      const total = 1 + rand(10_000_000);
      const n = 1 + rand(12);
      const ids = Array.from({ length: n }, (_, k) => `m${k}`);
      const eq = computeSplit(total, { type: "EQUAL", memberIds: ids });
      const sh = computeSplit(total, { type: "SHARES", entries: ids.map((id) => ({ memberId: id, value: 1 + rand(5) })) });
      expect(eq.ok && sum(eq.shares)).toBe(total);
      expect(sh.ok && sum(sh.shares)).toBe(total);
      // equal shares never differ by more than one paisa
      if (eq.ok) {
        const amounts = eq.shares.map((s) => s.amountPaise);
        expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("percentToBasisPoints", () => {
  it.each([
    ["50", 5000],
    ["33.33", 3333],
    ["0.5", 50],
    ["100", 10000],
  ])("%s%% → %i bp", (input, bp) => {
    expect(percentToBasisPoints(input)).toBe(bp);
  });
  it.each(["", "-1", "100.01", "1.234", "abc"])("rejects %s", (input) => {
    expect(percentToBasisPoints(input)).toBeNull();
  });
});

describe("validatePayers", () => {
  it("accepts payers that cover the total", () => {
    expect(validatePayers(1000, [{ memberId: "a", amountPaise: 700 }, { memberId: "b", amountPaise: 300 }])).toEqual({ ok: true });
  });
  it("rejects mismatches, duplicates and empties", () => {
    expect(validatePayers(1000, [{ memberId: "a", amountPaise: 900 }])).toEqual({ ok: false, error: "PAYER_MISMATCH", difference: -100 });
    expect(validatePayers(1000, [])).toEqual({ ok: false, error: "NO_PAYER" });
    expect(validatePayers(1000, [{ memberId: "a", amountPaise: 500 }, { memberId: "a", amountPaise: 500 }])).toEqual({ ok: false, error: "DUPLICATE_MEMBER" });
    expect(validatePayers(1000, [{ memberId: "a", amountPaise: -1 }, { memberId: "b", amountPaise: 1001 }])).toEqual({ ok: false, error: "INVALID_VALUE" });
  });
});
