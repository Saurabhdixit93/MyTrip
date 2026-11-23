import { z } from "zod";
import { cuid, dateInput, optionalText, positiveRupeesInput } from "./common";
import { paymentMethods } from "./payment";

export const advanceSchema = z
  .object({
    tripId: cuid,
    fromMemberId: cuid,
    toMemberId: cuid,
    amount: positiveRupeesInput,
    paidOn: dateInput,
    method: z.enum(paymentMethods).default("CASH"),
    note: optionalText(200),
    /** One key per form session so a double tap never records the advance twice. */
    idempotencyKey: z.uuid(),
  })
  .refine((v) => v.fromMemberId !== v.toMemberId, { message: "Pick two different people", path: ["toMemberId"] });

export const voidAdvanceSchema = z.object({
  tripId: cuid,
  paymentId: cuid,
  reason: optionalText(200),
});
