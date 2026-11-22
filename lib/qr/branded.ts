/**
 * Branded QR code as an SVG string (pure; works on server and client).
 *
 * Scannability rules we keep:
 * - error correction "H" (~30% of codewords recoverable)
 * - the logo knock-out covers ≤ ~6% of the symbol, far below the recovery budget
 * - finder patterns stay full-size squares (rounded, but solid and high-contrast)
 * - dark-on-white with a 4-module quiet zone
 * Verified by decoding the rendered PNG in tests/unit/qr.test.ts.
 */
import QRCode from "qrcode";

export interface BrandedQrOptions {
  /** Module colour (keep dark for contrast). */
  color?: string;
  /** Finder-eye colour. */
  eyeColor?: string;
  /** Show the MyTrip pin in the centre. */
  logo?: boolean;
  /** Fraction of the symbol width used by the centre badge. */
  logoRatio?: number;
}

const QUIET = 4;
const PIN = "M32 3C19.85 3 10 12.85 10 25c0 16.1 19.03 33.9 20.65 35.4a2 2 0 0 0 2.7 0C34.97 58.9 54 41.1 54 25 54 12.85 44.15 3 32 3z";

function inFinder(r: number, c: number, size: number) {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
}

function eye(x: number, y: number, color: string) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="${color}" stroke-width="1"/>
<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${color}"/>`;
}

export function brandedQrSvg(value: string, opts: BrandedQrOptions = {}): string {
  const { color = "#0F172A", eyeColor = "#0F766E", logo = true, logoRatio = 0.24 } = opts;
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const total = size + QUIET * 2;

  // Knock-out square in the middle (odd module count keeps it centred on the grid).
  let hole = logo ? Math.round(size * logoRatio) : 0;
  if (hole && hole % 2 === 0) hole += 1;
  const holeStart = Math.floor((size - hole) / 2);
  const inHole = (r: number, c: number) => hole > 0 && r >= holeStart && r < holeStart + hole && c >= holeStart && c < holeStart + hole;

  const dots: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!qr.modules.get(r, c) || inFinder(r, c, size) || inHole(r, c)) continue;
      dots.push(`M${c + QUIET + 0.08} ${r + QUIET + 0.08}h0.84v0.84h-0.84z`);
    }
  }

  const eyes = [eye(QUIET, QUIET, eyeColor), eye(QUIET + size - 7, QUIET, eyeColor), eye(QUIET, QUIET + size - 7, eyeColor)].join("");

  let badge = "";
  if (hole) {
    const pad = 0.6;
    const x = QUIET + holeStart + pad;
    const s = hole - pad * 2;
    const pinScale = (s * 0.78) / 64;
    const pinOffset = x + (s - 64 * pinScale) / 2;
    badge = `<rect x="${x}" y="${x}" width="${s}" height="${s}" rx="${s * 0.26}" fill="#FFFFFF" stroke="${eyeColor}" stroke-width="0.35"/>
<g transform="translate(${pinOffset} ${pinOffset}) scale(${pinScale})">
  <path fill="${eyeColor}" d="${PIN}"/>
  <g transform="rotate(-28 32 25)"><path fill="#FFFFFF" d="M30.4 12.1a12.9 12.9 0 0 0 0 25.8z"/><path fill="#FBBF24" d="M33.6 12.1a12.9 12.9 0 0 1 0 25.8z"/></g>
</g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="geometricPrecision">
<rect width="${total}" height="${total}" fill="#FFFFFF"/>
<path fill="${color}" d="${dots.join("")}"/>
${eyes}
${badge}
</svg>`;
}
