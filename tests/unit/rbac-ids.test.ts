import { describe, expect, it } from "vitest";
import { normalizeCode, randomCode, randomToken } from "@/lib/ids";
import { can, PERMISSIONS } from "@/lib/rbac";

describe("rbac", () => {
  it("coach can do everything", () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) expect(can("COACH", p)).toBe(true);
  });

  it("co-coach can manage but not delete the trip or change payout details", () => {
    expect(can("CO_COACH", "member.add")).toBe(true);
    expect(can("CO_COACH", "expense.update.any")).toBe(true);
    expect(can("CO_COACH", "trip.delete")).toBe(false);
    expect(can("CO_COACH", "trip.payout.update")).toBe(false);
    expect(can("CO_COACH", "payment.review.any")).toBe(false);
  });

  it("member can add expenses and pay but not manage", () => {
    expect(can("MEMBER", "expense.create")).toBe(true);
    expect(can("MEMBER", "payment.create")).toBe(true);
    expect(can("MEMBER", "expense.update.any")).toBe(false);
    expect(can("MEMBER", "member.remove")).toBe(false);
  });

  it("viewer is read-only", () => {
    expect(can("VIEWER", "trip.view")).toBe(true);
    expect(can("VIEWER", "expense.create")).toBe(false);
    expect(can("VIEWER", "payment.create")).toBe(false);
  });
});

describe("ids", () => {
  it("codes are 6 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) expect(randomCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/);
  });

  it("tokens are url-safe and long", () => {
    expect(randomToken()).toMatch(/^[\w-]{32}$/);
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode(" k7q-2xm ")).toBe("K7Q2XM");
  });
});
