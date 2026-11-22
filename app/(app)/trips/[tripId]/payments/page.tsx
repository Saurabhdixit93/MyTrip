import { ArrowRight, ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { CancelPaymentButton, ReviewActions } from "@/features/payments/review-actions";
import { formatDateTime, formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { listPayments, type PaymentRow } from "@/server/queries/payments";
import { requireTripPage } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";

export const metadata: Metadata = { title: "Payments" };

const STATUS_VARIANT = {
  PENDING: "outline",
  PAID_AWAITING_APPROVAL: "secondary",
  VERIFIED: "default",
  REJECTED: "destructive",
} as const;

export default async function PaymentsPage({ params }: PageProps<"/trips/[tripId]/payments">) {
  const { tripId } = await params;
  const { trip, me, members } = await requireTripPage(tripId, "/payments");
  const payments = await listPayments(trip.id);
  const reviewAny = can(me.role, "payment.review.any");
  const placeholderIds = new Set(members.filter((m) => !m.userId).map((m) => m.id));

  const canReview = (p: PaymentRow) =>
    p.status === "PAID_AWAITING_APPROVAL" && (p.fromMemberId !== me.id ? p.toMemberId === me.id || reviewAny : reviewAny && placeholderIds.has(p.toMemberId));
  const toReview = payments.filter(canReview);
  const myOpen = payments.filter((p) => p.status === "PENDING" && p.fromMemberId === me.id);
  const history = payments.filter((p) => p.status !== "PENDING" && !toReview.includes(p));
  const name = (id: string, fallback: string) => (id === me.id ? t("common.you") : fallback);

  const row = (p: PaymentRow, actions?: React.ReactNode) => (
    <li key={p.id} className="space-y-2 px-4 py-3" data-testid={`payment-${p.id}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {name(p.from.id, p.from.displayName)} <ArrowRight className="text-muted-foreground inline size-3.5 rtl:rotate-180" aria-hidden /> {name(p.to.id, p.to.displayName)}
        </span>
        <span className="tabular font-bold">{formatPaise(p.amountPaise)}</span>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Badge variant={STATUS_VARIANT[p.status]}>{t(`payments.status.${p.status}`)}</Badge>
        <span>{t(`payments.method${p.method}`)}</span>
        {p.utr ? <span className="tabular">UTR {p.utr}</span> : null}
        <time dateTime={(p.submittedAt ?? p.createdAt).toISOString()}>{formatDateTime(p.submittedAt ?? p.createdAt)}</time>
        {p.proofKey ? (
          <a href={fileUrl(p.proofKey) ?? "#"} target="_blank" rel="noopener" className="text-primary inline-flex items-center gap-1 font-semibold">
            <ImageIcon className="size-3.5" aria-hidden /> {t("payments.viewProof")}
          </a>
        ) : null}
      </div>
      {p.note ? <p className="text-muted-foreground text-xs">“{p.note}”</p> : null}
      {p.status === "REJECTED" && p.rejectionReason ? <p className="text-destructive text-xs">{p.rejectionReason}</p> : null}
      {actions}
    </li>
  );

  return (
    <>
      <PageHeader title={t("payments.title")} subtitle={trip.name} backHref={`/trips/${tripId}/settle`} />
      <PageBody>
        <section aria-labelledby="review-heading" className="space-y-2">
          <h2 id="review-heading" className="flex items-center gap-2 text-lg font-bold">
            {t("payments.toReview")} {toReview.length ? <Badge>{toReview.length}</Badge> : null}
          </h2>
          {toReview.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("payments.reviewEmpty")}</p>
          ) : (
            <ul className="bg-card divide-y rounded-3xl border" data-testid="review-list">
              {toReview.map((p) => row(p, trip.status !== "ARCHIVED" ? <ReviewActions tripId={trip.id} paymentId={p.id} /> : null))}
            </ul>
          )}
        </section>

        {myOpen.length ? (
          <section aria-labelledby="open-heading" className="space-y-2">
            <h2 id="open-heading" className="text-lg font-bold">
              {t("payments.status.PENDING")}
            </h2>
            <ul className="bg-card divide-y rounded-3xl border">
              {myOpen.map((p) => row(p, <CancelPaymentButton tripId={trip.id} paymentId={p.id} />))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="history-heading" className="space-y-2">
          <h2 id="history-heading" className="text-lg font-bold">
            {t("payments.history")}
          </h2>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("payments.historyEmpty")}</p>
          ) : (
            <ul className="bg-card divide-y rounded-3xl border">{history.map((p) => row(p))}</ul>
          )}
        </section>
      </PageBody>
    </>
  );
}
