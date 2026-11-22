import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-dvh flex-1 flex-col pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] md:pb-28">{children}</div>;
}
