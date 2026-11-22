import { BottomNav } from "@/components/layout/bottom-nav";
import { t } from "@/lib/i18n";

export default async function TripLayout({ children, params }: LayoutProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const base = `/trips/${tripId}`;
  return (
    <>
      {children}
      <BottomNav
        label={t("nav.main")}
        action={{ href: `${base}/expenses/new`, label: t("nav.add") }}
        items={[
          { href: base, label: t("nav.overview"), icon: "home", exact: true },
          { href: `${base}/expenses`, label: t("nav.expenses"), icon: "receipt" },
          { href: `${base}/settle`, label: t("nav.settle"), icon: "wallet" },
          { href: `${base}/members`, label: t("nav.members"), icon: "users" },
        ]}
      />
    </>
  );
}
