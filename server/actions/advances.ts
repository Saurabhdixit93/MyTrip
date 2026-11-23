"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { advanceSchema, voidAdvanceSchema } from "@/lib/validation/advance";
import { formToObject, runAction } from "../action";
import { requireActionUser } from "../auth/session";
import { rateLimit } from "../rate-limit";
import { recordAdvance, voidAdvance } from "../services/advances";

export async function recordAdvanceAction(form: FormData): Promise<ActionResult<{ status: string }>> {
  return runAction(advanceSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("payment.submit", user.id, 30, "10 m");
    const advance = await recordAdvance(user, input);
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return { status: advance.status };
  });
}

export async function voidAdvanceAction(input: z.input<typeof voidAdvanceSchema>) {
  return runAction(voidAdvanceSchema, input, async (data) => {
    const user = await requireActionUser();
    await voidAdvance(user, data);
    revalidatePath(`/trips/${data.tripId}`, "layout");
    return undefined;
  });
}
