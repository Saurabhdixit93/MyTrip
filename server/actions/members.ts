"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { addMemberSchema, memberRoleSchema, myMemberProfileSchema, removeMemberSchema } from "@/lib/validation/member";
import { formToObject, runAction } from "../action";
import { requireActionUser } from "../auth/session";
import { addPlaceholderMember, removeMember, updateMemberRole, updateMyMemberProfile } from "../services/members";

export async function addMemberAction(_prev: unknown, form: FormData): Promise<ActionResult<{ name: string }>> {
  return runAction(addMemberSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    const m = await addPlaceholderMember(user, input.tripId, input);
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return { name: m.displayName };
  });
}

export async function removeMemberAction(input: z.input<typeof removeMemberSchema>) {
  return runAction(removeMemberSchema, input, async ({ tripId, memberId }) => {
    const user = await requireActionUser();
    await removeMember(user, tripId, memberId);
    revalidatePath(`/trips/${tripId}`, "layout");
    return undefined;
  });
}

export async function updateMemberRoleAction(input: z.input<typeof memberRoleSchema>) {
  return runAction(memberRoleSchema, input, async ({ tripId, memberId, role }) => {
    const user = await requireActionUser();
    await updateMemberRole(user, tripId, memberId, role);
    revalidatePath(`/trips/${tripId}`, "layout");
    return undefined;
  });
}

export async function updateMyMemberProfileAction(_prev: unknown, form: FormData): Promise<ActionResult<undefined>> {
  return runAction(myMemberProfileSchema, formToObject(form), async (input) => {
    const user = await requireActionUser();
    await updateMyMemberProfile(user, input.tripId, input);
    revalidatePath(`/trips/${input.tripId}`, "layout");
    return undefined;
  });
}
