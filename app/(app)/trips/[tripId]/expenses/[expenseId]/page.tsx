import { CalendarDays, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { ToastOnMount } from "@/components/toast-on-mount";
import { Button } from "@/components/ui/button";
import { DeleteExpenseButton } from "@/features/expenses/delete-expense-button";
import { CATEGORY_EMOJI } from "@/lib/categories";
import { basisPointsToPercent } from "@/lib/domain/split";
import { formatDate, formatDateTime, formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { getExpense, getTripSummary } from "@/server/queries/expenses";
import { requireTripPage } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpenseDetailPage({ params, searchParams }: PageProps<"/trips/[tripId]/expenses/[expenseId]">) {
  const { tripId, expenseId } = await params;
  const sp = await searchParams;
  const { trip, me } = await requireTripPage(tripId, `/expenses/${expenseId}`);
  const [expense, summary] = await Promise.all([getExpense(trip.id, expenseId), getTripSummary(trip.id)]);
  if (!expense) notFound();
  const canEdit = trip.status === "ACTIVE" && (can(me.role, "expense.update.any") || (expense.createdBy.id === me.id && can(me.role, "expense.update.own")));
  const name = (id: string) => (id === me.id ? t("common.you") : (summary.names[id] ?? "?"));
  const weightLabel = (weight: number) =>
    expense.splitType === "PERCENTAGE" ? `${basisPointsToPercent(weight)}%` : expense.splitType === "SHARES" ? `×${weight}` : null;

  return (
    <>
      {sp.saved ? <ToastOnMount message={t("expenses.saved")} /> : null}
      <PageHeader
        title={expense.title}
        subtitle={t(`categories.${expense.category}`)}
        backHref={`/trips/${tripId}/expenses`}
        actions={
          canEdit ? (
            <Button asChild variant="ghost" size="icon-lg" aria-label={t("common.edit")}>
              <Link href={`/trips/${tripId}/expenses/${expenseId}/edit`}>
                <Pencil />
              </Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="bg-card space-y-2 rounded-3xl border p-6 text-center">
          <span className="text-4xl" aria-hidden>
            {CATEGORY_EMOJI[expense.category]}
          </span>
          <p className="font-heading tabular text-4xl font-extrabold">{formatPaise(expense.amountPaise)}</p>
          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
            <CalendarDays className="size-4" aria-hidden /> {formatDate(expense.spentAt)}
          </p>
        </div>

        <section aria-labelledby="paid-heading" className="space-y-2">
          <h2 id="paid-heading" className="text-sm font-semibold">
            {t("expenses.paidBy")}
          </h2>
          <ul className="bg-card divide-y rounded-3xl border">
            {expense.payers.map((p) => (
              <li key={p.memberId} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar id={p.memberId} name={summary.names[p.memberId] ?? "?"} className="size-8" />
                <span className="flex-1">{name(p.memberId)}</span>
                <span className="tabular font-semibold">{formatPaise(p.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="split-heading" className="space-y-2">
          <h2 id="split-heading" className="text-sm font-semibold">
            {t("expenses.breakdown")} · {t(`expenses.split${expense.splitType}`)}
          </h2>
          <ul className="bg-card divide-y rounded-3xl border">
            {expense.splits.map((s) => (
              <li key={s.memberId} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar id={s.memberId} name={summary.names[s.memberId] ?? "?"} className="size-8" />
                <span className="flex-1">
                  {name(s.memberId)}
                  {weightLabel(s.weight) ? <span className="text-muted-foreground text-xs"> · {weightLabel(s.weight)}</span> : null}
                </span>
                <span className="tabular font-semibold">{formatPaise(s.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>

        {expense.notes ? <p className="bg-muted rounded-2xl p-4 text-sm whitespace-pre-wrap">{expense.notes}</p> : null}

        {expense.attachments.length ? (
          <section aria-labelledby="receipts-heading" className="space-y-2">
            <h2 id="receipts-heading" className="text-sm font-semibold">
              {t("expenses.receipts")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {expense.attachments.map((a) => (
                <a key={a.id} href={fileUrl(a.fileKey) ?? "#"} target="_blank" rel="noopener" className="block aspect-square overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(a.fileKey) ?? ""} alt={t("expenses.receipts")} className="size-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-muted-foreground text-center text-xs">
          {t("expenses.addedBy", { name: expense.createdBy.displayName })} · {formatDateTime(expense.createdAt)}
        </p>

        {canEdit ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/trips/${tripId}/expenses/${expenseId}/edit`}>
                <Pencil /> {t("common.edit")}
              </Link>
            </Button>
            <DeleteExpenseButton tripId={trip.id} expenseId={expense.id} />
          </div>
        ) : null}
      </PageBody>
    </>
  );
}
