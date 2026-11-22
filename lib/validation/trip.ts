import { z } from "zod";
import { cuid, optionalDateInput, optionalRupeesInput, optionalText, checkbox } from "./common";

export const settlementModes = ["PAY_COACH", "P2P_MINIMIZED"] as const;

export const tripInputSchema = z
  .object({
    name: z.string().trim().min(2, "Give your trip a name").max(80),
    destination: optionalText(80),
    description: optionalText(500),
    startDate: optionalDateInput,
    endDate: optionalDateInput,
    budget: optionalRupeesInput,
    settlementMode: z.enum(settlementModes).default("PAY_COACH"),
    removeCover: checkbox,
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: "End date can't be before the start date",
    path: ["endDate"],
  });

export type TripInput = z.output<typeof tripInputSchema>;

export const tripIdSchema = z.object({ tripId: cuid });

export const tripStatusSchema = z.object({
  tripId: cuid,
  status: z.enum(["ACTIVE", "LOCKED", "ARCHIVED"]),
});
