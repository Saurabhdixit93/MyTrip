import { z } from "zod";
import { cuid, personName, phoneInput } from "./common";
import { optionalVpaInput } from "./upi";

export const addMemberSchema = z.object({
  tripId: cuid,
  displayName: personName,
  phone: phoneInput,
});

export const memberRoleSchema = z.object({
  tripId: cuid,
  memberId: cuid,
  role: z.enum(["CO_COACH", "MEMBER", "VIEWER"]),
});

export const removeMemberSchema = z.object({ tripId: cuid, memberId: cuid });

export const myMemberProfileSchema = z.object({
  tripId: cuid,
  displayName: personName,
  upiVpa: optionalVpaInput,
});

export const joinTripSchema = z.object({
  token: z.string().min(16).max(64),
  displayName: personName,
  phone: phoneInput,
  claimMemberId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "new" ? v : undefined))
    .pipe(cuid.optional()),
});

export const inviteCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .pipe(z.string().length(6, "Codes are 6 characters")),
});
