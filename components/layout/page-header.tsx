import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function PageHeader({ title, subtitle, backHref, actions }: { title: ReactNode; subtitle?: ReactNode; backHref?: string; actions?: ReactNode }) {
  return (
    <header className="glass sticky top-0 z-30 border-x-0 border-t-0 pt-safe">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-2 sm:px-4">
        {backHref ? (
          <Button asChild variant="ghost" size="icon-lg" className="shrink-0 rounded-full">
            <Link href={backHref} aria-label={t("nav.back")}>
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </Link>
          </Button>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-bold">{title}</h1>
          {subtitle ? <p className="text-muted-foreground truncate text-xs">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-2xl space-y-6 px-4 py-5 ${className}`}>{children}</div>;
}
