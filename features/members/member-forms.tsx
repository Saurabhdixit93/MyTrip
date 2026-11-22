"use client";

import { MoreVertical, ShieldCheck, Trash2, UserRound, Eye } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { fieldA11y, Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { addMemberAction, removeMemberAction, updateMemberRoleAction, updateMyMemberProfileAction } from "@/server/actions/members";

export function AddMemberForm({ tripId }: { tripId: string }) {
  const [state, action] = useActionState(addMemberAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = fieldErrors(state);
  useEffect(() => {
    if (state?.ok) {
      toast.success(t("members.added", { name: state.data.name }));
      formRef.current?.reset();
    }
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="displayName" label={t("members.displayName")} errors={errors.displayName}>
          <Input {...fieldA11y("displayName", errors.displayName)} required maxLength={60} className="h-11" />
        </Field>
        <Field id="phone" label={t("members.phone")} errors={errors.phone} optional>
          <Input {...fieldA11y("phone", errors.phone)} type="tel" inputMode="tel" className="h-11" />
        </Field>
      </div>
      <FormError state={state} />
      <SubmitButton variant="secondary" className="w-full">
        {t("members.addCta")}
      </SubmitButton>
    </form>
  );
}

export function MemberActions({
  tripId,
  memberId,
  name,
  role,
  isPlaceholder,
  canChangeRole,
  canRemove,
}: {
  tripId: string;
  memberId: string;
  name: string;
  role: "COACH" | "CO_COACH" | "MEMBER" | "VIEWER";
  isPlaceholder: boolean;
  canChangeRole: boolean;
  canRemove: boolean;
}) {
  const [pending, start] = useTransition();
  const setRole = (next: "CO_COACH" | "MEMBER" | "VIEWER") =>
    start(async () => {
      const res = await updateMemberRoleAction({ tripId, memberId, role: next });
      if (res.ok) toast.success(t("members.roleUpdated"));
      else toast.error(res.error);
    });
  const remove = () => {
    if (!window.confirm(t("members.removeConfirm", { name }))) return;
    start(async () => {
      const res = await removeMemberAction({ tripId, memberId });
      if (res.ok) toast.success(t("members.removed"));
      else toast.error(res.error);
    });
  };
  if (role === "COACH" || (!canChangeRole && !canRemove)) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label={`${t("members.actions")}: ${name}`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canChangeRole && !isPlaceholder ? (
          <>
            {role !== "CO_COACH" ? (
              <DropdownMenuItem onClick={() => setRole("CO_COACH")}>
                <ShieldCheck /> {t("members.makeCoCoach")}
              </DropdownMenuItem>
            ) : null}
            {role !== "MEMBER" ? (
              <DropdownMenuItem onClick={() => setRole("MEMBER")}>
                <UserRound /> {t("members.makeMember")}
              </DropdownMenuItem>
            ) : null}
            {role !== "VIEWER" ? (
              <DropdownMenuItem onClick={() => setRole("VIEWER")}>
                <Eye /> {t("members.makeViewer")}
              </DropdownMenuItem>
            ) : null}
            {canRemove ? <DropdownMenuSeparator /> : null}
          </>
        ) : null}
        {canRemove ? (
          <DropdownMenuItem variant="destructive" onClick={remove}>
            <Trash2 /> {t("members.remove")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MyProfileForm({ tripId, displayName, upiVpa }: { tripId: string; displayName: string; upiVpa: string | null }) {
  const [state, action] = useActionState(updateMyMemberProfileAction, null);
  const errors = fieldErrors(state);
  useEffect(() => {
    if (state?.ok) toast.success(t("account.saved"));
  }, [state]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tripId" value={tripId} />
      <Field id="my-displayName" label={t("members.displayName")} errors={errors.displayName}>
        <Input id="my-displayName" name="displayName" defaultValue={displayName} required maxLength={60} className="h-11" aria-invalid={errors.displayName ? true : undefined} />
      </Field>
      <Field id="my-upiVpa" label={t("members.myUpi")} hint={t("members.myUpiHint")} errors={errors.upiVpa} optional>
        <Input id="my-upiVpa" name="upiVpa" defaultValue={upiVpa ?? ""} autoCapitalize="none" spellCheck={false} placeholder="name@okhdfcbank" className="h-11" aria-invalid={errors.upiVpa ? true : undefined} />
      </Field>
      <FormError state={state} />
      <SubmitButton variant="secondary" className="w-full">
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}
