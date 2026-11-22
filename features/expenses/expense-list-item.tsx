import Link from "next/link";
import { CATEGORY_EMOJI } from "@/lib/categories";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { ExpenseRow } from "@/server/queries/expenses";
import { cn } from "cn";

/** One expense row with the viewer's own position on it (lent / owe / not involved). */
export function ExpenseListItem({ expense, meId, names, tripId }: { expense: ExpenseRow; meId: string; names: Record<string, string>; tripId: string }) {
  const paid = expense.payers.find((p) => p.memberId === meId)?.amountPaise ?? 0;
  const share = expense.splits.find((s) => s.memberId === meId)?.amountPaise ?? 0;
  const delta = paid - share;
  const payer = expense.payers[0];
  const payerLine =
    expense.payers.length > 1
      ? t("expenses.paidByMany", { count: expense.payers.length })
      : payer
        ? payer.memberId === meId
          ? t("expenses.youPaid", { amount: formatPaise(payer.amountPaise) })
          : t("expenses.paidByLine", { name: names[payer.memberId] ?? "?", amount: formatPaise(payer.amountPaise) })
        : "";

  return (
    <Link href={`/trips/${tripId}/expenses/${expense.id}`} className="hover:bg-muted/60 focus-visible:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors">
      <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl" aria-hidden>
        {CATEGORY_EMOJI[expense.category]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{expense.title}</span>
        <span className="text-muted-foreground block truncate text-xs">{payerLine}</span>
      </span>
      <span className="text-end">
        <span className="tabular block font-semibold">{formatPaise(expense.amountPaise)}</span>
        <span className={cn("tabular block text-xs", delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground")}>
          {delta > 0 ? `${t("expenses.youLent")} ${formatPaise(delta)}` : delta < 0 ? `${t("expenses.youBorrowed")} ${formatPaise(-delta)}` : t("expenses.notInvolved")}
        </span>
      </span>
    </Link>
  );
}
