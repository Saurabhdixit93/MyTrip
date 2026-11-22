import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { TripForm } from "@/features/trips/trip-form";
import { t } from "@/lib/i18n";
import { createTripAction } from "@/server/actions/trips";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "New trip" };

export default async function NewTripPage() {
  await requireUser("/trips/new");
  return (
    <>
      <PageHeader title={t("trips.newTitle")} subtitle={t("trips.newSubtitle")} backHref="/trips" />
      <PageBody>
        <TripForm action={createTripAction} submitLabel={t("trips.create")} />
      </PageBody>
    </>
  );
}
