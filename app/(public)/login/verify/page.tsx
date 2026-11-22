import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Check your email" };

export default function VerifyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="bg-secondary flex size-16 items-center justify-center rounded-3xl">
        <MailCheck className="text-primary size-8" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold">{t("auth.verifyTitle")}</h1>
      <p className="text-muted-foreground">{t("auth.verifyBody")}</p>
      {process.env.NODE_ENV !== "production" ? <p className="text-muted-foreground text-xs">{t("auth.verifyDev")}</p> : null}
    </div>
  );
}
