import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { AppError } from "./errors";

type Window = `${number} ${"s" | "m" | "h"}`;
const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }) : null;
const limiters = new Map<string, Ratelimit>();
const memory = new Map<string, { count: number; resetAt: number }>();

function windowMs(w: Window) {
  const [n, unit] = w.split(" ");
  return Number(n) * (unit === "s" ? 1000 : unit === "m" ? 60_000 : 3_600_000);
}

/** Sliding-window limit via Upstash in production; simple in-memory fixed window as a fallback. */
export async function rateLimit(bucket: string, key: string, limit: number, window: Window) {
  const id = `${bucket}:${key}`;
  if (redis) {
    const name = `${bucket}:${limit}:${window}`;
    let rl = limiters.get(name);
    if (!rl) {
      rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: `mytrip:${bucket}` });
      limiters.set(name, rl);
    }
    const { success } = await rl.limit(key);
    if (!success) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
    return;
  }
  const now = Date.now();
  const entry = memory.get(id);
  if (!entry || entry.resetAt < now) {
    memory.set(id, { count: 1, resetAt: now + windowMs(window) });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
