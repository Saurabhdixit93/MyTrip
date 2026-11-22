import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
        Skip to content
      </a>
      <header className="glass sticky top-0 z-40 border-x-0 border-t-0 pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label="MyTrip home" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/#how" className="hover:text-foreground">{t("marketing.navHow")}</Link>
            <Link href="/#features" className="hover:text-foreground">{t("marketing.navFeatures")}</Link>
            <Link href="/#faq" className="hover:text-foreground">{t("marketing.navFaq")}</Link>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="lg">
              <Link href="/login">{t("marketing.signIn")}</Link>
            </Button>
            <Button asChild size="lg" className="hidden sm:inline-flex">
              <Link href="/trips">{t("marketing.openApp")}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t pb-safe">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Logo markClassName="size-6" />
            <p className="max-w-md">{t("marketing.footerNote")}</p>
          </div>
          <nav aria-label="Legal" className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground">{t("marketing.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:text-foreground">{t("marketing.footerTerms")}</Link>
          </nav>
          <p>© {new Date().getFullYear()} MyTrip</p>
        </div>
      </footer>
    </>
  );
}
