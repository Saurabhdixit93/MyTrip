import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

/** Label + control + hint/error, wired up with aria-describedby / aria-invalid by the caller via `id`. */
export function Field({
  id,
  label,
  hint,
  errors,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  children: ReactNode;
}) {
  const error = errors?.[0];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? <span className="text-muted-foreground font-normal"> ({t("common.optional")})</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs font-medium" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread on an input inside <Field> so screen readers get the error/hint. */
export function fieldA11y(id: string, errors?: string[], hasHint = false) {
  return {
    id,
    name: id,
    "aria-invalid": errors?.length ? true : undefined,
    "aria-describedby": errors?.length ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}
