import { z } from "zod";
import { parseRupeesToPaise } from "@/lib/domain/money";

/** Empty strings from forms become undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Use a valid date");

export const optionalDateInput = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(dateInput.optional());

/** Rupee amount typed by a user → integer paise. */
export const rupeesInput = z.string().transform((v, ctx) => {
  const paise = parseRupeesToPaise(v);
  if (paise === null) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount (max 2 decimals)" });
    return z.NEVER;
  }
  return paise;
});

export const positiveRupeesInput = rupeesInput.refine((p) => p > 0, "Amount must be more than ₹0");

export const optionalRupeesInput = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v : undefined))
  .pipe(rupeesInput.optional());

/** Indian mobile number, normalised to +91XXXXXXXXXX. */
export const phoneInput = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const digits = v.replace(/[^\d]/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
      return z.NEVER;
    }
    return `+91${digits}`;
  });

export const personName = z.string().trim().min(1, "Enter a name").max(60, "Keep it under 60 characters");

export const cuid = z.string().regex(/^[a-z0-9]{20,32}$/i, "Invalid id");

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");
