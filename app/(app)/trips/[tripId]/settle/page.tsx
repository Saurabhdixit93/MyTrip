import { ArrowRight, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { myDues } from "@/features/settle/dues";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getTripSummary } from "@/server/queries/expenses";
import { requireTripPage } from "@/server/queries/trips";
import { cn } from "cn";

export const metadata: Metadata = { title: "Settle up" };

export default async function SettlePage({ params }: PageProps<"/trips/[tripId]/settle">) {
  const { tripId } = await params;
  const { trip, me } = await requireTripPage(tripId, "/settle");
  const summary = await getTripSummary(trip.id);
  const { outgoing, incoming } = myDues(summary.plan, me.id);
  const name = (id: string) => (id === me.id ? t("common.you") : (summary.names[id] ?? "?"));
  const balances = [...summary.balances].sort((a, b) => b.net - a.net);
  const allClear = summary.plan.length === 0;

  return (
    <>
      <PageHeader title={t("settle.title")} subtitle={trip.name} backHref={`/trips/${tripId}`} />
      <PageBody>
        <div className="bg-secondary text-secondary-foreground rounded-2xl p-4">
          <p className="font-semibold">{t(`settle.mode${trip.settlementMode}`)}</p>
          <p className="text-sm opacity-80">{t(`settle.modeHint${trip.settlementMode}`)}</p>
        </div>

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
              {outgoing.map((tr) => (
                <li key={`o-${tr.to}`} className="bg-card flex items-center gap-3 rounded-2xl border p-4">
                  <MemberAvatar id={tr.to} name={summary.names[tr.to] ?? "?"} />
                  <span className="flex-1 font-medium">{t("settle.youPay", { name: name(tr.to) })}</span>
                  <span className="tabular text-destructive text-lg font-bold">{formatPaise(tr.amountPaise)}</span>
                </li>
              ))}
              {incoming.map((tr) => (
                <li key={`i-${tr.from}`} className="bg-card flex items-center gap-3 rounded-2xl border p-4">
                  <MemberAvatar id={tr.from} name={summary.names[tr.from] ?? "?"} />
                  <span className="flex-1 font-medium">{t("settle.paysYou", { name: name(tr.from) })}</span>
                  <span className="tabular text-success text-lg font-bold">{formatPaise(tr.amountPaise)}</span>
                </li>
              ))}
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
            <h2 id="plan-heading" className="text-lg font-bold">
              {t("settle.plan")}
            </h2>
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
