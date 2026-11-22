"use client";

import { CheckCircle2, Copy, ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { fieldA11y, Field } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { copyText } from "@/lib/client/clipboard";
import { useIsMobile } from "@/lib/client/device";
import { paiseToRupeeString, parseRupeesToPaise } from "@/lib/domain/money";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { buildUpiLink, isValidVpa } from "@/lib/upi";
import { submitPaymentAction } from "@/server/actions/payments";

export interface Payee {
  memberId: string;
  name: string;
  vpa: string | null;
  payeeName: string;
  staticQrUrl: string | null;
}

export function PaySheet({ tripId, tripName, payee, duePaise, payerName }: { tripId: string; tripName: string; payee: Payee; duePaise: number; payerName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(paiseToRupeeString(duePaise));
  const [step, setStep] = useState<"pay" | "confirm">("pay");
  const [pending, start] = useTransition();
  const [fieldErr, setFieldErr] = useState<Record<string, string[]>>({});
  // One key per sheet session: retries and double taps resolve to the same payment.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const isMobile = useIsMobile();

  const amountPaise = parseRupeesToPaise(amount);
  const amountValid = amountPaise !== null && amountPaise > 0 && amountPaise <= duePaise;
  const vpaOk = Boolean(payee.vpa && isValidVpa(payee.vpa));
  const upiLink = useMemo(
    () =>
      vpaOk && amountValid && payee.vpa
        ? buildUpiLink({ vpa: payee.vpa, payeeName: payee.payeeName, amountPaise: amountPaise ?? 0, note: `${tripName} - ${payerName}` })
        : null,
    [vpaOk, amountValid, payee.vpa, payee.payeeName, amountPaise, tripName, payerName],
  );

  const baseForm = (stage: "intent" | "paid") => {
    const fd = stage === "paid" && formRef.current ? new FormData(formRef.current) : new FormData();
    fd.set("tripId", tripId);
    fd.set("toMemberId", payee.memberId);
    fd.set("amount", amount);
    fd.set("idempotencyKey", idempotencyKey);
    fd.set("stage", stage);
    if (stage === "intent") fd.set("method", "UPI");
    return fd;
  };

  const recordIntent = () => {
    // Fire-and-forget: creating the PENDING record must never block opening the UPI app.
    void submitPaymentAction(baseForm("intent"));
    setStep("confirm");
  };

  const submitPaid = () =>
    start(async () => {
      const res = await submitPaymentAction(baseForm("paid"));
      if (!res.ok) {
        setFieldErr(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(t("payments.submitted", { name: payee.name }));
      setOpen(false);
      setStep("pay");
      setIdempotencyKey(crypto.randomUUID());
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="bg-highlight text-highlight-foreground hover:bg-highlight/90 rounded-full font-semibold" data-testid={`pay-${payee.memberId}`}>
          <Wallet /> {t("payments.pay")}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-3xl pb-safe">
        <SheetHeader>
          <SheetTitle>{t("payments.payTitle", { name: payee.name })}</SheetTitle>
          <SheetDescription>{t("payments.maxDue", { amount: formatPaise(duePaise) })}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <Field id="pay-amount" label={t("payments.amount")} hint={t("payments.partialHint")} errors={fieldErr.amount ?? (amountPaise !== null && amountPaise > duePaise ? [t("payments.maxDue", { amount: formatPaise(duePaise) })] : undefined)}>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-lg font-semibold">₹</span>
              <Input {...fieldA11y("pay-amount", fieldErr.amount, true)} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="tabular h-12 ps-8 text-xl font-bold" />
            </div>
          </Field>

          {step === "pay" ? (
            vpaOk && upiLink ? (
              <div className="space-y-4">
                {isMobile ? (
                  <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base">
                    <a href={upiLink} onClick={recordIntent} data-testid="upi-pay-now">
                      <ExternalLink /> {t("payments.payNow")}
                    </a>
                  </Button>
                ) : null}
                <details open={!isMobile} className="group rounded-2xl border p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold">{t("payments.scanQr")}</summary>
                  <div className="mx-auto mt-3 max-w-56 space-y-2 text-center">
                    <QrCode value={upiLink} label={t("payments.qrAmount", { amount: formatPaise(amountPaise ?? 0) })} />
                    <p className="text-muted-foreground text-xs">{t("payments.qrAmount", { amount: formatPaise(amountPaise ?? 0) })}</p>
                  </div>
                </details>
                <div className="bg-muted flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t("payments.upiId")}:</span>
                  <code className="flex-1 truncate font-semibold" data-testid="payee-vpa">
                    {payee.vpa}
                  </code>
                  <Button variant="ghost" size="icon-sm" aria-label={t("payments.copyUpi")} onClick={async () => (await copyText(payee.vpa ?? "")) && toast.success(t("common.copied"))}>
                    <Copy />
                  </Button>
                </div>
                {payee.staticQrUrl ? (
                  <details className="rounded-2xl border p-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold">{t("payments.staticQr")}</summary>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={payee.staticQrUrl} alt={t("payments.staticQr")} className="mx-auto mt-3 max-w-56 rounded-xl" />
                  </details>
                ) : null}
              </div>
            ) : !vpaOk ? (
              <p className="bg-warning/20 rounded-xl p-3 text-sm">{t("payments.noVpa", { name: payee.name })}</p>
            ) : null
          ) : null}

          {step === "pay" ? (
            <Button variant="outline" size="lg" className="h-12 w-full rounded-2xl" disabled={!amountValid} onClick={() => setStep("confirm")} data-testid="i-have-paid">
              <CheckCircle2 /> {t("payments.iHavePaid")}
            </Button>
          ) : (
            <form
              ref={formRef}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitPaid();
              }}
            >
              <div>
                <h3 className="font-semibold">{t("payments.confirmTitle")}</h3>
                <p className="text-muted-foreground text-sm">{t("payments.confirmBody", { name: payee.name })}</p>
              </div>
              <Field id="method" label={t("payments.method")}>
                <select id="method" name="method" defaultValue={vpaOk ? "UPI" : "CASH"} className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm">
                  <option value="UPI">{t("payments.methodUPI")}</option>
                  <option value="CASH">{t("payments.methodCASH")}</option>
                  <option value="OTHER">{t("payments.methodOTHER")}</option>
                </select>
              </Field>
              <Field id="utr" label={t("payments.utr")} hint={t("payments.utrHint")} errors={fieldErr.utr} optional>
                <Input {...fieldA11y("utr", fieldErr.utr, true)} inputMode="numeric" maxLength={14} autoComplete="off" placeholder="412345678901" className="tabular h-11" />
              </Field>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  {t("payments.proof")} <span className="text-muted-foreground font-normal">({t("common.optional")})</span>
                </p>
                <ImagePicker name="proof" label={t("payments.proof")} aspect="aspect-[4/3]" />
              </div>
              <Field id="note" label={t("payments.note")} optional>
                <Input id="note" name="note" maxLength={200} className="h-11" />
              </Field>
              <Button type="submit" size="lg" className="h-12 w-full rounded-2xl" disabled={pending || !amountValid} data-testid="submit-payment">
                {pending ? t("common.saving") : t("payments.submit")}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" aria-hidden /> {t("payments.never")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
