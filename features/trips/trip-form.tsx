"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { fieldA11y, Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";
import { CoverPicker } from "./cover-picker";

export interface TripFormValues {
  tripId?: string;
  name: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  settlementMode: "PAY_COACH" | "P2P_MINIMIZED";
  coverUrl: string | null;
}

type TripAction = (prev: unknown, form: FormData) => Promise<ActionResult<unknown>>;

export function TripForm({ action, defaults, submitLabel }: { action: TripAction; defaults?: Partial<TripFormValues>; submitLabel: string }) {
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrors(state);
  const [removeCover, setRemoveCover] = useState(false);

  useEffect(() => {
    if (state?.ok && defaults?.tripId) toast.success(t("trips.saved"));
  }, [state, defaults?.tripId]);

  return (
    <form action={formAction} className="space-y-5">
      {defaults?.tripId ? <input type="hidden" name="tripId" value={defaults.tripId} /> : null}
      <input type="hidden" name="removeCover" value={removeCover ? "true" : "false"} />

      <CoverPicker initialUrl={defaults?.coverUrl} errors={errors.coverUrl} onRemove={() => setRemoveCover(true)} />

      <Field id="name" label={t("trips.name")} errors={errors.name}>
        <Input {...fieldA11y("name", errors.name)} defaultValue={defaults?.name} required maxLength={80} placeholder={t("trips.namePlaceholder")} className="h-11" />
      </Field>

      <Field id="destination" label={t("trips.destination")} errors={errors.destination} optional>
        <Input {...fieldA11y("destination", errors.destination)} defaultValue={defaults?.destination} maxLength={80} placeholder={t("trips.destinationPlaceholder")} className="h-11" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="startDate" label={t("trips.startDate")} errors={errors.startDate} optional>
          <Input {...fieldA11y("startDate", errors.startDate)} type="date" defaultValue={defaults?.startDate} className="h-11" />
        </Field>
        <Field id="endDate" label={t("trips.endDate")} errors={errors.endDate} optional>
          <Input {...fieldA11y("endDate", errors.endDate)} type="date" defaultValue={defaults?.endDate} className="h-11" />
        </Field>
      </div>

      <Field id="budget" label={t("trips.budget")} errors={errors.budget} hint={t("trips.budgetHint")} optional>
        <Input {...fieldA11y("budget", errors.budget, true)} inputMode="decimal" defaultValue={defaults?.budget} placeholder="50000" className="h-11" />
      </Field>

      <Field id="description" label={t("trips.description")} errors={errors.description} optional>
        <Textarea {...fieldA11y("description", errors.description)} defaultValue={defaults?.description} maxLength={500} rows={3} placeholder={t("trips.descriptionPlaceholder")} />
      </Field>

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-sm font-medium">{t("trips.settlementMode")}</legend>
        <RadioGroup name="settlementMode" defaultValue={defaults?.settlementMode ?? "PAY_COACH"} className="gap-2">
          {(
            [
              ["PAY_COACH", "trips.modePayCoach", "trips.modePayCoachHint"],
              ["P2P_MINIMIZED", "trips.modeP2P", "trips.modeP2PHint"],
            ] as const
          ).map(([value, label, hint]) => (
            <Label key={value} htmlFor={`mode-${value}`} className="has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-xl border p-3">
              <RadioGroupItem id={`mode-${value}`} value={value} className="mt-0.5" />
              <span>
                <span className="block font-semibold">{t(label)}</span>
                <span className="text-muted-foreground block text-xs font-normal">{t(hint)}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <p className="text-muted-foreground text-xs">{t("trips.currencyNote")}</p>
      </fieldset>

      <FormError state={state} />
      <SubmitButton size="lg" className="h-12 w-full" pendingLabel={t("common.saving")}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
