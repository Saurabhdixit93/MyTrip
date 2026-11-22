import type { TripRole } from "@/db/generated/enums";

/**
 * Role → permission matrix. Pure and shared: the server enforces it, the client only uses it to hide buttons.
 * COACH = owner/admin, CO_COACH = manager without payout/delete rights, MEMBER = participant, VIEWER = read-only.
 */
export const PERMISSIONS = {
  "trip.view": ["COACH", "CO_COACH", "MEMBER", "VIEWER"],
  "trip.update": ["COACH", "CO_COACH"],
  "trip.lock": ["COACH"],
  "trip.delete": ["COACH"],
  "trip.payout.update": ["COACH"],
  "invite.manage": ["COACH", "CO_COACH"],
  "member.add": ["COACH", "CO_COACH"],
  "member.remove": ["COACH", "CO_COACH"],
  "member.role.update": ["COACH"],
  "expense.create": ["COACH", "CO_COACH", "MEMBER"],
  "expense.update.own": ["COACH", "CO_COACH", "MEMBER"],
  "expense.update.any": ["COACH", "CO_COACH"],
  "payment.create": ["COACH", "CO_COACH", "MEMBER"],
  "payment.review.any": ["COACH"],
  "audit.view": ["COACH", "CO_COACH"],
} as const satisfies Record<string, readonly TripRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: TripRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly TripRole[]).includes(role);
}

export const ROLE_LABEL: Record<TripRole, string> = {
  COACH: "Coach",
  CO_COACH: "Co-Coach",
  MEMBER: "Member",
  VIEWER: "Viewer",
};
