import { z } from "zod";
import { isValidVpa, normalizeVpa } from "@/lib/upi";

export const vpaInput = z
  .string()
  .trim()
  .transform(normalizeVpa)
  .refine(isValidVpa, "Enter a valid UPI ID, like name@okhdfcbank");

export const optionalVpaInput = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v : undefined))
  .pipe(vpaInput.optional());
