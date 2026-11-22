"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineIndicator() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="bg-warning text-warning-foreground fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 py-1 text-xs font-medium pt-safe">
      <WifiOff className="size-3.5" aria-hidden /> {t("pwa.offlineBadge")}
    </div>
  );
}
