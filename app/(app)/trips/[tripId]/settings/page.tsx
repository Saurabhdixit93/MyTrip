import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteTripDialog, TripStatusControls } from "@/features/trips/trip-admin";
import { PayoutForm } from "@/features/payments/payout-form";
import { TripForm } from "@/features/trips/trip-form";
import { paiseToRupeeString } from "@/lib/domain/money";
import { toDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { updateTripAction } from "@/server/actions/trips";
import { requireTripPage } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";

export const metadata: Metadata = { title: "Trip settings" };

export default async function TripSettingsPage({ params }: PageProps<"/trips/[tripId]/settings">) {
  const { tripId } = await params;
  const { trip, me } = await requireTripPage(tripId, "/settings");
  if (!can(me.role, "trip.update")) notFound();

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        subtitle={trip.name}
        backHref={`/trips/${tripId}`}
        actions={
          can(me.role, "audit.view") ? (
            <Button asChild variant="ghost" size="icon-lg" aria-label={t("settings.viewActivity")}>
              <Link href={`/trips/${tripId}/activity`}>
                <History />
              </Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{t("settings.details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TripForm
              action={updateTripAction}
              submitLabel={t("common.save")}
              defaults={{
                tripId: trip.id,
                name: trip.name,
                destination: trip.destination ?? "",
                description: trip.description ?? "",
                startDate: trip.startDate ? toDateInput(trip.startDate) : "",
                endDate: trip.endDate ? toDateInput(trip.endDate) : "",
                budget: trip.budgetPaise !== null ? paiseToRupeeString(trip.budgetPaise) : "",
                settlementMode: trip.settlementMode,
                coverUrl: fileUrl(trip.coverKey),
              }}
            />
          </CardContent>
        </Card>

        {can(me.role, "trip.payout.update") ? (
          <Card id="payout" className="scroll-mt-20 rounded-3xl">
            <CardHeader>
              <CardTitle>{t("payout.title")}</CardTitle>
              <CardDescription>{t("payout.body")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PayoutForm tripId={trip.id} upiVpa={trip.upiVpa} upiPayeeName={trip.upiPayeeName} qrUrl={fileUrl(trip.upiQrKey)} />
            </CardContent>
          </Card>
        ) : null}

        {can(me.role, "trip.lock") ? (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{t("settings.status")}</CardTitle>
              <CardDescription>{t("settings.lockBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TripStatusControls tripId={trip.id} status={trip.status} />
            </CardContent>
          </Card>
        ) : null}

        {can(me.role, "trip.delete") ? (
          <Card className="border-destructive/40 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-destructive">{t("settings.danger")}</CardTitle>
              <CardDescription>{t("settings.deleteBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteTripDialog tripId={trip.id} tripName={trip.name} />
            </CardContent>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}
