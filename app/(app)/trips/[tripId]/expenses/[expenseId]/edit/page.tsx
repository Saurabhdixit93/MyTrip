import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { paiseToRupeeString } from "@/lib/domain/money";
import { toDateInput } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { updateExpenseAction } from "@/server/actions/expenses";
import { getExpense } from "@/server/queries/expenses";
import { requireTripPage } from "@/server/queries/trips";
import { MAX_RECEIPTS } from "@/server/services/expenses";
import { fileUrl } from "@/server/storage/uploads";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: PageProps<"/trips/[tripId]/expenses/[expenseId]/edit">) {
  const { tripId, expenseId } = await params;
  const { trip, me, members } = await requireTripPage(tripId, `/expenses/${expenseId}/edit`);
  const expense = await getExpense(trip.id, expenseId);
  if (!expense) notFound();
  const allowed = trip.status === "ACTIVE" && (can(me.role, "expense.update.any") || (expense.createdBy.id === me.id && can(me.role, "expense.update.own")));
  if (!allowed) notFound();

  // Members removed later can't be re-selected, but keep the active ones in a stable order.
  return (
    <>
      <PageHeader title={t("expenses.editTitle")} subtitle={expense.title} backHref={`/trips/${tripId}/expenses/${expenseId}`} />
      <PageBody>
        <ExpenseForm
          action={updateExpenseAction}
          tripId={trip.id}
          members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
          meId={me.id}
          today={toDateInput(expense.spentAt)}
          maxReceipts={MAX_RECEIPTS}
          defaults={{
            expenseId: expense.id,
            version: expense.version,
            title: expense.title,
            amount: paiseToRupeeString(expense.amountPaise),
            category: expense.category,
            spentAt: toDateInput(expense.spentAt),
            notes: expense.notes ?? "",
            splitType: expense.splitType,
            splits: expense.splits,
            payers: expense.payers,
            attachments: expense.attachments.map((a) => ({ id: a.id, url: fileUrl(a.fileKey) ?? "" })),
          }}
        />
      </PageBody>
    </>
  );
}
