import jsQR from "jsqr";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { brandedQrSvg } from "@/lib/qr/branded";

async function decode(svg: string, px = 480) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).resize(px, px).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height)?.data ?? null;
}

describe("branded QR (logo in the centre)", () => {
  const invites = [
    "http://localhost:3000/join/AI2Ru_GpXmmThYFld3GL19yCtB75L3Ng",
    "https://mytrip.app/join/demo-goa-getaway-invite-token-2026",
    "https://mytrip.example.com/join/Zx9_k-3Lm0pQr7sTuVwXyZ12abCDefGH",
  ];

  it.each(invites)("still scans with the logo: %s", async (url) => {
    expect(await decode(brandedQrSvg(url))).toBe(url);
  });

  it("scans at small phone-screen sizes too", async () => {
    expect(await decode(brandedQrSvg(invites[1] ?? ""), 200)).toBe(invites[1]);
  });

  it("includes the logo badge and brand colours", () => {
    const svg = brandedQrSvg("https://mytrip.app/join/x");
    expect(svg).toContain('fill="#FBBF24"');
    expect(svg).toContain("#0F766E");
  });

  it("can render without the logo", async () => {
    const svg = brandedQrSvg(invites[0] ?? "", { logo: false });
    expect(svg).not.toContain("#FBBF24");
    expect(await decode(svg)).toBe(invites[0]);
  });
});
