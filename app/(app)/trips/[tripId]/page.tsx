import { Settings2, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ToastOnMount } from "@/components/toast-on-mount";
import { Button } from "@/components/ui/button";
import { TripHero } from "@/features/trips/trip-hero";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { requireTripPage } from "@/server/queries/trips";

export async function generateMetadata({ params }: PageProps<"/trips/[tripId]">): Promise<Metadata> {
  const { tripId } = await params;
  const { trip } = await requireTripPage(tripId);
  return { title: trip.name };
}

export default async function TripOverviewPage({ params, searchParams }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  const sp = await searchParams;
  const { trip, me, members } = await requireTripPage(tripId);

  return (
    <>
      {sp.joined ? <ToastOnMount message={t("trips.joinedToast")} /> : null}
      <PageHeader
        title={trip.name}
        subtitle={t("trips.role", { role: t(`roles.${me.role}`) })}
        backHref="/trips"
        actions={
          can(me.role, "trip.update") ? (
            <Button asChild variant="ghost" size="icon-lg" aria-label={t("nav.settings")}>
              <Link href={`/trips/${tripId}/settings`}>
                <Settings2 />
              </Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        <TripHero trip={trip} members={members} />
        {members.length < 2 && can(me.role, "member.add") ? (
          <Button asChild size="lg" className="h-12 w-full rounded-2xl">
            <Link href={`/trips/${tripId}/members`}>
              <UserPlus /> {t("members.invite")}
            </Link>
          </Button>
        ) : null}
      </PageBody>
    </>
  );
}
