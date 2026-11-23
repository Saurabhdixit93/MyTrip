"use client";

import { BadgeCheck, CheckCircle2, Copy, Download, ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { fieldA11y, Field } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { downloadQr, QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { copyText } from "@/lib/client/clipboard";
import { useUpiPlatform } from "@/lib/client/platform";
import { paiseToRupeeString, parseRupeesToPaise } from "@/lib/domain/money";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import { buildUpiAppLinks, buildUpiLink, isValidVpa } from "@/lib/upi";
import { cn } from "cn";
import { submitPaymentAction } from "@/server/actions/payments";

export interface Payee {
  memberId: string;
  name: string;
  vpa: string | null;
  payeeName: string;
  staticQrUrl: string | null;
  /** Coach confirmed the UPI app shows their name for this UPI ID. */
  verified: boolean;
}

const APP_LABEL = { gpay: "payments.appGpay", phonepe: "payments.appPhonepe", paytm: "payments.appPaytm" } as const;
const APP_DOT = { gpay: "bg-[#4285F4]", phonepe: "bg-[#5F259F]", paytm: "bg-[#00BAF2]" } as const;

export function PaySheet({ tripId, tripName, payee, duePaise, payerName }: { tripId: string; tripName: string; payee: Payee; duePaise: number; payerName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(paiseToRupeeString(duePaise));
  const [step, setStep] = useState<"pay" | "confirm">("pay");
  const [pending, start] = useTransition();
  const [fieldErr, setFieldErr] = useState<Record<string, string[]>>({});
  // One key per sheet session: retries and double taps resolve to the same payment.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const platform = useUpiPlatform();

  const amountPaise = parseRupeesToPaise(amount);
  const amountValid = amountPaise !== null && amountPaise > 0 && amountPaise <= duePaise;
  const vpaOk = Boolean(payee.vpa && isValidVpa(payee.vpa));
  const upiParams = useMemo(
    () => (vpaOk && amountValid && payee.vpa ? { vpa: payee.vpa, payeeName: payee.payeeName, amountPaise: amountPaise ?? 0, note: `${tripName} - ${payerName}` } : null),
    [vpaOk, amountValid, payee.vpa, payee.payeeName, amountPaise, tripName, payerName],
  );
  const upiLink = upiParams ? buildUpiLink(upiParams) : null;
  // Same params, per installed-app deep link (Android intents / iOS app schemes).
  const appLinks = upiParams ? buildUpiAppLinks(upiParams, platform) : [];

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
                {payee.verified ? (
                  <p className="text-success flex items-center gap-1.5 text-xs font-semibold" data-testid="payee-verified">
                    <BadgeCheck className="size-4" aria-hidden /> {t("payments.payeeVerified", { name: payee.name })}
                  </p>
                ) : null}

                {appLinks.length ? (
                  <div className="space-y-2" data-testid="upi-app-links">
                    <p className="text-sm font-medium">{t("payments.payWith")}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {appLinks.map((l) => (
                        <Button
                          key={l.app}
                          asChild
                          size="lg"
                          variant={l.app === "any" ? "default" : "outline"}
                          className={cn("h-12 rounded-2xl px-2 text-xs sm:text-sm", l.app === "any" && "col-span-3 h-14 text-base")}
                        >
                          <a href={l.href} onClick={recordIntent} data-testid={l.app === "any" ? "upi-pay-now" : `upi-app-${l.app}`}>
                            {l.app === "any" ? <ExternalLink /> : <span className={cn("size-2.5 rounded-full", APP_DOT[l.app])} aria-hidden />}
                            {l.app === "any" ? t("payments.payNow") : t(APP_LABEL[l.app])}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 rounded-2xl border p-4 text-center" data-testid="upi-qr">
                  <p className="text-sm font-semibold">{t("payments.scanQr")}</p>
                  <div className="mx-auto max-w-56">
                    <QrCode value={upiLink} label={t("payments.qrAmount", { amount: formatPaise(amountPaise ?? 0) })} className="ring-1 ring-black/5" />
                  </div>
                  <p className="text-muted-foreground text-xs">{t("payments.qrAmount", { amount: formatPaise(amountPaise ?? 0) })}</p>
                  <Button variant="ghost" size="sm" onClick={() => void downloadQr(upiLink, `mytrip-pay-${payee.name.replace(/\W+/g, "-").toLowerCase()}.png`)} data-testid="save-upi-qr">
                    <Download /> {t("payments.saveQr")}
                  </Button>
                  {appLinks.length ? <p className="text-muted-foreground text-xs">{t("payments.saveQrHint")}</p> : null}
                </div>

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
