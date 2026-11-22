"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { deleteAccountAction, updateProfileAction } from "@/server/actions/account";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const errors = fieldErrors(state);
  useEffect(() => {
    if (state?.ok) toast.success(t("account.saved"));
  }, [state]);
  return (
    <form action={action} className="space-y-3">
      <Field id="name" label={t("account.name")} errors={errors.name}>
        <Input id="name" name="name" defaultValue={name} required maxLength={60} autoComplete="name" className="h-11" />
      </Field>
      <Field id="phone" label={t("account.phone")} errors={errors.phone} optional>
        <Input id="phone" name="phone" defaultValue={phone} type="tel" inputMode="tel" autoComplete="tel" className="h-11" />
      </Field>
      <FormError state={state} />
      <SubmitButton className="w-full">{t("common.save")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, null);
  const errors = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <Field id="confirm" label={t("account.deleteConfirm")} errors={errors.confirm}>
        <Input id="confirm" name="confirm" autoComplete="off" placeholder="DELETE" className="h-11" />
      </Field>
      <FormError state={state} />
      <SubmitButton variant="destructive" className="w-full">
        {t("account.deleteCta")}
      </SubmitButton>
    </form>
  );
}
