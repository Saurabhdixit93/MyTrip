/** Shape returned by every server action (safe to send to the client). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]> };

export const initialActionState: ActionResult<unknown> | null = null;
