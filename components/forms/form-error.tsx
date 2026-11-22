import { AlertCircle } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";

export function FormError({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
      <AlertCircle className="size-4 shrink-0" aria-hidden /> {state.error}
    </p>
  );
}

export function fieldErrors(state: ActionResult<unknown> | null): Record<string, string[]> {
  return state && !state.ok ? (state.fieldErrors ?? {}) : {};
}
