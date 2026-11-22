import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="size-14" />
      <h1 className="text-2xl font-bold">{t("common.notFound")}</h1>
      <Button asChild>
        <Link href="/">{t("common.goHome")}</Link>
      </Button>
    </main>
  );
}
