import { CalendarDays, MapPin, Plus, Ticket, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripCover } from "@/features/trips/trip-cover";
import { formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { requireUser } from "@/server/auth/session";
import { listMyTrips } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";

export const metadata: Metadata = { title: "Your trips" };

export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const user = await requireUser("/trips");
  const [memberships, sp] = await Promise.all([listMyTrips(user.id), searchParams]);
  const action = typeof sp.action === "string" ? sp.action : sp.shared === "receipt" ? "add-expense" : undefined;
  const target = (tripId: string) => (action === "add-expense" ? `/trips/${tripId}/expenses/new${sp.shared === "receipt" ? "?shared=receipt" : ""}` : action === "dues" ? `/trips/${tripId}/settle` : `/trips/${tripId}`);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <LogoMark className="size-7" title="" /> {t("trips.title")}
          </span>
        }
        actions={
          <>
            <Button asChild size="lg" className="rounded-full">
              <Link href="/trips/new">
                <Plus /> {t("trips.new")}
              </Link>
            </Button>
            <UserMenu name={user.name ?? "Guest"} email={user.email} image={user.image} />
          </>
        }
      />
      <PageBody>
        {action && memberships.length > 0 ? (
          <p className="bg-secondary text-secondary-foreground rounded-xl px-4 py-3 text-sm font-medium">{sp.shared === "receipt" ? t("trips.sharedReceipt") : t("trips.pickTrip")}</p>
        ) : null}

        {memberships.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-14 text-center">
            <LogoMark className="size-16" />
            <h2 className="text-xl font-bold">{t("trips.empty")}</h2>
            <p className="text-muted-foreground max-w-xs text-sm">{t("trips.emptyBody")}</p>
            <div className="flex gap-2">
              <Button asChild size="lg">
                <Link href="/trips/new">
                  <Plus /> {t("trips.new")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/join">
                  <Ticket /> {t("nav.join")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="grid gap-4">
            {memberships.map(({ trip, role }) => (
              <li key={trip.id}>
                <Link href={target(trip.id)} className="group block overflow-hidden rounded-3xl border bg-card shadow-xs transition-shadow hover:shadow-md focus-visible:shadow-md">
                  <TripCover tripId={trip.id} coverUrl={fileUrl(trip.coverKey)} className="h-28">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute end-3 top-3 flex gap-1.5">
                      {trip.status !== "ACTIVE" ? <Badge variant="secondary">{t(`trips.status.${trip.status}`)}</Badge> : null}
                      <Badge className="bg-black/40 text-white backdrop-blur">{t(`roles.${role}`)}</Badge>
                    </div>
                    <h2 className="absolute start-4 bottom-3 text-xl font-bold text-white drop-shadow">{trip.name}</h2>
                  </TripCover>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
                    {trip.destination ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" aria-hidden /> {trip.destination}
                      </span>
                    ) : null}
                    {trip.startDate ? (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden /> {formatShortDate(trip.startDate)}
                        {trip.endDate ? ` – ${formatShortDate(trip.endDate)}` : null}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" aria-hidden /> {trip._count.members === 1 ? t("trips.member") : t("trips.members", { count: trip._count.members })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
