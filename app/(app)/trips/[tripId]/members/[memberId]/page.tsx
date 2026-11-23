import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import type { StatementEntry } from "@/lib/domain/statement";
import { formatDate, formatPaise } from "@/lib/format";
import { t, type MessageKey } from "@/lib/i18n";
import { db } from "@/server/db";
import { getMemberStatement } from "@/server/queries/ledger";
import { requireTripPage } from "@/server/queries/trips";
import { cn } from "cn";

export const metadata: Metadata = { title: "Statement" };

const SUMMARY: { key: "paid" | "share" | "advancesGiven" | "advancesReceived" | "settlementsSent" | "settlementsReceived"; sign: 1 | -1 }[] = [
  { key: "paid", sign: 1 },
  { key: "advancesGiven", sign: 1 },
  { key: "settlementsSent", sign: 1 },
  { key: "share", sign: -1 },
  { key: "advancesReceived", sign: -1 },
  { key: "settlementsReceived", sign: -1 },
];

export default async function MemberHisabPage({ params }: PageProps<"/trips/[tripId]/members/[memberId]">) {
  const { tripId, memberId } = await params;
  const { trip, me } = await requireTripPage(tripId, `/members/${memberId}`);
  // Include removed members so their history is still readable.
  const [member, allMembers] = await Promise.all([
    db.tripMember.findFirst({ where: { id: memberId, tripId: trip.id }, include: { user: { select: { image: true } } } }),
    db.tripMember.findMany({ where: { tripId: trip.id }, select: { id: true, displayName: true } }),
  ]);
  if (!member) notFound();
  const names = Object.fromEntries(allMembers.map((m) => [m.id, m.id === me.id ? t("common.you") : m.displayName]));
  const { entries, totals } = await getMemberStatement(trip.id, member.id);
  const isMe = member.id === me.id;

  const describe = (e: StatementEntry) => {
    const key: MessageKey = `hisab.${e.type}`;
    return t(key, { label: e.label ?? "", name: e.counterpartyId ? (names[e.counterpartyId] ?? "?") : "" });
  };
  const href = (e: StatementEntry) => (e.type === "expense_paid" || e.type === "expense_share" ? `/trips/${tripId}/expenses/${e.refId}` : e.type.startsWith("advance") ? `/trips/${tripId}/expenses/advances` : `/trips/${tripId}/payments`);

  return (
    <>
      <PageHeader title={t("hisab.title")} subtitle={t("hisab.subtitle", { name: isMe ? t("common.you") : member.displayName })} backHref={`/trips/${tripId}/members`} />
      <PageBody>
        <section
          className={cn("flex items-center gap-4 rounded-3xl p-5", totals.net > 0 ? "bg-success text-success-foreground" : totals.net < 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
          data-testid="hisab-net"
        >
          <MemberAvatar id={member.id} name={member.displayName} image={member.user?.image} className="size-12 ring-2 ring-white/40" />
          <div>
            <p className="text-sm opacity-85">{isMe ? t("common.you") : member.displayName}</p>
            <p className="font-heading tabular text-3xl font-extrabold">
              {totals.net > 0 ? t("hisab.getsBack", { amount: formatPaise(totals.net) }) : totals.net < 0 ? t("hisab.owes", { amount: formatPaise(-totals.net) }) : t("hisab.settled")}
            </p>
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-3" data-testid="hisab-totals">
          {SUMMARY.filter((s) => s.key === "paid" || s.key === "share" || totals[s.key] > 0).map((s) => (
            <div key={s.key} className="bg-card rounded-2xl border p-4">
              <dt className="text-muted-foreground text-xs">{t(`hisab.${s.key}`)}</dt>
              <dd className={cn("tabular mt-1 text-lg font-bold", totals[s.key] === 0 ? "text-muted-foreground" : s.sign > 0 ? "text-success" : "text-destructive")}>
                {totals[s.key] === 0 ? "" : s.sign > 0 ? "+" : "−"}
                {formatPaise(totals[s.key])}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">{t("hisab.formula")}</p>

        <section aria-labelledby="entries-heading" className="space-y-2">
          <h2 id="entries-heading" className="text-lg font-bold">
            {t("hisab.entries")}
          </h2>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("hisab.empty")}</p>
          ) : (
            <ol className="bg-card divide-y overflow-hidden rounded-3xl border" data-testid="hisab-entries">
              {entries.map((e, i) => (
                <li key={`${e.refId}-${e.type}-${i}`}>
                  <Link href={href(e)} className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{describe(e)}</span>
                      <span className="text-muted-foreground block text-xs">{formatDate(e.date)}</span>
                    </span>
                    <span className="text-end">
                      <span className={cn("tabular block text-sm font-bold", e.delta > 0 ? "text-success" : "text-destructive")}>
                        {e.delta > 0 ? "+" : "−"}
                        {formatPaise(Math.abs(e.delta))}
                      </span>
                      <span className="text-muted-foreground tabular block text-xs">
                        {t("hisab.balance")} {e.balance < 0 ? "−" : ""}
                        {formatPaise(Math.abs(e.balance))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </PageBody>
    </>
  );
}
