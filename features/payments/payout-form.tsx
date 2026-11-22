"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { ImagePicker } from "@/components/forms/image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { updatePayoutAction } from "@/server/actions/payments";

export function PayoutForm({ tripId, upiVpa, upiPayeeName, qrUrl }: { tripId: string; upiVpa: string | null; upiPayeeName: string | null; qrUrl: string | null }) {
  const [state, action] = useActionState(updatePayoutAction, null);
  const errors = fieldErrors(state);
  const [removeQr, setRemoveQr] = useState(false);
  useEffect(() => {
    if (state?.ok) toast.success(t("payout.saved"));
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="removeQr" value={removeQr ? "true" : "false"} />
      <Field id="upiVpa" label={t("payout.vpa")} hint={t("payout.vpaHint")} errors={errors.upiVpa}>
        <Input
          id="upiVpa"
          name="upiVpa"
          defaultValue={upiVpa ?? ""}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          inputMode="email"
          placeholder="name@okhdfcbank"
          className="h-11"
          aria-invalid={errors.upiVpa ? true : undefined}
          aria-describedby={errors.upiVpa ? "upiVpa-error" : "upiVpa-hint"}
        />
      </Field>
      <Field id="upiPayeeName" label={t("payout.payeeName")} errors={errors.upiPayeeName} optional>
        <Input id="upiPayeeName" name="upiPayeeName" defaultValue={upiPayeeName ?? ""} maxLength={50} className="h-11" />
      </Field>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("payout.qr")}</p>
        <p className="text-muted-foreground text-xs">{t("payout.qrHint")}</p>
        <ImagePicker name="upiQr" label={t("payout.qr")} initialUrl={qrUrl} onClear={() => setRemoveQr(true)} aspect="aspect-square" className="w-40" />
      </div>
      <FormError state={state} />
      <SubmitButton className="w-full">{t("common.save")}</SubmitButton>
    </form>
  );
}
