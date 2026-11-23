import { ArrowRight, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { ToastOnMount } from "@/components/toast-on-mount";
import { Badge } from "@/components/ui/badge";
import { CancelAdvanceButton } from "@/features/advances/cancel-advance";
import { RecordAdvance } from "@/features/advances/record-advance";
import { ExpenseTabs } from "@/features/expenses/expense-tabs";
import { ReviewActions } from "@/features/payments/review-actions";
import { formatDate, formatPaise, todayInIndia } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { listAdvances, type AdvanceRow } from "@/server/queries/ledger";
import { requireTripPage } from "@/server/queries/trips";

export const metadata: Metadata = { title: "Advances" };

const STATUS_VARIANT = { PENDING: "outline", PAID_AWAITING_APPROVAL: "secondary", VERIFIED: "default", REJECTED: "destructive" } as const;

function sumBy(rows: AdvanceRow[], key: "fromMemberId" | "toMemberId") {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r[key], (map.get(r[key]) ?? 0) + r.amountPaise);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function AdvancesPage({ params, searchParams }: PageProps<"/trips/[tripId]/expenses/advances">) {
  const { tripId } = await params;
  const sp = await searchParams;
  const { trip, me, members } = await requireTripPage(tripId, "/expenses/advances");
  const advances = await listAdvances(trip.id);
  const manager = can(me.role, "payment.review.any");
  const canRecord = can(me.role, "payment.create") && trip.status === "ACTIVE";
  const coachId = members.find((m) => m.role === "COACH")?.id ?? null;
  const names = Object.fromEntries(members.map((m) => [m.id, m.displayName]));
  const nameOf = (r: AdvanceRow, side: "from" | "to") => (r[side].id === me.id ? t("common.you") : r[side].displayName);

  const verified = advances.filter((a) => a.status === "VERIFIED");
  const awaiting = advances.filter((a) => a.status === "PAID_AWAITING_APPROVAL");
  const total = verified.reduce((s, a) => s + a.amountPaise, 0);
  const pendingTotal = awaiting.reduce((s, a) => s + a.amountPaise, 0);
  const heldBy = sumBy(verified, "toMemberId");
  const givenBy = sumBy(verified, "fromMemberId");

  const canReview = (a: AdvanceRow) => a.status === "PAID_AWAITING_APPROVAL" && a.fromMemberId !== me.id && (a.toMemberId === me.id || manager);
  const canCancel = (a: AdvanceRow) =>
    trip.status === "ACTIVE" && (a.status === "VERIFIED" || a.status === "PAID_AWAITING_APPROVAL") && (a.toMemberId === me.id || manager || (a.fromMemberId === me.id && a.status === "PAID_AWAITING_APPROVAL"));

  return (
    <>
      {sp.saved ? <ToastOnMount message={t("advances.saved")} /> : null}
      <PageHeader title={t("advances.title")} subtitle={trip.name} backHref={`/trips/${tripId}`} />
      <PageBody>
        <ExpenseTabs tripId={trip.id} active="advances" />

        <section className="bg-primary text-primary-foreground space-y-3 rounded-3xl p-5" data-testid="advances-summary">
          <p className="text-sm opacity-85">{t("advances.collected")}</p>
          <p className="font-heading tabular text-4xl font-extrabold" data-testid="advances-total">
            {formatPaise(total)}
          </p>
          {heldBy.length ? (
            <ul className="space-y-1 text-sm opacity-90">
              {heldBy.map(([id, amount]) => (
                <li key={id} className="flex justify-between">
                  <span>{t("advances.heldBy", { name: id === me.id ? t("common.you") : (names[id] ?? "?") })}</span>
                  <span className="tabular font-semibold">{formatPaise(amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {pendingTotal ? <p className="text-sm font-medium opacity-90">{t("advances.pending", { amount: formatPaise(pendingTotal) })}</p> : null}
        </section>

        <p className="text-muted-foreground text-sm">{t("advances.intro")}</p>

        {canRecord ? (
          <RecordAdvance
            tripId={trip.id}
            members={members.map((m) => ({ id: m.id, name: m.displayName }))}
            meId={me.id}
            coachId={coachId}
            isManager={manager}
            today={todayInIndia()}
            defaultOpen={sp.new === "1"}
          />
        ) : null}

        {givenBy.length ? (
          <section aria-labelledby="given-heading" className="space-y-2">
            <h2 id="given-heading" className="text-lg font-bold">
              {t("advances.byMember")}
            </h2>
            <ul className="bg-card divide-y rounded-3xl border">
              {givenBy.map(([id, amount]) => (
                <li key={id}>
                  <Link href={`/trips/${tripId}/members/${id}`} className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3">
                    <MemberAvatar id={id} name={names[id] ?? "?"} className="size-8" />
                    <span className="flex-1 font-medium">{id === me.id ? t("common.you") : names[id]}</span>
                    <span className="tabular font-semibold">{formatPaise(amount)}</span>
                    <ArrowRight className="text-muted-foreground size-4 rtl:rotate-180" aria-label={t("hisab.view")} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {advances.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-12 text-center">
            <HandCoins className="text-muted-foreground size-10" aria-hidden />
            <h2 className="text-lg font-bold">{t("advances.empty")}</h2>
            <p className="text-muted-foreground text-sm">{t("advances.emptyBody")}</p>
          </div>
        ) : (
          <ul className="bg-card divide-y rounded-3xl border" data-testid="advance-list">
            {advances.map((a) => (
              <li key={a.id} className="space-y-2 px-4 py-3" data-testid={`advance-${a.id}`}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {nameOf(a, "from")} <span className="text-muted-foreground">{t("advances.gave")}</span> {nameOf(a, "to")}
                  </span>
                  <span className={a.status === "REJECTED" ? "tabular text-muted-foreground font-bold line-through" : "tabular font-bold"}>{formatPaise(a.amountPaise)}</span>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Badge variant={STATUS_VARIANT[a.status]}>{t(`payments.status.${a.status}`)}</Badge>
                  <span>{t(`payments.method${a.method}`)}</span>
                  <time dateTime={(a.paidOn ?? a.createdAt).toISOString()}>{formatDate(a.paidOn ?? a.createdAt)}</time>
                </div>
                {a.note ? <p className="text-muted-foreground text-xs">“{a.note}”</p> : null}
                {a.status === "REJECTED" && a.rejectionReason ? <p className="text-destructive text-xs">{a.rejectionReason}</p> : null}
                {canReview(a) ? <ReviewActions tripId={trip.id} paymentId={a.id} /> : null}
                {canCancel(a) && !canReview(a) ? <CancelAdvanceButton tripId={trip.id} paymentId={a.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
