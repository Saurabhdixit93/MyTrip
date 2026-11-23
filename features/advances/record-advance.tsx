"use client";

import { HandCoins } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";
import { recordAdvanceAction } from "@/server/actions/advances";

interface Person {
  id: string;
  name: string;
}

const selectClass = "border-input bg-background focus-visible:ring-ring/50 h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

/**
 * Record money handed over up front. Managers (Coach) can record for anyone; members record
 * advances they gave (needs the receiver's approval) or received (counts immediately).
 */
export function RecordAdvance({
  tripId,
  members,
  meId,
  coachId,
  isManager,
  today,
  defaultOpen = false,
}: {
  tripId: string;
  members: Person[];
  meId: string;
  coachId: string | null;
  isManager: boolean;
  today: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [key, setKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const receiverDefault = coachId && coachId !== meId ? coachId : (members.find((m) => m.id !== meId)?.id ?? "");
  const giverDefault = isManager ? (members.find((m) => m.id !== (coachId ?? meId))?.id ?? meId) : meId;
  const [from, setFrom] = useState(giverDefault);
  const [to, setTo] = useState(isManager ? (coachId ?? meId) : receiverDefault);
  const name = (id: string) => (id === meId ? `${members.find((m) => m.id === id)?.name ?? ""} (${t("advances.you")})` : (members.find((m) => m.id === id)?.name ?? ""));

  const submit = () =>
    start(async () => {
      if (!formRef.current) return;
      const res = await recordAdvanceAction(new FormData(formRef.current));
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.data.status === "VERIFIED" ? t("advances.saved") : t("advances.savedPending", { name: members.find((m) => m.id === to)?.name ?? "" }));
      setErrors({});
      setOpen(false);
      setKey(crypto.randomUUID());
      formRef.current.reset();
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="w-full rounded-2xl" data-testid="record-advance">
          <HandCoins /> {t("advances.record")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-3xl pb-safe">
        <SheetHeader>
          <SheetTitle>{t("advances.recordTitle")}</SheetTitle>
          <SheetDescription>{t("advances.recordBody")}</SheetDescription>
        </SheetHeader>
        <form
          ref={formRef}
          className="space-y-4 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="idempotencyKey" value={key} />

          <div className="grid grid-cols-2 gap-3">
            <Field id="adv-from" label={t("advances.from")} errors={errors.fromMemberId}>
              {isManager ? (
                <select id="adv-from" name="fromMemberId" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {name(m.id)}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="hidden" name="fromMemberId" value={meId} />
                  <p id="adv-from" className="bg-muted flex h-11 items-center rounded-lg px-3 text-sm">
                    {name(meId)}
                  </p>
                </>
              )}
            </Field>
            <Field id="adv-to" label={t("advances.to")} errors={errors.toMemberId}>
              <select id="adv-to" name="toMemberId" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
                {members
                  .filter((m) => m.id !== from)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {name(m.id)}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          <Field id="adv-amount" label={t("advances.amount")} errors={errors.amount}>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-lg font-semibold">₹</span>
              <Input id="adv-amount" name="amount" inputMode="decimal" required placeholder="5000" className="tabular h-12 ps-8 text-xl font-bold" aria-invalid={errors.amount ? true : undefined} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="adv-date" label={t("advances.date")} errors={errors.paidOn}>
              <Input id="adv-date" name="paidOn" type="date" defaultValue={today} required className="h-11" />
            </Field>
            <Field id="adv-method" label={t("advances.method")}>
              <select id="adv-method" name="method" defaultValue="CASH" className={selectClass}>
                <option value="CASH">{t("payments.methodCASH")}</option>
                <option value="UPI">{t("payments.methodUPI")}</option>
                <option value="OTHER">{t("payments.methodOTHER")}</option>
              </select>
            </Field>
          </div>

          <Field id="adv-note" label={t("advances.note")} optional>
            <Textarea id="adv-note" name="note" maxLength={200} rows={2} placeholder={t("advances.notePlaceholder")} />
          </Field>

          <Button type="submit" size="lg" className="h-12 w-full rounded-2xl" disabled={pending} data-testid="save-advance">
            {pending ? t("common.saving") : t("advances.save")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
