import { describe, expect, it } from "vitest";
import { computeBalances, type LedgerExpense } from "@/lib/domain/balances";
import { memberStatement, type StatementExpense, type StatementTransfer } from "@/lib/domain/statement";
import { planSettlement } from "@/lib/domain/settlement";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("advances in the ledger", () => {
  it("an advance to the Coach is refunded through the normal settlement plan", () => {
    // Aman gives ₹5,000 advance. Coach pays ₹3,000 dinner split between both → Aman's share ₹1,500.
    const expenses: LedgerExpense[] = [{ payers: [{ memberId: "coach", amountPaise: 300000 }], splits: [{ memberId: "coach", amountPaise: 150000 }, { memberId: "aman", amountPaise: 150000 }] }];
    const transfers = [{ fromMemberId: "aman", toMemberId: "coach", amountPaise: 500000 }];
    const balances = computeBalances(["coach", "aman"], expenses, transfers);
    expect(Object.fromEntries(balances.map((b) => [b.memberId, b.net]))).toEqual({ coach: -350000, aman: 350000 });
    expect(planSettlement("PAY_COACH", balances, "coach")).toEqual([{ from: "coach", to: "aman", amountPaise: 350000 }]);
  });

  it("advances exactly covering the share leave everyone settled", () => {
    const expenses: LedgerExpense[] = [{ payers: [{ memberId: "coach", amountPaise: 600000 }], splits: ["coach", "a", "b"].map((memberId) => ({ memberId, amountPaise: 200000 })) }];
    const transfers = ["a", "b"].map((m) => ({ fromMemberId: m, toMemberId: "coach", amountPaise: 200000 }));
    const balances = computeBalances(["coach", "a", "b"], expenses, transfers);
    expect(balances.every((b) => b.net === 0)).toBe(true);
    expect(planSettlement("PAY_COACH", balances, "coach")).toEqual([]);
  });
});

describe("memberStatement", () => {
  const expenses: StatementExpense[] = [
    { id: "e1", title: "Villa", date: d("2026-12-20"), payers: [{ memberId: "coach", amountPaise: 1800000 }], splits: [{ memberId: "coach", amountPaise: 600000 }, { memberId: "aman", amountPaise: 600000 }, { memberId: "priya", amountPaise: 600000 }] },
    { id: "e2", title: "Dinner", date: d("2026-12-21"), payers: [{ memberId: "aman", amountPaise: 240000 }], splits: [{ memberId: "aman", amountPaise: 120000 }, { memberId: "priya", amountPaise: 120000 }] },
  ];
  const transfers: StatementTransfer[] = [
    { id: "p1", kind: "ADVANCE", date: d("2026-12-01"), fromMemberId: "aman", toMemberId: "coach", amountPaise: 1000000 },
    { id: "p2", kind: "SETTLEMENT", date: d("2026-12-25"), fromMemberId: "coach", toMemberId: "aman", amountPaise: 100000 },
  ];

  it("lists every entry in date order with a running balance", () => {
    const s = memberStatement("aman", expenses, transfers);
    expect(s.entries.map((e) => [e.type, e.delta, e.balance])).toEqual([
      ["advance_given", 1000000, 1000000],
      ["expense_share", -600000, 400000],
      ["expense_paid", 240000, 640000],
      ["expense_share", -120000, 520000],
      ["settlement_received", -100000, 420000],
    ]);
    expect(s.totals).toEqual({ paid: 240000, share: 720000, advancesGiven: 1000000, advancesReceived: 0, settlementsSent: 0, settlementsReceived: 100000, net: 420000 });
  });

  it("shows advances the Coach received as a negative (money held for the group)", () => {
    const s = memberStatement("coach", expenses, transfers);
    expect(s.entries[0]).toMatchObject({ type: "advance_received", delta: -1000000, counterpartyId: "aman" });
    expect(s.totals.advancesReceived).toBe(1000000);
  });

  it("skips expenses the member isn't part of", () => {
    expect(memberStatement("priya", expenses, transfers).entries.map((e) => e.refId)).toEqual(["e1", "e2"]);
  });

  it("property: statement net always equals the balance engine's net", () => {
    let seed = 99;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const ids = ["a", "b", "c", "d", "e"];
    for (let i = 0; i < 400; i++) {
      const exps: StatementExpense[] = Array.from({ length: 1 + rand(8) }, (_, k) => {
        const amount = 100 + rand(500000);
        const payer = ids[rand(ids.length)] ?? "a";
        const who = ids.filter(() => rand(2) === 0);
        const parts = who.length ? who : ["a"];
        const base = Math.floor(amount / parts.length);
        return {
          id: `e${k}`,
          title: "x",
          date: d(`2026-12-${String(1 + rand(28)).padStart(2, "0")}`),
          payers: [{ memberId: payer, amountPaise: amount }],
          splits: parts.map((m, j) => ({ memberId: m, amountPaise: base + (j === 0 ? amount - base * parts.length : 0) })),
        };
      });
      const trs: StatementTransfer[] = Array.from({ length: rand(6) }, (_, k) => {
        const from = ids[rand(ids.length)] ?? "a";
        const to = ids.filter((x) => x !== from)[rand(ids.length - 1)] ?? "b";
        return { id: `t${k}`, kind: rand(2) ? "ADVANCE" : "SETTLEMENT", date: d(`2026-12-${String(1 + rand(28)).padStart(2, "0")}`), fromMemberId: from, toMemberId: to, amountPaise: 1 + rand(300000) };
      });
      const nets = Object.fromEntries(computeBalances(ids, exps, trs).map((b) => [b.memberId, b.net]));
      for (const id of ids) {
        const s = memberStatement(id, exps, trs);
        expect(s.totals.net).toBe(nets[id]);
        expect(s.entries.at(-1)?.balance ?? 0).toBe(nets[id]);
      }
    }
  });
});
