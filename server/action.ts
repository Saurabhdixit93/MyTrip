import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AppError } from "./errors";

/**
 * Runs a server action body with Zod validation and uniform error handling.
 * Redirects (from `redirect()`) are re-thrown so Next can perform them.
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  handler: (data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const fieldErrors: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(flat.fieldErrors)) if (Array.isArray(v) && v.length) fieldErrors[k] = v;
    return { ok: false, code: "VALIDATION", error: flat.formErrors[0] ?? Object.values(fieldErrors)[0]?.[0] ?? "Please check the form.", fieldErrors };
  }
  try {
    return { ok: true, data: await handler(parsed.data) };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof AppError) return { ok: false, code: err.code, error: err.message, fieldErrors: err.fieldErrors };
    console.error("[action] unexpected error", err);
    return { ok: false, code: "INTERNAL", error: "Something went wrong. Please try again." };
  }
}

/** FormData → plain object (repeated keys become arrays, files kept as File). */
export function formToObject(form: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of form.entries()) {
    const prev = out[key];
    if (prev === undefined) out[key] = value;
    else out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  }
  return out;
}
