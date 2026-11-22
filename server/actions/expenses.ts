"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { expenseInputSchema, expenseRefSchema, expenseUpdateSchema } from "@/lib/validation/expense";
import { formToObject, runAction } from "../action";
import { requireActionUser } from "../auth/session";
import { rateLimit } from "../rate-limit";
import { optionalFile } from "../storage/uploads";
import { createExpense, deleteExpense, updateExpense } from "../services/expenses";

function receiptFiles(form: FormData): File[] {
  return form.getAll("receipts").flatMap((v) => {
    const f = optionalFile(v);
    return f ? [f] : [];
  });
}

export async function createExpenseAction(_prev: unknown, form: FormData): Promise<ActionResult<{ tripId: string }>> {
  const result = await runAction(expenseInputSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("expense.write", user.id, 60, "1 m");
    await createExpense(user, input, receiptFiles(form));
    return { tripId: input.tripId };
  });
  if (result.ok) {
    revalidatePath(`/trips/${result.data.tripId}`, "layout");
    redirect(`/trips/${result.data.tripId}/expenses?saved=1`);
  }
  return result;
}

export async function updateExpenseAction(_prev: unknown, form: FormData): Promise<ActionResult<{ tripId: string; expenseId: string }>> {
  const result = await runAction(expenseUpdateSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await rateLimit("expense.write", user.id, 60, "1 m");
    await updateExpense(user, input, receiptFiles(form));
    return { tripId: input.tripId, expenseId: input.expenseId };
  });
  if (result.ok) {
    revalidatePath(`/trips/${result.data.tripId}`, "layout");
    redirect(`/trips/${result.data.tripId}/expenses/${result.data.expenseId}?saved=1`);
  }
  return result;
}

export async function deleteExpenseAction(input: z.input<typeof expenseRefSchema>) {
  const result = await runAction(expenseRefSchema, input, async ({ tripId, expenseId }) => {
    const user = await requireActionUser();
    await deleteExpense(user, tripId, expenseId);
    return { tripId };
  });
  if (result.ok) {
    revalidatePath(`/trips/${result.data.tripId}`, "layout");
    redirect(`/trips/${result.data.tripId}/expenses?deleted=1`);
  }
  return result;
}
