"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { inviteCodeSchema, joinTripSchema } from "@/lib/validation/member";
import { formToObject, runAction } from "../action";
import { signIn } from "../auth";
import { getCurrentUser } from "../auth/session";
import { AppError } from "../errors";
import { clientIp, rateLimit } from "../rate-limit";
import { findTokenByCode, joinTrip } from "../services/invites";

export async function resolveInviteCodeAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const result = await runAction(inviteCodeSchema, formToObject(form), async ({ code }) => {
    // Codes are short, so throttle guessing.
    await rateLimit("invite.code", await clientIp(), 10, "1 m");
    const token = await findTokenByCode(code);
    if (!token) throw new AppError("NOT_FOUND", "No active trip with that code. Check it with your Coach.", { code: ["No active trip with that code"] });
    return token;
  });
  if (result.ok) redirect(`/join/${result.data}`);
  return result;
}

export async function joinTripAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const result = await runAction(joinTripSchema, formToObject(form), async (input) => {
    await rateLimit("invite.join", await clientIp(), 20, "10 m");
    const user = await getCurrentUser();
    return joinTrip(user, input);
  });
  if (!result.ok) return result;
  const { tripId, guestToken } = result.data;
  const redirectTo = `/trips/${tripId}?joined=1`;
  if (guestToken) await signIn("guest", { token: guestToken, redirectTo });
  redirect(redirectTo);
}
