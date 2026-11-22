import { describe, expect, it } from "vitest";
import { computeBalances } from "@/lib/domain/balances";
import { planSettlement, settleViaCoach, simplifyDebts, type Transfer } from "@/lib/domain/settlement";

function apply(nets: Record<string, number>, transfers: Transfer[]) {
  const out = { ...nets };
  for (const t of transfers) {
    out[t.from] = (out[t.from] ?? 0) + t.amountPaise;
    out[t.to] = (out[t.to] ?? 0) - t.amountPaise;
  }
  return out;
}

describe("computeBalances", () => {
  it("nets paid vs owed and verified payments; total is zero", () => {
    const balances = computeBalances(
      ["a", "b", "c"],
      [
        { payers: [{ memberId: "a", amountPaise: 3000 }], splits: [{ memberId: "a", amountPaise: 1000 }, { memberId: "b", amountPaise: 1000 }, { memberId: "c", amountPaise: 1000 }] },
        { payers: [{ memberId: "b", amountPaise: 600 }], splits: [{ memberId: "b", amountPaise: 300 }, { memberId: "c", amountPaise: 300 }] },
      ],
      [{ fromMemberId: "c", toMemberId: "a", amountPaise: 500 }],
    );
    const net = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(net).toEqual({ a: 1500, b: -700, c: -800 });
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0);
    const c = balances.find((b) => b.memberId === "c");
    expect(c).toMatchObject({ paid: 0, owed: 1300, sent: 500, received: 0 });
  });

  it("includes members that appear only in history (e.g. removed later)", () => {
    const balances = computeBalances(["a"], [{ payers: [{ memberId: "a", amountPaise: 100 }], splits: [{ memberId: "x", amountPaise: 100 }] }], []);
    expect(balances.map((b) => b.memberId).sort()).toEqual(["a", "x"]);
  });
});

describe("simplifyDebts", () => {
  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts([{ memberId: "a", net: 0 }, { memberId: "b", net: 0 }])).toEqual([]);
  });

  it("settles a simple chain with fewer transfers", () => {
    // a owes b 100, b owes c 100 → a pays c directly
    const t = simplifyDebts([
      { memberId: "a", net: -100 },
      { memberId: "b", net: 0 },
      { memberId: "c", net: 100 },
    ]);
    expect(t).toEqual([{ from: "a", to: "c", amountPaise: 100 }]);
  });

  it("prefers exact matches", () => {
    const t = simplifyDebts([
      { memberId: "a", net: -500 },
      { memberId: "b", net: -300 },
      { memberId: "c", net: 300 },
      { memberId: "d", net: 500 },
    ]);
    expect(t).toHaveLength(2);
    expect(t).toContainEqual({ from: "a", to: "d", amountPaise: 500 });
    expect(t).toContainEqual({ from: "b", to: "c", amountPaise: 300 });
  });

  it("throws if balances don't sum to zero", () => {
    expect(() => simplifyDebts([{ memberId: "a", net: -1 }])).toThrow();
  });

  it("property: settles everyone, ≤ n-1 transfers, positive amounts, deterministic", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 1000; i++) {
      const n = 2 + rand(15);
      const nets: { memberId: string; net: number }[] = [];
      let running = 0;
      for (let k = 0; k < n - 1; k++) {
        const v = rand(2_000_000) - 1_000_000;
        nets.push({ memberId: `m${k}`, net: v });
        running += v;
      }
      nets.push({ memberId: `m${n - 1}`, net: -running });
      const transfers = simplifyDebts(nets);
      const nonZero = nets.filter((x) => x.net !== 0).length;
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
      for (const t of transfers) {
        expect(t.amountPaise).toBeGreaterThan(0);
        expect(Number.isInteger(t.amountPaise)).toBe(true);
        expect(t.from).not.toBe(t.to);
      }
      const after = apply(Object.fromEntries(nets.map((x) => [x.memberId, x.net])), transfers);
      expect(Object.values(after).every((v) => v === 0)).toBe(true);
      expect(simplifyDebts([...nets].reverse())).toEqual(transfers);
    }
  });
});

describe("settleViaCoach", () => {
  it("routes every debt to the coach and every credit from the coach", () => {
    const t = settleViaCoach(
      [
        { memberId: "coach", net: 2000 },
        { memberId: "a", net: -1500 },
        { memberId: "b", net: 700 },
        { memberId: "c", net: -1200 },
      ],
      "coach",
    );
    expect(t).toEqual([
      { from: "a", to: "coach", amountPaise: 1500 },
      { from: "c", to: "coach", amountPaise: 1200 },
      { from: "coach", to: "b", amountPaise: 700 },
    ]);
  });

  it("settles everyone exactly", () => {
    const nets = [
      { memberId: "coach", net: -300 },
      { memberId: "a", net: 1000 },
      { memberId: "b", net: -700 },
    ];
    const after = apply(Object.fromEntries(nets.map((x) => [x.memberId, x.net])), settleViaCoach(nets, "coach"));
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });
});

describe("planSettlement", () => {
  it("dispatches by mode", () => {
    const nets = [
      { memberId: "coach", net: 0 },
      { memberId: "a", net: -100 },
      { memberId: "b", net: 100 },
    ];
    expect(planSettlement("P2P_MINIMIZED", nets, "coach")).toEqual([{ from: "a", to: "b", amountPaise: 100 }]);
    expect(planSettlement("PAY_COACH", nets, "coach")).toEqual([
      { from: "a", to: "coach", amountPaise: 100 },
      { from: "coach", to: "b", amountPaise: 100 },
    ]);
  });
});
