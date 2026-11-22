"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { paymentRefSchema, paymentReviewSchema, paymentSubmitSchema, payoutSchema, recordReceivedSchema } from "@/lib/validation/payment";
import { formToObject, runAction } from "../action";
import { requireActionUser } from "../auth/session";
import { rateLimit } from "../rate-limit";
import { optionalFile } from "../storage/uploads";
import { cancelPayment, recordReceivedPayment, reviewPayment, submitPayment, updatePayout } from "../services/payments";

export async function updatePayoutAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return runAction(payoutSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await updatePayout(user, input, optionalFile(form.get("upiQr")));
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return undefined;
  });
}

export async function submitPaymentAction(form: FormData): Promise<ActionResult<{ paymentId: string; status: string }>> {
  return runAction(paymentSubmitSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("payment.submit", user.id, 30, "10 m");
    const payment = await submitPayment(user, input, optionalFile(form.get("proof")));
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return { paymentId: payment.id, status: payment.status };
  });
}

export async function reviewPaymentAction(input: z.input<typeof paymentReviewSchema>) {
  return runAction(paymentReviewSchema, input, async (data) => {
    const user = await requireActionUser();
    await reviewPayment(user, data);
    revalidatePath(`/trips/${data.tripId}`, "layout");
    return undefined;
  });
}

export async function cancelPaymentAction(input: z.input<typeof paymentRefSchema>) {
  return runAction(paymentRefSchema, input, async (data) => {
    const user = await requireActionUser();
    await cancelPayment(user, data);
    revalidatePath(`/trips/${data.tripId}`, "layout");
    return undefined;
  });
}

export async function recordReceivedAction(form: FormData): Promise<ActionResult<undefined>> {
  return runAction(recordReceivedSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("payment.submit", user.id, 30, "10 m");
    await recordReceivedPayment(user, input);
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return undefined;
  });
}
