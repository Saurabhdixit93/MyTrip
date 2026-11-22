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

async function main() {
  await mkdir(out("public/icons"), { recursive: true });
  await mkdir(out("public/splash"), { recursive: true });
  await mkdir(out("public/screenshots"), { recursive: true });

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

  console.log("✔ Icons, favicon, splash screens and screenshots generated.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
