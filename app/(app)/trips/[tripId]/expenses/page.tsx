import { Plus, Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ToastOnMount } from "@/components/toast-on-mount";
import { Button } from "@/components/ui/button";
import { ExpenseListItem } from "@/features/expenses/expense-list-item";
import { formatDate, formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { getTripSummary, listExpenses } from "@/server/queries/expenses";
import { requireTripPage } from "@/server/queries/trips";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ params, searchParams }: PageProps<"/trips/[tripId]/expenses">) {
  const { tripId } = await params;
  const sp = await searchParams;
  const { trip, me } = await requireTripPage(tripId, "/expenses");
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [{ rows, nextCursor }, summary] = await Promise.all([listExpenses(trip.id, 40, cursor), getTripSummary(trip.id)]);

  const groups = new Map<string, typeof rows>();
  for (const e of rows) {
    const key = e.spentAt.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const canAdd = can(me.role, "expense.create") && trip.status === "ACTIVE";

  return (
    <>
      {sp.saved ? <ToastOnMount message={t("expenses.saved")} /> : null}
      {sp.deleted ? <ToastOnMount message={t("expenses.deleted")} /> : null}
      <PageHeader
        title={t("expenses.title")}
        subtitle={`${t("expenses.total")}: ${formatPaise(summary.totalSpendPaise)}`}
        backHref={`/trips/${tripId}`}
        actions={
          canAdd ? (
            <Button asChild size="lg" className="rounded-full">
              <Link href={`/trips/${tripId}/expenses/new`}>
                <Plus /> {t("expenses.add")}
              </Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        {trip.status !== "ACTIVE" ? <p className="bg-warning/20 rounded-xl px-4 py-3 text-sm font-medium">{t("expenses.lockedNote")}</p> : null}
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center">
            <Receipt className="text-muted-foreground size-10" aria-hidden />
            <h2 className="text-lg font-bold">{t("expenses.empty")}</h2>
            <p className="text-muted-foreground text-sm">{t("expenses.emptyBody")}</p>
            {canAdd ? (
              <Button asChild>
                <Link href={`/trips/${tripId}/expenses/new`}>
                  <Plus /> {t("expenses.add")}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          [...groups.entries()].map(([day, items]) => (
            <section key={day} aria-label={formatDate(new Date(day))} className="space-y-2">
              <h2 className="text-muted-foreground flex justify-between px-1 text-xs font-semibold tracking-wide uppercase">
                <span>{formatDate(new Date(day))}</span>
                <span className="tabular">{formatPaise(items.reduce((s, e) => s + e.amountPaise, 0))}</span>
              </h2>
              <ul className="bg-card divide-y overflow-hidden rounded-3xl border">
                {items.map((e) => (
                  <li key={e.id}>
                    <ExpenseListItem expense={e} meId={me.id} names={summary.names} tripId={trip.id} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {nextCursor ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/trips/${tripId}/expenses?cursor=${nextCursor}`}>{t("activity.loadMore")}</Link>
          </Button>
        ) : null}
      </PageBody>
    </>
  );
}
