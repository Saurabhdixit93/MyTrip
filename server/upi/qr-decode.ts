import "server-only";
import jsQR from "jsqr";
import sharp from "sharp";

/**
 * Finds and decodes a QR code in an uploaded image (screenshots of UPI apps, photos, PDFs-as-PNG).
 * Tries a few sizes and a contrast-normalised pass, since QR screenshots vary a lot.
 */
export async function decodeQrFromImage(bytes: Uint8Array): Promise<string | null> {
  const attempts: { width: number; normalise: boolean }[] = [
    { width: 1000, normalise: false },
    { width: 600, normalise: false },
    { width: 1400, normalise: true },
    { width: 400, normalise: true },
  ];
  for (const { width, normalise } of attempts) {
    try {
      let img = sharp(bytes, { animated: false }).rotate().resize({ width, height: width, fit: "inside", withoutEnlargement: false }).flatten({ background: "#ffffff" });
      if (normalise) img = img.grayscale().normalise();
      const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height, { inversionAttempts: "attemptBoth" });
      if (result?.data) return result.data;
    } catch {
      return null; // not a readable image
    }
  }
  return null;
}
