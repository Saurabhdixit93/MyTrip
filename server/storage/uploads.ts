import "server-only";
import { randomToken } from "@/lib/ids";
import { AppError } from "../errors";
import { storage } from "./index";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadKind = "cover" | "receipt" | "upi-qr" | "payment-proof";

const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    type: "image/webp",
    ext: "webp",
    test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

/** Validates an uploaded image by its magic bytes (never trusting the client's MIME type) and stores it. */
export async function storeTripImage(tripId: string, kind: UploadKind, file: File): Promise<{ key: string; contentType: string; size: number }> {
  if (file.size === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Images must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) throw new AppError("VALIDATION", "Only JPG, PNG or WebP images are allowed.");
  const key = `trips/${tripId}/${kind}/${Date.now()}-${randomToken(9)}.${sig.ext}`;
  await storage.put(key, bytes, sig.type);
  return { key, contentType: sig.type, size: bytes.byteLength };
}

/** Keys are always `trips/<tripId>/...`; returns the trip id the file belongs to. */
export function tripIdFromKey(key: string): string | null {
  const m = /^trips\/([a-z0-9]+)\/(cover|receipt|upi-qr|payment-proof)\/[\w.-]+$/i.exec(key);
  return m?.[1] ?? null;
}

export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key}` : null;
}

/** Pulls an optional non-empty File out of form data. */
export function optionalFile(value: unknown): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}
