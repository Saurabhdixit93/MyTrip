"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { tripIdSchema, tripInputSchema, tripStatusSchema } from "@/lib/validation/trip";
import { z } from "zod";
import { formToObject, runAction } from "../action";
import { requireActionUser } from "../auth/session";
import { rateLimit } from "../rate-limit";
import { optionalFile } from "../storage/uploads";
import { createTrip, deleteTrip, regenerateInvite, setTripStatus, updateTrip } from "../services/trips";

export async function createTripAction(_prev: unknown, form: FormData): Promise<ActionResult<{ tripId: string }>> {
  const result = await runAction(tripInputSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("trip.create", user.id, 20, "1 h");
    const trip = await createTrip(user, input, optionalFile(form.get("cover")));
    return { tripId: trip.id };
  });
  if (result.ok) {
    revalidatePath("/trips");
    redirect(`/trips/${result.data.tripId}/members?welcome=1`);
  }
  return result;
}

export async function updateTripAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  const schema = tripInputSchema.and(tripIdSchema);
  return runAction(schema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await updateTrip(user, input.tripId, input, optionalFile(form.get("cover")));
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return undefined;
  });
}

export async function setTripStatusAction(input: z.input<typeof tripStatusSchema>) {
  return runAction(tripStatusSchema, input, async ({ tripId, status }) => {
    const user = await requireActionUser();
    await setTripStatus(user, tripId, status);
    revalidatePath(`/trips/${tripId}`, "layout");
    return undefined;
  });
}

export async function deleteTripAction(input: z.input<typeof tripIdSchema>) {
  const result = await runAction(tripIdSchema, input, async ({ tripId }) => {
    const user = await requireActionUser();
    await deleteTrip(user, tripId);
    return undefined;
  });
  if (result.ok) {
    revalidatePath("/trips");
    redirect("/trips");
  }
  return result;
}

const regenerateSchema = tripIdSchema.extend({ enabled: z.boolean() });

export async function regenerateInviteAction(input: z.input<typeof regenerateSchema>) {
  return runAction(regenerateSchema, input, async ({ tripId, enabled }) => {
    const user = await requireActionUser();
    await regenerateInvite(user, tripId, enabled);
    revalidatePath(`/trips/${tripId}`, "layout");
    return undefined;
  });
}
