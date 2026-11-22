import { describe, expect, it } from "vitest";
import { formatPaise, formatPaiseCompact, initials } from "@/lib/format";
import { createTranslator } from "@/lib/i18n";

describe("formatPaise", () => {
  it("uses ₹ with Indian digit grouping and 2 decimals", () => {
    expect(formatPaise(12345600)).toBe("₹1,23,456.00");
    expect(formatPaise(5)).toBe("₹0.05");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("formats negatives", () => {
    expect(formatPaise(-150)).toBe("-₹1.50");
  });

  it("compact drops decimals", () => {
    expect(formatPaiseCompact(12345678)).toBe("₹1,23,457");
  });
});

describe("initials", () => {
  it("takes first and last initials", () => {
    expect(initials("rahul kumar sharma")).toBe("RS");
    expect(initials("Aman")).toBe("A");
    expect(initials("  ")).toBe("?");
  });
});

describe("translator", () => {
  it("resolves keys and interpolates vars", () => {
    const t = createTranslator("en");
    expect(t("common.appName")).toBe("MyTrip");
  });
});
