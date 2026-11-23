import { describe, expect, it } from "vitest";
import { buildUpiAppLinks, buildUpiLink, parseUpiUri } from "@/lib/upi";
import { isKnownUpiHandle, suggestUpiHandle } from "@/lib/upi/handles";

const params = { vpa: "riya.coach@okhdfcbank", payeeName: "Riya Sharma", amountPaise: 324050, note: "Goa Trip - Aman" };
const query = "pa=riya.coach%40okhdfcbank&pn=Riya%20Sharma&am=3240.50&cu=INR&tn=Goa%20Trip%20-%20Aman";

describe("parseUpiUri (reading a scanned UPI QR)", () => {
  it("reads payee VPA, name and amount", () => {
    expect(parseUpiUri(buildUpiLink(params))).toEqual({ vpa: "riya.coach@okhdfcbank", payeeName: "Riya Sharma", amountPaise: 324050 });
  });
  it("accepts typical static QRs from UPI apps (no amount, odd casing, + spaces)", () => {
    expect(parseUpiUri("UPI://pay?pa=Rahul.K@YBL&pn=Rahul+Kumar&mc=0000&mode=02&purpose=00")).toEqual({ vpa: "rahul.k@ybl", payeeName: "Rahul Kumar", amountPaise: null });
  });
  it("rejects non-UPI or invalid payloads", () => {
    expect(parseUpiUri("https://mytrip.app/join/abc")).toBeNull();
    expect(parseUpiUri("upi://pay?pn=NoVpa")).toBeNull();
    expect(parseUpiUri("upi://pay?pa=not-a-vpa")).toBeNull();
    expect(parseUpiUri("")).toBeNull();
  });
});

describe("buildUpiAppLinks (one-tap app buttons)", () => {
  it("Android: generic chooser + package-targeted intents with the amount", () => {
    const links = buildUpiAppLinks(params, "android");
    expect(links[0]).toEqual({ app: "any", href: `upi://pay?${query}` });
    expect(links.find((l) => l.app === "gpay")?.href).toBe(`intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`);
    expect(links.find((l) => l.app === "phonepe")?.href).toBe(`intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`);
    expect(links.find((l) => l.app === "paytm")?.href).toBe(`intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`);
  });
  it("iOS: app-specific schemes (iOS has no UPI app chooser)", () => {
    const links = buildUpiAppLinks(params, "ios");
    expect(links.find((l) => l.app === "gpay")?.href).toBe(`gpay://upi/pay?${query}`);
    expect(links.find((l) => l.app === "phonepe")?.href).toBe(`phonepe://pay?${query}`);
    expect(links.find((l) => l.app === "paytm")?.href).toBe(`paytmmp://pay?${query}`);
    expect(links.find((l) => l.app === "any")?.href).toBe(`upi://pay?${query}`);
  });
  it("desktop: no app buttons (show the QR instead)", () => {
    expect(buildUpiAppLinks(params, "desktop")).toEqual([]);
  });
});

describe("known UPI handles", () => {
  it.each(["a@okhdfcbank", "a@ybl", "a@paytm", "a@okaxis", "a@ibl", "a@axl", "a@upi", "a@oksbi", "a@okicici", "a@ptyes"])("knows %s", (vpa) => {
    expect(isKnownUpiHandle(vpa)).toBe(true);
  });
  it("flags typos and suggests the closest real handle", () => {
    expect(isKnownUpiHandle("a@okhdfc")).toBe(false);
    expect(suggestUpiHandle("a@okhdfc")).toBe("okhdfcbank");
    expect(suggestUpiHandle("a@ybll")).toBe("ybl");
    expect(suggestUpiHandle("a@zzzzzzzz")).toBeNull();
  });
});
