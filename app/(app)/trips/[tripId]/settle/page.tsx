import { ArrowRight, BellRing, History, PartyPopper, Share2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import { PaySheet } from "@/features/payments/pay-sheet";
import { resolvePayee, waLink } from "@/features/payments/payee";
import { RecordReceivedDialog } from "@/features/payments/record-received";
import { myDues } from "@/features/settle/dues";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { absoluteUrl } from "@/lib/site";
import { getTripSummary } from "@/server/queries/expenses";
import { awaitingToMeByPayer, myAwaitingByPayee } from "@/server/queries/payments";
import { requireTripPage } from "@/server/queries/trips";
import { cn } from "cn";

export const metadata: Metadata = { title: "Settle up" };

export default async function SettlePage({ params }: PageProps<"/trips/[tripId]/settle">) {
  const { tripId } = await params;
  const { trip, me, members } = await requireTripPage(tripId, "/settle");
  const [summary, myAwaiting, awaitingToMe] = await Promise.all([getTripSummary(trip.id), myAwaitingByPayee(trip.id, me.id), awaitingToMeByPayer(trip.id, me.id)]);
  const { outgoing, incoming } = myDues(summary.plan, me.id);
  const name = (id: string) => (id === me.id ? t("common.you") : (summary.names[id] ?? "?"));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const balances = [...summary.balances].sort((a, b) => b.net - a.net);
  const allClear = summary.plan.length === 0;
  const canPay = can(me.role, "payment.create") && trip.status === "ACTIVE";
  const settleUrl = absoluteUrl(`/trips/${trip.id}/settle`);
  const coachMissingVpa = me.role === "COACH" && trip.settlementMode === "PAY_COACH" && !trip.upiVpa;

  const duesMessage = [
    t("payments.duesMessageHeader", { trip: trip.name }),
    "",
    ...summary.plan.map((tr) => `• ${summary.names[tr.from] ?? "?"} → ${summary.names[tr.to] ?? "?"}: ${formatPaise(tr.amountPaise)}`),
    "",
    t("payments.duesMessageFooter", { link: settleUrl }),
  ].join("\n");

  return (
    <>
      <PageHeader
        title={t("settle.title")}
        subtitle={trip.name}
        backHref={`/trips/${tripId}`}
        actions={
          <Button asChild variant="ghost" size="icon-lg" aria-label={t("payments.title")}>
            <Link href={`/trips/${tripId}/payments`}>
              <History />
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="bg-secondary text-secondary-foreground rounded-2xl p-4">
          <p className="font-semibold">{t(`settle.mode${trip.settlementMode}`)}</p>
          <p className="text-sm opacity-80">{t(`settle.modeHint${trip.settlementMode}`)}</p>
        </div>

        {coachMissingVpa ? (
          <div className="bg-warning/20 flex items-center justify-between gap-3 rounded-2xl p-4 text-sm">
            <span>{t("payout.missing")}</span>
            <Button asChild size="sm">
              <Link href={`/trips/${tripId}/settings#payout`}>{t("payout.addNow")}</Link>
            </Button>
          </div>
        ) : null}

        {allClear && summary.expenseCount > 0 ? (
          <div className="bg-success text-success-foreground flex flex-col items-center gap-2 rounded-3xl p-8 text-center" data-testid="all-clear">
            <PartyPopper className="size-12" aria-hidden />
            <h2 className="text-2xl font-extrabold">{t("settle.allClear")}</h2>
            <p className="opacity-90">{t("settle.allClearBody")}</p>
          </div>
        ) : null}

        {!allClear ? (
          <section aria-labelledby="your-dues" className="space-y-2">
            <h2 id="your-dues" className="text-lg font-bold">
              {t("settle.yourDues")}
            </h2>
            {outgoing.length === 0 && incoming.length === 0 ? <p className="text-muted-foreground text-sm">{t("settle.nothingForYou")}</p> : null}
            <ul className="space-y-2" data-testid="my-transfers">
              {outgoing.map((tr) => {
                const awaiting = myAwaiting[tr.to] ?? 0;
                const remaining = Math.max(0, tr.amountPaise - awaiting);
                const payeeMember = memberById.get(tr.to);
                return (
                  <li key={`o-${tr.to}`} className="bg-card space-y-3 rounded-2xl border p-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar id={tr.to} name={summary.names[tr.to] ?? "?"} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t("settle.youPay", { name: name(tr.to) })}</span>
                        {awaiting > 0 ? <span className="text-muted-foreground block text-xs">{t("payments.awaiting", { amount: formatPaise(awaiting) })}</span> : null}
                      </span>
                      <span className="tabular text-destructive text-lg font-bold">{formatPaise(remaining)}</span>
                    </div>
                    {canPay && remaining > 0 && payeeMember ? (
                      <div className="flex justify-end">
                        <PaySheet
                          tripId={trip.id}
                          tripName={trip.name}
                          payerName={me.displayName}
                          duePaise={remaining}
                          payee={resolvePayee(trip, payeeMember, payeeMember.id === summary.coachMemberId)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {incoming.map((tr) => {
                const awaiting = awaitingToMe[tr.from] ?? 0;
                const remaining = Math.max(0, tr.amountPaise - awaiting);
                const payer = memberById.get(tr.from);
                const reminder = t("payments.remindMessage", { name: summary.names[tr.from] ?? "", trip: trip.name, amount: formatPaise(remaining), link: settleUrl });
                return (
                  <li key={`i-${tr.from}`} className="bg-card space-y-3 rounded-2xl border p-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar id={tr.from} name={summary.names[tr.from] ?? "?"} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t("settle.paysYou", { name: name(tr.from) })}</span>
                        {awaiting > 0 ? (
                          <Link href={`/trips/${tripId}/payments`} className="text-primary block text-xs font-semibold">
                            {t("payments.awaiting", { amount: formatPaise(awaiting) })}
                          </Link>
                        ) : null}
                      </span>
                      <span className="tabular text-success text-lg font-bold">{formatPaise(remaining)}</span>
                    </div>
                    {remaining > 0 && trip.status === "ACTIVE" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild size="sm" variant="ghost" className="rounded-full">
                          <a href={waLink(payer?.phone, reminder)} target="_blank" rel="noopener noreferrer">
                            <BellRing /> {t("payments.remind")}
                          </a>
                        </Button>
                        <RecordReceivedDialog tripId={trip.id} fromMemberId={tr.from} fromName={summary.names[tr.from] ?? "?"} duePaise={remaining} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="balances-heading" className="space-y-2">
          <h2 id="balances-heading" className="text-lg font-bold">
            {t("settle.balances")}
          </h2>
          <ul className="bg-card divide-y rounded-3xl border">
            {balances.map((b) => (
              <li key={b.memberId} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar id={b.memberId} name={summary.names[b.memberId] ?? "?"} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{name(b.memberId)}</span>
                  <span className="text-muted-foreground tabular block text-xs">{t("settle.paidOf", { paid: formatPaise(b.paid), share: formatPaise(b.owed) })}</span>
                </span>
                <span className={cn("tabular text-sm font-semibold", b.net > 0 ? "text-success" : b.net < 0 ? "text-destructive" : "text-muted-foreground")}>
                  {b.net > 0 ? t("settle.getsBack", { amount: formatPaise(b.net) }) : b.net < 0 ? t("settle.owes", { amount: formatPaise(-b.net) }) : t("settle.settled")}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {!allClear ? (
          <section aria-labelledby="plan-heading" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 id="plan-heading" className="text-lg font-bold">
                {t("settle.plan")}
              </h2>
              <Button asChild size="sm" className="rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                <a href={waLink(null, duesMessage)} target="_blank" rel="noopener noreferrer">
                  <Share2 /> {t("payments.shareDues")}
                </a>
              </Button>
            </div>
            <ol className="bg-card divide-y rounded-3xl border" data-testid="settlement-plan">
              {summary.plan.map((tr) => (
                <li key={`${tr.from}-${tr.to}`} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <span className="truncate font-medium">{name(tr.from)}</span>
                  <ArrowRight className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" aria-label={t("settle.pays")} />
                  <span className="flex-1 truncate font-medium">{name(tr.to)}</span>
                  <span className="tabular font-semibold">{formatPaise(tr.amountPaise)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </PageBody>
    </>
  );
}
