"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

/** Shows "New version, refresh" when a new service worker is waiting to activate. */
export function UpdateToast() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => {
      serwist.addEventListener("controlling", () => window.location.reload());
      toast(t("pwa.updateReady"), {
        duration: Infinity,
        action: { label: t("pwa.refresh"), onClick: () => serwist.messageSkipWaiting() },
      });
    };
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  return null;
}
