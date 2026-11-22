"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("common.somethingWrong")}</h1>
      <Button onClick={reset}>{t("common.retry")}</Button>
    </main>
  );
}
