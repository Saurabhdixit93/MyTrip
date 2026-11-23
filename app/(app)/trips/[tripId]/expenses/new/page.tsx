import { HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { todayInIndia } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { createExpenseAction } from "@/server/actions/expenses";
import { requireTripPage } from "@/server/queries/trips";
import { MAX_RECEIPTS } from "@/server/services/expenses";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage({ params, searchParams }: PageProps<"/trips/[tripId]/expenses/new">) {
  const { tripId } = await params;
  const sp = await searchParams;
  const { trip, me, members } = await requireTripPage(tripId, "/expenses/new");
  if (!can(me.role, "expense.create")) notFound();

  return (
    <>
      <PageHeader title={t("expenses.newTitle")} subtitle={trip.name} backHref={`/trips/${tripId}/expenses`} />
      <PageBody>
        {trip.status !== "ACTIVE" ? (
          <p className="bg-warning/20 rounded-xl px-4 py-3 text-sm font-medium">{t("expenses.lockedNote")}</p>
        ) : (
          <>
          <Link href={`/trips/${tripId}/expenses/advances?new=1`} className="bg-secondary text-secondary-foreground flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" data-testid="record-advance-instead">
            <HandCoins className="size-4" aria-hidden /> {t("advances.recordInstead")}
          </Link>
          <ExpenseForm
            action={createExpenseAction}
            tripId={trip.id}
            members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
            meId={me.id}
            today={todayInIndia()}
            maxReceipts={MAX_RECEIPTS}
            loadSharedReceipt={sp.shared === "receipt"}
          />
          </>
        )}
      </PageBody>
    </>
  );
}
