import { ArrowRight, Settings2, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ToastOnMount } from "@/components/toast-on-mount";
import { Button } from "@/components/ui/button";
import { ExpenseListItem } from "@/features/expenses/expense-list-item";
import { DuesCard, TripStats } from "@/features/settle/dues-card";
import { TripHero } from "@/features/trips/trip-hero";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { getTripSummary, listExpenses } from "@/server/queries/expenses";
import { countToReview } from "@/server/queries/payments";
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
  const [summary, recent, reviewCount] = await Promise.all([
    getTripSummary(trip.id),
    listExpenses(trip.id, 5),
    countToReview(trip.id, me.id, can(me.role, "payment.review.any")),
  ]);

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
        {reviewCount > 0 ? (
          <Link href={`/trips/${tripId}/payments`} className="bg-highlight text-highlight-foreground flex items-center justify-between rounded-2xl px-4 py-3 font-semibold" data-testid="review-badge">
            <span>{t("payments.reviewBadge", { count: reviewCount })}</span>
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        ) : null}
        <DuesCard tripId={trip.id} summary={summary} meId={me.id} isPayCoach={trip.settlementMode === "PAY_COACH"} />
        <TripStats summary={summary} meId={me.id} budgetPaise={trip.budgetPaise} memberCount={members.length} />
        {recent.rows.length ? (
          <section aria-labelledby="recent-heading" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 id="recent-heading" className="text-lg font-bold">
                {t("expenses.recent")}
              </h2>
              <Link href={`/trips/${tripId}/expenses`} className="text-primary text-sm font-semibold">
                {t("expenses.viewAll")}
              </Link>
            </div>
            <ul className="bg-card divide-y overflow-hidden rounded-3xl border">
              {recent.rows.map((e) => (
                <li key={e.id}>
                  <ExpenseListItem expense={e} meId={me.id} names={summary.names} tripId={trip.id} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PageBody>
    </>
  );
}
