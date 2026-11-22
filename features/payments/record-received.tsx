"use client";

import { HandCoins } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { paiseToRupeeString } from "@/lib/domain/money";
import { t } from "@/lib/i18n";
import { recordReceivedAction } from "@/server/actions/payments";

export function RecordReceivedDialog({ tripId, fromMemberId, fromName, duePaise }: { tripId: string; fromMemberId: string; fromName: string; duePaise: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () =>
    start(async () => {
      if (!formRef.current) return;
      const res = await recordReceivedAction(new FormData(formRef.current));
      if (!res.ok) return setError(res.error);
      toast.success(t("payments.recorded"));
      setOpen(false);
      setKey(crypto.randomUUID());
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full">
          <HandCoins /> {t("payments.markReceived")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("payments.receivedTitle", { name: fromName })}</DialogTitle>
          <DialogDescription>{t("payments.receivedBody", { name: fromName })}</DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="fromMemberId" value={fromMemberId} />
          <input type="hidden" name="idempotencyKey" value={key} />
          <Field id={`recv-amount-${fromMemberId}`} label={t("payments.amount")}>
            <Input id={`recv-amount-${fromMemberId}`} name="amount" inputMode="decimal" defaultValue={paiseToRupeeString(duePaise)} className="tabular h-11" />
          </Field>
          <Field id={`recv-method-${fromMemberId}`} label={t("payments.method")}>
            <select id={`recv-method-${fromMemberId}`} name="method" defaultValue="CASH" className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm">
              <option value="CASH">{t("payments.methodCASH")}</option>
              <option value="UPI">{t("payments.methodUPI")}</option>
              <option value="OTHER">{t("payments.methodOTHER")}</option>
            </select>
          </Field>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("payments.receivedCta")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
