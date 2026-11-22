import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacy } from "@/content/legal/en";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("legal.privacyTitle"),
  description: "How MyTrip collects, uses and protects your data. MyTrip never processes or holds your payments.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage title={t("legal.privacyTitle")} doc={privacy} />;
}
