"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import { cancelPaymentAction, reviewPaymentAction } from "@/server/actions/payments";

export function ReviewActions({ tripId, paymentId }: { tripId: string; paymentId: string }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const review = (decision: "approve" | "reject") =>
    start(async () => {
      const res = await reviewPaymentAction({ tripId, paymentId, decision, reason: decision === "reject" ? reason : undefined });
      if (res.ok) toast.success(decision === "approve" ? t("payments.approved") : t("payments.rejected"));
      else toast.error(res.error);
      setOpen(false);
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 flex-1" disabled={pending} onClick={() => review("approve")} data-testid={`approve-${paymentId}`}>
        <Check /> {t("payments.approve")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" className="flex-1" disabled={pending}>
            <X /> {t("payments.reject")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payments.reject")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reason-${paymentId}`}>{t("payments.rejectReason")}</Label>
            <Input id={`reason-${paymentId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("payments.rejectPlaceholder")} />
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={pending} onClick={() => review("reject")}>
              {t("payments.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CancelPaymentButton({ tripId, paymentId }: { tripId: string; paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cancelPaymentAction({ tripId, paymentId });
          if (res.ok) toast.success(t("payments.cancelled"));
          else toast.error(res.error);
        })
      }
    >
      {t("payments.cancel")}
    </Button>
  );
}
