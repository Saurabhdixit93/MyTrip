import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { terms } from "@/content/legal/en";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("legal.termsTitle"),
  description: "The terms for using MyTrip, the group trip expense splitter.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPage title={t("legal.termsTitle")} doc={terms} />;
}
