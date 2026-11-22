const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#FFFFFF" d="M32 3C19.85 3 10 12.85 10 25c0 16.1 19.03 33.9 20.65 35.4a2 2 0 0 0 2.7 0C34.97 58.9 54 41.1 54 25 54 12.85 44.15 3 32 3z"/><g transform="rotate(-28 32 25)"><path fill="#0F766E" d="M30.4 12.1a12.9 12.9 0 0 0 0 25.8z"/><path fill="#FBBF24" d="M33.6 12.1a12.9 12.9 0 0 1 0 25.8z"/></g></svg>`;

export const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_BG = "linear-gradient(135deg, #14B8A6 0%, #0F766E 55%, #0B4F4A 100%)";

/** Shared brand header used by every OG image. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MARK_DATA_URI} width={64} height={64} alt="" />
      <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
        <span>My</span>
        <span style={{ color: "#FBBF24" }}>Trip</span>
      </div>
    </div>
  );
}
