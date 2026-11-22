import { ImageResponse } from "next/og";
import { OG_BG, OG_SIZE, OgBrand } from "@/lib/og/brand";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: OG_BG, color: "white" }}>
        <OgBrand />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Split trips,</div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: "#FDE68A" }}>not friendships.</div>
          <div style={{ fontSize: 32, opacity: 0.9, maxWidth: 900 }}>Group trip expenses, who-owes-whom, and one-tap UPI settle-ups.</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26 }}>
          {["Equal · Exact · % · Shares", "Pay the Coach", "UPI deep link + QR"].map((chip) => (
            <div key={chip} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.3)" }}>
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
