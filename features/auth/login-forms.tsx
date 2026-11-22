"use client";

import { Mail, Zap } from "lucide-react";
import { useActionState } from "react";
import { fieldA11y, Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { signInDevAction, signInWithEmailAction } from "@/server/actions/auth";

export function EmailLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signInWithEmailAction, null);
  const errors = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Field id="email" label={t("auth.emailLabel")} errors={errors.email}>
        <Input {...fieldA11y("email", errors.email)} type="email" inputMode="email" autoComplete="email" required placeholder={t("auth.emailPlaceholder")} className="h-11" />
      </Field>
      <FormError state={state} />
      <SubmitButton size="lg" variant="outline" className="h-11 w-full">
        <Mail /> {t("auth.emailCta")}
      </SubmitButton>
    </form>
  );
}

export function DevLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signInDevAction, null);
  const errors = fieldErrors(state);
  return (
    <form action={action} className="space-y-3" data-testid="dev-login">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Field id="dev-name" label={t("auth.nameLabel")} optional>
        <Input id="dev-name" name="name" autoComplete="name" className="h-11" />
      </Field>
      <Field id="dev-email" label={t("auth.emailLabel")} errors={errors.email}>
        <Input id="dev-email" name="email" type="email" required defaultValue="coach@mytrip.dev" className="h-11" />
      </Field>
      <FormError state={state} />
      <SubmitButton size="lg" variant="secondary" className="h-11 w-full">
        <Zap /> {t("auth.devCta")}
      </SubmitButton>
    </form>
  );
}
