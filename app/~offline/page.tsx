import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("pwa.offlineTitle"),
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="size-16" />
      <WifiOff className="text-muted-foreground size-8" aria-hidden />
      <h1 className="text-2xl font-bold">{t("pwa.offlineTitle")}</h1>
      <p className="text-muted-foreground max-w-sm">{t("pwa.offlineBody")}</p>
    </main>
  );
}
