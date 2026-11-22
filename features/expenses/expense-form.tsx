"use client";

import { useActionState, useMemo, useState } from "react";
import { fieldA11y, Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { MemberAvatar } from "@/components/member-avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { CATEGORIES, CATEGORY_EMOJI } from "@/lib/categories";
import { paiseToRupeeString, parseRupeesToPaise } from "@/lib/domain/money";
import type { SplitType } from "@/lib/domain/split";
import { formatPaise } from "@/lib/format";
import { t, type MessageKey } from "@/lib/i18n";
import { cn } from "cn";
import { ReceiptsInput } from "./receipts-input";
import { buildPreview, initialSplitState, type Member, type PayerState, type SplitState } from "./split-state";

export interface ExpenseFormDefaults {
  expenseId: string;
  version: number;
  title: string;
  amount: string;
  category: (typeof CATEGORIES)[number];
  spentAt: string;
  notes: string;
  splitType: SplitType;
  splits: { memberId: string; amountPaise: number; weight: number }[];
  payers: { memberId: string; amountPaise: number }[];
  attachments: { id: string; url: string }[];
}

type ExpenseAction = (prev: unknown, form: FormData) => Promise<ActionResult<unknown>>;

const SPLIT_TYPES: SplitType[] = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"];
const PROBLEM_KEY: Record<NonNullable<ReturnType<typeof buildPreview>["problem"]>["key"], MessageKey> = {
  leftToAssign: "expenses.leftToAssign",
  overAssigned: "expenses.overAssigned",
  percentLeft: "expenses.percentLeft",
  percentOver: "expenses.percentOver",
  payersLeft: "expenses.payersLeft",
  payersOver: "expenses.payersOver",
  pickSomeone: "expenses.pickSomeone",
  enterAmount: "expenses.enterAmountFirst",
};

export function ExpenseForm({
  action,
  tripId,
  members,
  meId,
  today,
  defaults,
  maxReceipts,
  loadSharedReceipt,
}: {
  action: ExpenseAction;
  tripId: string;
  members: Member[];
  meId: string;
  today: string;
  defaults?: ExpenseFormDefaults;
  maxReceipts: number;
  loadSharedReceipt?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const errors = fieldErrors(state);
  const [amount, setAmount] = useState(defaults?.amount ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(defaults?.category ?? "FOOD");
  const [split, setSplit] = useState<SplitState>(() => initialSplitState(members, defaults ? { type: defaults.splitType, splits: defaults.splits } : undefined));
  const [payers, setPayers] = useState<PayerState>(() => {
    const multiple = (defaults?.payers.length ?? 1) > 1;
    return {
      multiple,
      single: defaults?.payers[0]?.memberId ?? meId,
      amounts: Object.fromEntries((defaults?.payers ?? []).map((p) => [p.memberId, paiseToRupeeString(p.amountPaise)])),
    };
  });

  const totalPaise = parseRupeesToPaise(amount);
  const preview = useMemo(() => buildPreview(totalPaise, members, split, payers), [totalPaise, members, split, payers]);
  const problem = preview.problem && preview.problem.key !== "enterAmount" ? preview.problem : null;
  const problemText = (p: NonNullable<typeof problem>) =>
    t(PROBLEM_KEY[p.key], p.key.startsWith("percent") ? { percent: (p.value ?? 0) / 100 } : { amount: formatPaise(p.value ?? 0) });

  const setMap = (key: "exact" | "percent" | "shares", id: string, value: string) => setSplit((s) => ({ ...s, [key]: { ...s[key], [id]: value } }));
  const toggleParticipant = (id: string, on: boolean) =>
    setSplit((s) => ({ ...s, participants: on ? [...new Set([...s.participants, id])] : s.participants.filter((p) => p !== id) }));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="allocation" value={preview.allocation ? JSON.stringify(preview.allocation) : ""} />
      {defaults ? (
        <>
          <input type="hidden" name="expenseId" value={defaults.expenseId} />
          <input type="hidden" name="version" value={defaults.version} />
        </>
      ) : null}

      {/* Amount */}
      <div className="bg-card rounded-3xl border p-5 text-center">
        <Label htmlFor="amount" className="text-muted-foreground justify-center text-sm">
          {t("expenses.amount")}
        </Label>
        <div className="mt-1 flex items-center justify-center gap-1">
          <span className="font-heading text-muted-foreground text-3xl font-bold" aria-hidden>
            ₹
          </span>
          <input
            {...fieldA11y("amount", errors.amount)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="0"
            autoFocus={!defaults}
            className="font-heading tabular w-full max-w-[12ch] bg-transparent text-center text-5xl font-extrabold outline-none placeholder:text-muted-foreground/40"
          />
        </div>
        {errors.amount ? (
          <p id="amount-error" role="alert" className="text-destructive mt-1 text-xs font-medium">
            {errors.amount[0]}
          </p>
        ) : null}
      </div>

      <Field id="title" label={t("expenses.what")} errors={errors.title}>
        <Input {...fieldA11y("title", errors.title)} defaultValue={defaults?.title} required maxLength={80} placeholder={t("expenses.whatPlaceholder")} className="h-11" />
      </Field>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">{t("expenses.category")}</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label={t("expenses.category")}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <Field id="spentAt" label={t("expenses.date")} errors={errors.spentAt}>
        <Input {...fieldA11y("spentAt", errors.spentAt)} type="date" defaultValue={defaults?.spentAt ?? today} required className="h-11" />
      </Field>

      {/* Paid by */}
      <section className="space-y-3" aria-labelledby="paidby-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="paidby-heading" className="text-sm font-medium">
            {t("expenses.paidBy")}
          </h2>
          <Label className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
            {t("expenses.multiplePayers")}
            <Switch checked={payers.multiple} onCheckedChange={(multiple) => setPayers((p) => ({ ...p, multiple }))} />
          </Label>
        </div>
        {payers.multiple ? (
          <ul className="bg-card divide-y rounded-2xl border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                <MemberAvatar id={m.id} name={m.displayName} className="size-8" />
                <span className="flex-1 truncate text-sm">{m.id === meId ? t("common.you") : m.displayName}</span>
                <div className="relative w-28">
                  <span className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-sm">₹</span>
                  <Input
                    aria-label={`${t("expenses.paidBy")}: ${m.displayName}`}
                    inputMode="decimal"
                    value={payers.amounts[m.id] ?? ""}
                    onChange={(e) => setPayers((p) => ({ ...p, amounts: { ...p.amounts, [m.id]: e.target.value } }))}
                    placeholder="0"
                    className="tabular ps-6 text-end"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <select
            aria-labelledby="paidby-heading"
            value={payers.single}
            onChange={(e) => setPayers((p) => ({ ...p, single: e.target.value }))}
            className="border-input bg-background focus-visible:ring-ring/50 h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === meId ? `${t("common.you")} (${m.displayName})` : m.displayName}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Split */}
      <section className="space-y-3" aria-labelledby="split-heading">
        <h2 id="split-heading" className="text-sm font-medium">
          {t("expenses.splitHow")}
        </h2>
        <div role="tablist" aria-label={t("expenses.splitHow")} className="bg-muted grid grid-cols-4 gap-1 rounded-xl p-1">
          {SPLIT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={split.type === type}
              onClick={() => setSplit((s) => ({ ...s, type }))}
              className={cn("rounded-lg py-2 text-xs font-semibold transition-colors sm:text-sm", split.type === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t(`expenses.split${type}`)}
            </button>
          ))}
        </div>

        {split.type === "EQUAL" ? (
          <div className="flex gap-3 text-xs">
            <button type="button" className="text-primary font-semibold" onClick={() => setSplit((s) => ({ ...s, participants: members.map((m) => m.id) }))}>
              {t("expenses.selectAll")}
            </button>
            <button type="button" className="text-muted-foreground font-semibold" onClick={() => setSplit((s) => ({ ...s, participants: [] }))}>
              {t("expenses.selectNone")}
            </button>
          </div>
        ) : null}

        <ul className="bg-card divide-y rounded-2xl border">
          {members.map((m) => {
            const share = preview.shares[m.id];
            const name = m.id === meId ? t("common.you") : m.displayName;
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                {split.type === "EQUAL" ? (
                  <Checkbox id={`p-${m.id}`} checked={split.participants.includes(m.id)} onCheckedChange={(v) => toggleParticipant(m.id, v === true)} aria-label={name} />
                ) : null}
                <MemberAvatar id={m.id} name={m.displayName} className="size-8" />
                <label htmlFor={split.type === "EQUAL" ? `p-${m.id}` : `v-${m.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{name}</span>
                  {split.type !== "EQUAL" && share !== undefined ? <span className="text-muted-foreground tabular block text-xs">{formatPaise(share)}</span> : null}
                </label>
                {split.type === "EQUAL" ? (
                  <span className="tabular text-muted-foreground text-sm">{share !== undefined ? formatPaise(share) : "–"}</span>
                ) : (
                  <div className="relative w-28">
                    {split.type === "EXACT" ? <span className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-sm">₹</span> : null}
                    <Input
                      id={`v-${m.id}`}
                      inputMode={split.type === "SHARES" ? "numeric" : "decimal"}
                      value={(split.type === "EXACT" ? split.exact[m.id] : split.type === "PERCENTAGE" ? split.percent[m.id] : split.shares[m.id]) ?? ""}
                      onChange={(e) => setMap(split.type === "EXACT" ? "exact" : split.type === "PERCENTAGE" ? "percent" : "shares", m.id, e.target.value)}
                      placeholder="0"
                      className={cn("tabular text-end", split.type === "EXACT" && "ps-6", split.type === "PERCENTAGE" && "pe-7")}
                    />
                    {split.type === "PERCENTAGE" ? <span className="text-muted-foreground pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm">%</span> : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p role="status" aria-live="polite" className={cn("text-sm font-medium", problem ? "text-destructive" : "text-muted-foreground")}>
          {preview.problem?.key === "enterAmount"
            ? t("expenses.enterAmountFirst")
            : problem
              ? problemText(problem)
              : split.type === "EQUAL" && totalPaise
                ? t("expenses.splitBetween", { count: split.participants.length })
                : null}
        </p>
        {errors.allocation ? (
          <p role="alert" className="text-destructive text-sm font-medium">
            {errors.allocation[0]}
          </p>
        ) : null}
      </section>

      <Field id="notes" label={t("expenses.notes")} errors={errors.notes} optional>
        <Textarea {...fieldA11y("notes", errors.notes)} defaultValue={defaults?.notes} maxLength={500} rows={2} placeholder={t("expenses.notesPlaceholder")} />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t("expenses.receipts")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
        </p>
        <ReceiptsInput existing={defaults?.attachments ?? []} max={maxReceipts} loadShared={loadSharedReceipt} />
      </div>

      <FormError state={state && !state.ok && !errors.allocation ? state : null} />
      <SubmitButton size="lg" className="h-12 w-full rounded-xl" disabled={!preview.allocation} pendingLabel={t("common.saving")}>
        {t("expenses.save")}
      </SubmitButton>
    </form>
  );
}
