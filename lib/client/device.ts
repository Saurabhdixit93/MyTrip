import { useSyncExternalStore } from "react";

const noop = () => () => undefined;

function detectMobile(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** True on phones/tablets where `upi://` links open installed UPI apps. False during SSR. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(noop, detectMobile, () => false);
}
