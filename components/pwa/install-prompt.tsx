"use client";

import { Download, PlusSquare, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { t } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mytrip:install-dismissed-at";
const DISMISS_DAYS = 14;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
}

function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** Custom install banner (Chromium) + "Add to Home Screen" instructions (iOS Safari). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const iosTimer = isIos() ? window.setTimeout(() => setShowIosHint(true), 4000) : undefined;
    const onInstalled = () => setDeferred(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable (private mode) */
    }
    setDeferred(null);
    setShowIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!deferred && !showIosHint) return null;

  return (
    <>
      <div
        role="dialog"
        aria-labelledby="install-title"
        className="glass fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl p-3 shadow-lg animate-in slide-in-from-bottom-4 fade-in md:bottom-6"
      >
        <LogoMark className="size-10 shrink-0" title="" />
        <div className="min-w-0 flex-1">
          <p id="install-title" className="text-sm font-semibold">
            {t("pwa.installTitle")}
          </p>
          <p className="text-muted-foreground text-xs">{t("pwa.installBody")}</p>
        </div>
        <Button size="sm" onClick={deferred ? install : () => setIosSheetOpen(true)}>
          <Download /> {t("pwa.install")}
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label={t("pwa.notNow")}>
          <X />
        </Button>
      </div>

      <Sheet open={iosSheetOpen} onOpenChange={setIosSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader>
            <SheetTitle>{t("pwa.iosTitle")}</SheetTitle>
            <SheetDescription>{t("pwa.installBody")}</SheetDescription>
          </SheetHeader>
          <ol className="space-y-4 px-4 pb-6 text-sm">
            <li className="flex items-center gap-3">
              <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Share className="size-5 text-[#0A84FF]" aria-hidden />
              </span>
              {t("pwa.iosStep1")}
            </li>
            <li className="flex items-center gap-3">
              <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <PlusSquare className="size-5" aria-hidden />
              </span>
              {t("pwa.iosStep2")}
            </li>
            <li className="flex items-center gap-3">
              <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <LogoMark className="size-5" title="" />
              </span>
              {t("pwa.iosStep3")}
            </li>
          </ol>
        </SheetContent>
      </Sheet>
    </>
  );
}
