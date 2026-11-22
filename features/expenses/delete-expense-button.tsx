"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { deleteExpenseAction } from "@/server/actions/expenses";

export function DeleteExpenseButton({ tripId, expenseId }: { tripId: string; expenseId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("expenses.deleteConfirm"))) return;
        start(async () => {
          const res = await deleteExpenseAction({ tripId, expenseId });
          if (res && !res.ok) toast.error(res.error);
        });
      }}
    >
      <Trash2 /> {t("common.delete")}
    </Button>
  );
}
