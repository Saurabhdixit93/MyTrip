import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Short-lived signed token proving the server just created (or vouches for) a guest user.
 * Format: <userId>.<expiresAtMs>.<hmac>
 */
export function signGuestToken(userId: string, ttlMs = 5 * 60_000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifyGuestToken(token: string): string | null {
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig) return null;
  if (Number(exp) < Date.now()) return null;
  const expected = Buffer.from(hmac(`${userId}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return userId;
}

function hmac(payload: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
}
