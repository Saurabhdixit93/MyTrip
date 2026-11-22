/**
 * Generates every PWA / favicon / splash asset from the SVG sources in public/brand.
 * Run: pnpm icons
 */
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brand = (f: string) => path.join(root, "public/brand", f);
const out = (...p: string[]) => path.join(root, ...p);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512] as const;
const MASKABLE_SIZES = [192, 512] as const;
const FAVICON_SIZES = [16, 32, 48] as const;

/** iOS splash screens: [width, height, devicePixelRatio] in CSS px. */
export const SPLASH_SCREENS = [
  [430, 932, 3],
  [393, 852, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
  [820, 1180, 2],
  [1024, 1366, 2],
] as const;

const BG = "#0F766E";

async function png(svg: Buffer, size: number, file: string) {
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
}

/** Minimal ICO encoder that embeds PNG frames (supported by every modern browser). */
function encodeIco(frames: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = 6 + dir.length;
  frames.forEach((f, i) => {
    const o = i * 16;
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, o);
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(f.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += f.data.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.data)]);
}

function splashSvg(w: number, h: number, mark: string): Buffer {
  const size = Math.round(Math.min(w, h) * 0.28);
  const inner = mark.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="s" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#14B8A6"/><stop offset="1" stop-color="${BG}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#s)"/>
  <svg x="${(w - size) / 2}" y="${(h - size) / 2 - size * 0.2}" width="${size}" height="${size}" viewBox="0 0 512 512">${inner}</svg>
  <text x="${w / 2}" y="${h / 2 + size * 0.62}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(size * 0.22)}" font-weight="700" fill="#FFFFFF">MyTrip</text>
</svg>`);
}

function screenshotSvg(w: number, h: number): Buffer {
  const narrow = h > w;
  const cardW = narrow ? w - 120 : 760;
  const x = narrow ? 60 : w - cardW - 140;
  const rows = [
    ["Dinner at Baga", "Rahul paid", "₹2,400"],
    ["Cab to airport", "Aman paid", "₹1,150"],
    ["Villa — 2 nights", "Coach paid", "₹18,000"],
    ["Scuba diving", "Priya paid", "₹9,600"],
  ];
  const top = narrow ? 420 : 220;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#F4FAF9"/>
  <rect width="${narrow ? w : w * 0.42}" height="${narrow ? 360 : h}" fill="#0F766E"/>
  <text x="${narrow ? 60 : 120}" y="${narrow ? 150 : 380}" font-family="Helvetica, Arial" font-size="${narrow ? 64 : 76}" font-weight="800" fill="#fff">Goa Trip 🌴</text>
  <text x="${narrow ? 60 : 120}" y="${narrow ? 230 : 470}" font-family="Helvetica, Arial" font-size="${narrow ? 38 : 40}" fill="#CCFBF1">Split trips, not friendships.</text>
  <rect x="${x}" y="${top}" rx="40" width="${cardW}" height="220" fill="#fff" stroke="#E2E8F0"/>
  <text x="${x + 50}" y="${top + 85}" font-family="Helvetica, Arial" font-size="36" fill="#475569">You owe the Coach</text>
  <text x="${x + 50}" y="${top + 170}" font-family="Helvetica, Arial" font-size="72" font-weight="800" fill="#B91C1C">₹3,240.00</text>
  ${rows
    .map(
      ([t, s, a], i) => `<rect x="${x}" y="${top + 270 + i * 170}" rx="32" width="${cardW}" height="140" fill="#fff" stroke="#E2E8F0"/>
  <text x="${x + 50}" y="${top + 330 + i * 170}" font-family="Helvetica, Arial" font-size="36" font-weight="700" fill="#0F172A">${t}</text>
  <text x="${x + 50}" y="${top + 380 + i * 170}" font-family="Helvetica, Arial" font-size="28" fill="#64748B">${s}</text>
  <text x="${x + cardW - 50}" y="${top + 355 + i * 170}" text-anchor="end" font-family="Helvetica, Arial" font-size="40" font-weight="700" fill="#0F172A">${a}</text>`,
    )
    .join("\n")}
</svg>`);
}

/** 1200×630 Open Graph / Twitter card, rendered at 2× then downscaled for crisp text. */
function ogSvg(markInner: string): Buffer {
  const W = 1200;
  const H = 630;
  const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  const rows: [string, string, string][] = [
    ["Villa, 4 nights", "Coach paid", "₹18,000"],
    ["Dinner at Thalassa", "Rahul paid", "₹6,240"],
    ["Scuba diving", "Priya paid", "₹9,600"],
  ];
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#14B8A6"/><stop offset="0.55" stop-color="#0F766E"/><stop offset="1" stop-color="#0B3F3B"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F766E"/><stop offset="1" stop-color="#115E59"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#022c29" flood-opacity="0.45"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1080" cy="-40" r="260" fill="#FBBF24" opacity="0.12"/>
  <circle cx="80" cy="640" r="220" fill="#FFFFFF" opacity="0.06"/>
  <path d="M60 560 C 260 470, 380 610, 560 520 S 820 420, 900 470" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round"/>

  <svg x="64" y="58" width="64" height="64" viewBox="0 0 64 64">${markInner}</svg>
  <text x="140" y="104" font-family="${font}" font-size="44" font-weight="700" fill="#FFFFFF" letter-spacing="-1">My<tspan fill="#FBBF24">Trip</tspan></text>

  <text x="64" y="262" font-family="${font}" font-size="78" font-weight="800" fill="#FFFFFF" letter-spacing="-2.5">Split trips,</text>
  <text x="64" y="350" font-family="${font}" font-size="78" font-weight="800" fill="#FDE68A" letter-spacing="-2.5">not friendships.</text>
  <text x="66" y="410" font-family="${font}" font-size="28" fill="#CCFBF1">Group expenses · who owes whom · one-tap UPI</text>

  ${(() => {
    let x = 64;
    return ["Equal · % · Shares", "Pay the Coach", "UPI link + QR"].map((chip) => {
      const w = Math.round(chip.length * 10.6 + 44);
      const cx = x;
      x += w + 14;
      return { chip, w, x: cx };
    });
  })()
    .map(({ chip, w, x }) => {
      return `<rect x="${x}" y="456" width="${w}" height="48" rx="24" fill="#FFFFFF" fill-opacity="0.14" stroke="#FFFFFF" stroke-opacity="0.35"/>
  <text x="${x + w / 2}" y="488" text-anchor="middle" font-family="${font}" font-size="21" font-weight="600" fill="#FFFFFF">${chip}</text>`;
    })
    .join("\n  ")}

  <g transform="translate(790 70) rotate(4)" filter="url(#shadow)">
    <rect width="340" height="500" rx="40" fill="#FFFFFF"/>
    <rect x="16" y="16" width="308" height="200" rx="28" fill="url(#card)"/>
    <text x="40" y="58" font-family="${font}" font-size="17" fill="#CCFBF1">Goa Trip · 6 members</text>
    <text x="40" y="92" font-family="${font}" font-size="18" fill="#FFFFFF" opacity="0.9">You owe the Coach</text>
    <text x="40" y="142" font-family="${font}" font-size="44" font-weight="800" fill="#FFFFFF" letter-spacing="-1">₹3,240.00</text>
    <rect x="40" y="160" width="186" height="40" rx="14" fill="#FBBF24"/>
    <text x="133" y="186" text-anchor="middle" font-family="${font}" font-size="17" font-weight="700" fill="#422006">Pay Now via UPI</text>
    ${rows
      .map(
        ([title, by, amount], i) => `<rect x="16" y="${232 + i * 84}" width="308" height="72" rx="20" fill="#F1F5F9"/>
    <text x="36" y="${262 + i * 84}" font-family="${font}" font-size="18" font-weight="700" fill="#0F172A">${title}</text>
    <text x="36" y="${288 + i * 84}" font-family="${font}" font-size="15" fill="#64748B">${by}</text>
    <text x="304" y="${274 + i * 84}" text-anchor="end" font-family="${font}" font-size="18" font-weight="700" fill="#0F172A">${amount}</text>`,
      )
      .join("\n    ")}
  </g>
</svg>`);
}

async function main() {
  await mkdir(out("public/icons"), { recursive: true });
  await mkdir(out("public/splash"), { recursive: true });
  await mkdir(out("public/screenshots"), { recursive: true });
  await mkdir(out("public/og"), { recursive: true });

  const icon = await readFile(brand("app-icon.svg"));
  const maskable = await readFile(brand("app-icon-maskable.svg"));

  for (const size of ICON_SIZES) await png(icon, size, out(`public/icons/icon-${size}.png`));
  for (const size of MASKABLE_SIZES) await png(maskable, size, out(`public/icons/maskable-${size}.png`));

  // apple-touch-icon must be opaque (iOS adds its own rounding).
  await sharp(maskable, { density: 384 }).resize(180, 180).flatten({ background: BG }).png().toFile(out("app/apple-icon.png"));
  await copyFile(out("app/apple-icon.png"), out("public/icons/apple-touch-icon.png"));

  const frames = await Promise.all(
    FAVICON_SIZES.map(async (size) => ({
      size,
      data: await sharp(icon, { density: 384 }).resize(size, size).png().toBuffer(),
    })),
  );
  await writeFile(out("app/favicon.ico"), encodeIco(frames));
  await copyFile(brand("mark.svg"), out("app/icon.svg"));
  await copyFile(brand("mark.svg"), out("public/favicon.svg"));

  const iconSvg = icon.toString();
  for (const [w, h, dpr] of SPLASH_SCREENS) {
    await sharp(splashSvg(w * dpr, h * dpr, iconSvg)).png({ compressionLevel: 9 }).toFile(out(`public/splash/splash-${w}x${h}@${dpr}x.png`));
  }

  await sharp(screenshotSvg(1080, 1920)).png().toFile(out("public/screenshots/narrow.png"));
  await sharp(screenshotSvg(1920, 1080)).png().toFile(out("public/screenshots/wide.png"));

  // White pin with teal/saffron coin halves, for use on the teal OG background.
  const ogMark = (await readFile(brand("mark.svg"), "utf8"))
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace('fill="url(#mt-pin)"', 'fill="#FFFFFF"')
    .replace('fill="#FFFFFF" d="M30.4', 'fill="#0F766E" d="M30.4');
  await sharp(ogSvg(ogMark)).resize(1200, 630).png({ compressionLevel: 9 }).toFile(out("public/og/og.png"));

  console.log("✔ Icons, favicon, splash screens, screenshots and OG image generated.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
