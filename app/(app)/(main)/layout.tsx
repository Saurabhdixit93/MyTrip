import { BottomNav } from "@/components/layout/bottom-nav";
import { t } from "@/lib/i18n";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <BottomNav
        label={t("nav.main")}
        items={[
          { href: "/trips", label: t("nav.trips"), icon: "plane", exact: true },
          { href: "/join", label: t("nav.join"), icon: "ticket" },
          { href: "/account", label: t("nav.account"), icon: "user" },
        ]}
      />
    </>
  );
}
