import { useSyncExternalStore } from "react";
import type { UpiPlatform } from "@/lib/upi";

const noop = () => () => undefined;

function detect(): UpiPlatform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "ios";
  return "desktop";
}

/** android / ios / desktop, for picking UPI deep-link styles. "desktop" during SSR. */
export function useUpiPlatform(): UpiPlatform {
  return useSyncExternalStore(noop, detect, () => "desktop");
}
