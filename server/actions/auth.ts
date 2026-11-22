"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { formToObject, runAction } from "../action";
import { signIn, signOut } from "../auth";
import { rememberGuestForUpgrade } from "../auth/guest-merge";
import { getCurrentUser } from "../auth/session";
import { clientIp, rateLimit } from "../rate-limit";

/** Only allow same-origin relative redirects after login. */
const callbackUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/trips"));

async function prepareUpgrade() {
  const current = await getCurrentUser();
  if (current?.isGuest) await rememberGuestForUpgrade(current.id);
}

export async function signInWithGoogleAction(form: FormData) {
  const { callbackUrl: redirectTo } = z.object({ callbackUrl }).parse(formToObject(form));
  await prepareUpgrade();
  await signIn("google", { redirectTo });
}

const emailSchema = z.object({ email: z.email("Enter a valid email").max(254), callbackUrl });

export async function signInWithEmailAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const result = await runAction(emailSchema, formToObject(form), async (input) => {
    await rateLimit("auth.email", await clientIp(), 5, "10 m");
    return input;
  });
  if (!result.ok) return result;
  await prepareUpgrade();
  await signIn("resend", { email: result.data.email.toLowerCase(), redirectTo: result.data.callbackUrl });
  return { ok: true, data: undefined };
}

const devSchema = z.object({ email: z.email("Enter a valid email"), name: z.string().trim().max(60).optional(), callbackUrl });

export async function signInDevAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const result = await runAction(devSchema, formToObject(form), async (input) => input);
  if (!result.ok) return result;
  await prepareUpgrade();
  await signIn("dev", { email: result.data.email, name: result.data.name ?? "", redirectTo: result.data.callbackUrl });
  return { ok: true, data: undefined };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
