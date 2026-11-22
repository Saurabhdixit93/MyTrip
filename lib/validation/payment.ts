import { z } from "zod";
import { UTR_REGEX } from "@/lib/upi";
import { checkbox, cuid, optionalText, positiveRupeesInput } from "./common";
import { optionalVpaInput } from "./upi";

export const payoutSchema = z.object({
  tripId: cuid,
  upiVpa: optionalVpaInput,
  upiPayeeName: optionalText(50),
  removeQr: checkbox,
});

export const paymentStages = ["intent", "paid"] as const;
export const paymentMethods = ["UPI", "CASH", "OTHER"] as const;

export const paymentSubmitSchema = z.object({
  tripId: cuid,
  toMemberId: cuid,
  amount: positiveRupeesInput,
  /** Generated once per pay sheet so retries / double taps never create duplicate payments. */
  idempotencyKey: z.uuid(),
  stage: z.enum(paymentStages),
  method: z.enum(paymentMethods).default("UPI"),
  utr: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : undefined))
    .refine((v) => v === undefined || UTR_REGEX.test(v), "UTR is the 12-digit number in your UPI app"),
  note: optionalText(200),
});

export const paymentReviewSchema = z.object({
  tripId: cuid,
  paymentId: cuid,
  decision: z.enum(["approve", "reject"]),
  reason: optionalText(200),
});

export const paymentRefSchema = z.object({ tripId: cuid, paymentId: cuid });

export const recordReceivedSchema = z.object({
  tripId: cuid,
  fromMemberId: cuid,
  amount: positiveRupeesInput,
  idempotencyKey: z.uuid(),
  method: z.enum(paymentMethods).default("CASH"),
  note: optionalText(200),
});
