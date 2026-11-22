import { describe, expect, it } from "vitest";
import { MAX_AMOUNT_PAISE, parseRupeesToPaise, paiseToRupeeString, sumPaise } from "@/lib/domain/money";

describe("parseRupeesToPaise", () => {
  it.each([
    ["100", 10000],
    ["100.5", 10050],
    ["100.05", 10005],
    ["0.01", 1],
    ["1,23,456.78", 12345678],
    ["₹ 99", 9900],
    ["Rs. 12", 1200],
    ["0", 0],
    ["7.", 700],
  ])("parses %s → %i paise", (input, expected) => {
    expect(parseRupeesToPaise(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1e3", "12.3.4", "NaN"])("rejects %s", (input) => {
    expect(parseRupeesToPaise(input)).toBeNull();
  });

  it("avoids float drift (0.1 + 0.2 style inputs)", () => {
    expect(parseRupeesToPaise("0.29")).toBe(29);
    expect(parseRupeesToPaise("1.15")).toBe(115);
    expect(parseRupeesToPaise("4.35")).toBe(435);
  });

  it("enforces the max amount", () => {
    expect(parseRupeesToPaise("10000000")).toBe(MAX_AMOUNT_PAISE);
    expect(parseRupeesToPaise("10000000.01")).toBeNull();
  });
});

describe("paiseToRupeeString", () => {
  it.each([
    [0, "0.00"],
    [1, "0.01"],
    [10, "0.10"],
    [12345, "123.45"],
    [-250, "-2.50"],
  ])("%i → %s", (paise, expected) => {
    expect(paiseToRupeeString(paise)).toBe(expected);
  });

  it("rejects non-integers", () => {
    expect(() => paiseToRupeeString(1.5)).toThrow();
  });
});

describe("sumPaise", () => {
  it("adds integers", () => {
    expect(sumPaise([1, 2, 3])).toBe(6);
    expect(sumPaise([])).toBe(0);
  });
});
