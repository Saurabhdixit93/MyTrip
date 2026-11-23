"use client";

import { Undo2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { voidAdvanceAction } from "@/server/actions/advances";

export function CancelAdvanceButton({ tripId, paymentId }: { tripId: string; paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      data-testid={`cancel-advance-${paymentId}`}
      onClick={() => {
        if (!window.confirm(t("advances.cancelConfirm"))) return;
        start(async () => {
          const res = await voidAdvanceAction({ tripId, paymentId });
          if (res.ok) toast.success(t("advances.cancelled"));
          else toast.error(res.error);
        });
      }}
    >
      <Undo2 /> {t("advances.cancel")}
    </Button>
  );
}
