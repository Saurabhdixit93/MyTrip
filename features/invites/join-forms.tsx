"use client";

import { Check, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { fieldA11y, Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { joinTripAction, resolveInviteCodeAction } from "@/server/actions/invites";
import { cn } from "cn";

export function JoinCodeForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, action] = useActionState(resolveInviteCodeAction, null);
  const errors = fieldErrors(state);
  return (
    <form action={action} className="space-y-4">
      <Field id="code" label={t("join.code")} errors={errors.code}>
        <Input
          {...fieldA11y("code", errors.code)}
          defaultValue={defaultCode}
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          placeholder="K7Q2XM"
          className="font-heading h-14 text-center text-2xl font-bold tracking-[0.4em] uppercase"
        />
      </Field>
      {state && !state.ok && !errors.code ? <FormError state={state} /> : null}
      <SubmitButton size="lg" className="h-12 w-full">
        {t("join.find")}
      </SubmitButton>
    </form>
  );
}

export function JoinTripForm({
  token,
  placeholders,
  signedInName,
}: {
  token: string;
  placeholders: { id: string; displayName: string }[];
  signedInName: string | null;
}) {
  const [state, action] = useActionState(joinTripAction, null);
  const errors = fieldErrors(state);
  const [claim, setClaim] = useState<string>("new");
  const claimed = placeholders.find((p) => p.id === claim);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="claimMemberId" value={claim} />

      {placeholders.length > 0 ? (
        <fieldset className="min-w-0 space-y-2">
          <legend className="mb-2 text-sm font-medium">{t("join.whoAreYou")}</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {[...placeholders, { id: "new", displayName: t("join.newPerson") }].map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={claim === p.id}
                onClick={() => setClaim(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-3 text-start text-sm font-medium transition-colors",
                  claim === p.id ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted",
                )}
              >
                {claim === p.id ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : p.id === "new" ? <UserPlus className="size-4 shrink-0" aria-hidden /> : <span className="size-4" />}
                <span className="truncate">{p.displayName}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {signedInName ? (
        <>
          <input type="hidden" name="displayName" value={signedInName} />
          <p className="text-muted-foreground text-sm">{t("join.signedInAs", { name: signedInName })}</p>
        </>
      ) : (
        <>
          <Field id="displayName" label={t("join.yourName")} errors={errors.displayName}>
            <Input {...fieldA11y("displayName", errors.displayName)} key={claim} defaultValue={claimed?.displayName ?? ""} required autoComplete="name" maxLength={60} className="h-11" />
          </Field>
          <Field id="phone" label={t("join.phoneOptional")} errors={errors.phone}>
            <Input {...fieldA11y("phone", errors.phone)} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className="h-11" />
          </Field>
        </>
      )}

      <FormError state={state} />
      <SubmitButton size="lg" className="h-12 w-full" pendingLabel={t("join.joining")}>
        {t("join.joinCta")}
      </SubmitButton>
    </form>
  );
}
