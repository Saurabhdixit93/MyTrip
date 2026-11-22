import { describe, expect, it } from "vitest";
import { buildUpiLink, isValidVpa, normalizeVpa, sanitizeUpiText } from "@/lib/upi";

describe("VPA validation", () => {
  it.each(["rahul@okhdfcbank", "rahul.k-99_x@ybl", "98765.43210@paytm", "ab@upi"])("accepts %s", (vpa) => {
    expect(isValidVpa(vpa)).toBe(true);
  });

  it.each(["", "rahul", "@ybl", "a@ybl", "rahul@", "rahul@1bank", "rahul@ok hdfc", "rahul@@ybl", "rahul@y"])("rejects %s", (vpa) => {
    expect(isValidVpa(vpa)).toBe(false);
  });

  it("normalises case and whitespace", () => {
    expect(normalizeVpa("  Rahul@OkSBI ")).toBe("rahul@oksbi");
  });
});

describe("buildUpiLink", () => {
  it("builds an encoded upi://pay link with a 2-decimal amount", () => {
    const link = buildUpiLink({ vpa: "Coach@okicici", payeeName: "Riya Sharma", amountPaise: 324000, note: "Goa Trip dues" });
    expect(link).toBe("upi://pay?pa=coach%40okicici&pn=Riya%20Sharma&am=3240.00&cu=INR&tn=Goa%20Trip%20dues");
  });

  it("keeps paise exact", () => {
    const link = buildUpiLink({ vpa: "a.b@ybl", payeeName: "A", amountPaise: 5, note: "x" });
    expect(new URL(link.replace("upi://", "https://upi.local/")).searchParams.get("am")).toBe("0.05");
  });

  it("strips characters that would break the query string", () => {
    const link = buildUpiLink({ vpa: "a.b@ybl", payeeName: "Tom & Jerry", amountPaise: 100, note: "a=b#c?d" });
    const params = new URL(link.replace("upi://", "https://upi.local/")).searchParams;
    expect(params.get("pn")).toBe("Tom Jerry");
    expect(params.get("tn")).toBe("a b c d");
    expect(params.get("cu")).toBe("INR");
  });

  it("rejects invalid VPA and non-positive amounts", () => {
    expect(() => buildUpiLink({ vpa: "nope", payeeName: "A", amountPaise: 100, note: "" })).toThrow();
    expect(() => buildUpiLink({ vpa: "a.b@ybl", payeeName: "A", amountPaise: 0, note: "" })).toThrow();
    expect(() => buildUpiLink({ vpa: "a.b@ybl", payeeName: "A", amountPaise: 1.5, note: "" })).toThrow();
  });

  it("falls back to default names when text is empty after sanitising", () => {
    const params = new URL(buildUpiLink({ vpa: "a.b@ybl", payeeName: "&&", amountPaise: 100, note: "" }).replace("upi://", "https://upi.local/")).searchParams;
    expect(params.get("pn")).toBe("MyTrip Coach");
    expect(params.get("tn")).toBe("MyTrip settlement");
  });
});

describe("sanitizeUpiText", () => {
  it("trims to max length", () => {
    expect(sanitizeUpiText("a".repeat(80), 50)).toHaveLength(50);
  });
});
