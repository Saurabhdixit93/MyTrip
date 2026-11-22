"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { personName, phoneInput } from "@/lib/validation/common";
import { formToObject, runAction } from "../action";
import { signOut } from "../auth";
import { requireActionUser } from "../auth/session";
import { deleteAccount, updateProfile } from "../services/account";

const profileSchema = z.object({ name: personName, phone: phoneInput });

export async function updateProfileAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return runAction(profileSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await updateProfile(user, input);
    revalidatePath("/account");
    return undefined;
  });
}

const deleteSchema = z.object({ confirm: z.literal("DELETE", "Type DELETE to confirm") });

export async function deleteAccountAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const result = await runAction(deleteSchema, formToObject(form), async () => {
    const user = await requireActionUser();
    await deleteAccount(user);
    return undefined;
  });
  if (result.ok) await signOut({ redirectTo: "/" });
  return result;
}
