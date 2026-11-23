/** Reads a QR code from an image file in the browser (lazy-loads the decoder). Null if none found. */
export async function decodeQrFile(file: File): Promise<string | null> {
  try {
    const { default: jsQR } = await import("jsqr");
    const bitmap = await createImageBitmap(file);
    for (const max of [1000, 600, 1400]) {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const result = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
      if (result?.data) return result.data;
    }
    return null;
  } catch {
    return null;
  }
}
