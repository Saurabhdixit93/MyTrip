import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";
import { cuid, dateInput, optionalText, positiveRupeesInput } from "./common";

const memberValue = z.object({ memberId: cuid, value: z.number().int().nonnegative() });

export const allocationSchema = z.object({
  payers: z
    .array(z.object({ memberId: cuid, amountPaise: z.number().int().nonnegative() }))
    .min(1)
    .max(100),
  split: z.discriminatedUnion("type", [
    z.object({ type: z.literal("EQUAL"), memberIds: z.array(cuid).min(1, "Pick at least one person").max(200) }),
    z.object({ type: z.literal("EXACT"), entries: z.array(memberValue).min(1).max(200) }),
    z.object({ type: z.literal("PERCENTAGE"), entries: z.array(memberValue).min(1).max(200) }),
    z.object({ type: z.literal("SHARES"), entries: z.array(memberValue).min(1).max(200) }),
  ]),
});

export type Allocation = z.output<typeof allocationSchema>;

/** The form posts the payer/split allocation as a JSON string built by the client. */
const allocationJson = z
  .string()
  .max(50_000)
  .transform((v, ctx) => {
    try {
      const parsed: unknown = JSON.parse(v);
      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid split" });
      return z.NEVER;
    }
  })
  .pipe(allocationSchema);

const idList = z
  .union([cuid, z.array(cuid)])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]));

export const expenseInputSchema = z.object({
  tripId: cuid,
  title: z.string().trim().min(1, "Add a short description").max(80),
  amount: positiveRupeesInput,
  category: z.enum(CATEGORIES).default("OTHER"),
  spentAt: dateInput,
  notes: optionalText(500),
  allocation: allocationJson,
  removeAttachmentIds: idList,
});

export type ExpenseInput = z.output<typeof expenseInputSchema>;

export const expenseUpdateSchema = expenseInputSchema.extend({
  expenseId: cuid,
  version: z.coerce.number().int().positive(),
});

export const expenseRefSchema = z.object({ tripId: cuid, expenseId: cuid });
