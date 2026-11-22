import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between px-4">
          <Link href="/" aria-label="MyTrip home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-4 pb-12">{children}</main>
    </div>
  );
}
