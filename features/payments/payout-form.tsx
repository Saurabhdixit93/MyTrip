"use client";

import { BadgeCheck, CircleAlert, ExternalLink, QrCode as QrIcon, ShieldCheck } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { fieldErrors, FormError } from "@/components/forms/form-error";
import { ImagePicker } from "@/components/forms/image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decodeQrFile } from "@/lib/client/decode-qr";
import { useUpiPlatform } from "@/lib/client/platform";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/i18n";
import { buildUpiAppLinks, buildUpiLink, isValidVpa, normalizeVpa, parseUpiUri } from "@/lib/upi";
import { isKnownUpiHandle, suggestUpiHandle, upiHandle } from "@/lib/upi/handles";
import { confirmUpiVerifiedAction, updatePayoutAction } from "@/server/actions/payments";
import { cn } from "cn";

type QrState = { state: "idle" } | { state: "reading" } | { state: "ok"; message: string } | { state: "error"; message: string };

export function PayoutForm({
  tripId,
  upiVpa,
  upiPayeeName,
  qrUrl,
  verifiedAt,
}: {
  tripId: string;
  upiVpa: string | null;
  upiPayeeName: string | null;
  qrUrl: string | null;
  verifiedAt: string | null;
}) {
  const [state, action] = useActionState(updatePayoutAction, null);
  const errors = fieldErrors(state);
  const [removeQr, setRemoveQr] = useState(false);
  const [vpa, setVpa] = useState(upiVpa ?? "");
  const [name, setName] = useState(upiPayeeName ?? "");
  const [qr, setQr] = useState<QrState>({ state: "idle" });

  useEffect(() => {
    if (state?.ok) toast.success(t("payout.saved"));
  }, [state]);

  const cleanVpa = normalizeVpa(vpa);
  const formatOk = isValidVpa(cleanVpa);
  const suggestion = formatOk ? suggestUpiHandle(cleanVpa) : null;
  const unknownHandle = formatOk && !suggestion && !isKnownUpiHandle(cleanVpa);

  // Read the QR in the browser for instant feedback; the server re-checks it on save.
  async function inspectQr(file: File) {
    setRemoveQr(false);
    setQr({ state: "reading" });
    const text = await decodeQrFile(file);
    if (!text) return setQr({ state: "error", message: t("payout.qrNoCode") });
    const parsed = parseUpiUri(text);
    if (!parsed) return setQr({ state: "error", message: t("payout.qrNotUpi") });
    if (cleanVpa && formatOk && parsed.vpa !== cleanVpa) return setQr({ state: "error", message: t("payout.qrMismatch", { qr: parsed.vpa, vpa: cleanVpa }) });
    if (!cleanVpa) {
      setVpa(parsed.vpa);
      toast.info(t("payout.qrAutofill"));
    }
    if (!name && parsed.payeeName) setName(parsed.payeeName);
    setQr({ state: "ok", message: parsed.payeeName ? t("payout.qrReadsName", { vpa: parsed.vpa, name: parsed.payeeName }) : t("payout.qrReads", { vpa: parsed.vpa }) });
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="removeQr" value={removeQr ? "true" : "false"} />
        <Field id="upiVpa" label={t("payout.vpa")} hint={t("payout.vpaHint")} errors={errors.upiVpa}>
          <Input
            id="upiVpa"
            name="upiVpa"
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            inputMode="email"
            placeholder="name@okhdfcbank"
            className="h-11"
            aria-invalid={errors.upiVpa ? true : undefined}
            aria-describedby={errors.upiVpa ? "upiVpa-error" : "upiVpa-hint"}
          />
        </Field>
        {suggestion ? (
          <p className="bg-warning/20 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs" role="status" data-testid="upi-handle-hint">
            <CircleAlert className="size-4 shrink-0" aria-hidden /> {t("payout.handleTypo", { handle: upiHandle(cleanVpa), suggestion })}
            <Button type="button" size="xs" variant="outline" onClick={() => setVpa(`${cleanVpa.split("@")[0]}@${suggestion}`)}>
              {t("payout.handleUse", { suggestion })}
            </Button>
          </p>
        ) : unknownHandle ? (
          <p className="text-muted-foreground flex items-center gap-2 text-xs" role="status" data-testid="upi-handle-hint">
            <CircleAlert className="size-4 shrink-0" aria-hidden /> {t("payout.handleUnknown", { handle: upiHandle(cleanVpa) })}
          </p>
        ) : null}

        <Field id="upiPayeeName" label={t("payout.payeeName")} errors={errors.upiPayeeName} optional>
          <Input id="upiPayeeName" name="upiPayeeName" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="h-11" />
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("payout.qr")}</p>
          <p className="text-muted-foreground text-xs">{t("payout.qrHint")}</p>
          <ImagePicker
            name="upiQr"
            label={t("payout.qr")}
            initialUrl={qrUrl}
            onClear={() => {
              setRemoveQr(true);
              setQr({ state: "idle" });
            }}
            onFile={(file) => void inspectQr(file)}
            aspect="aspect-square"
            className="w-40"
          />
          {qr.state === "ok" || qr.state === "error" ? (
            <p role="status" data-testid="upi-qr-status" className={cn("flex items-center gap-1.5 text-xs font-medium", qr.state === "ok" ? "text-success" : "text-destructive")}>
              {qr.state === "ok" ? <QrIcon className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />} {qr.message}
            </p>
          ) : null}
          {errors.upiQr ? (
            <p role="alert" className="text-destructive text-xs font-medium" data-testid="upi-qr-error">
              {errors.upiQr[0]}
            </p>
          ) : null}
        </div>
        <FormError state={state && !state.ok && !errors.upiQr && !errors.upiVpa ? state : null} />
        <SubmitButton className="w-full">{t("common.save")}</SubmitButton>
      </form>

      {upiVpa ? <UpiVerifyCard tripId={tripId} vpa={upiVpa} payeeName={upiPayeeName ?? ""} verifiedAt={verifiedAt} /> : null}
    </div>
  );
}

/** Free "name check": any UPI app shows the registered name for a VPA before the user pays. */
function UpiVerifyCard({ tripId, vpa, payeeName, verifiedAt }: { tripId: string; vpa: string; payeeName: string; verifiedAt: string | null }) {
  const [pending, start] = useTransition();
  const platform = useUpiPlatform();
  const testParams = { vpa, payeeName: payeeName || "MyTrip Coach", amountPaise: 100, note: "MyTrip UPI check" };
  const link = buildUpiLink(testParams);
  const openHref = buildUpiAppLinks(testParams, platform).find((l) => l.app === "any")?.href;

  if (verifiedAt) {
    return (
      <p className="bg-success/15 text-foreground flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold" data-testid="upi-verified">
        <BadgeCheck className="text-success size-5" aria-hidden /> {t("payout.verified")}
        <span className="text-muted-foreground font-normal">· {t("payout.verifiedOn", { date: formatDate(new Date(verifiedAt)) })}</span>
      </p>
    );
  }
  return (
    <section className="space-y-3 rounded-2xl border border-dashed p-4" aria-labelledby="upi-verify-title" data-testid="upi-verify">
      <h3 id="upi-verify-title" className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="text-primary size-5" aria-hidden /> {t("payout.verifyTitle")}
        <span className="text-muted-foreground text-xs font-normal">· {t("payout.notVerified")}</span>
      </h3>
      <p className="text-muted-foreground text-sm">{t("payout.verifyBody", { vpa })}</p>
      <div className="mx-auto w-44">
        <QrCode value={link} label={t("payout.verifyTitle")} className="ring-1 ring-black/5" />
      </div>
      {openHref ? (
        <Button asChild variant="outline" className="w-full">
          <a href={openHref}>
            <ExternalLink /> {t("payout.verifyOpen")}
          </a>
        </Button>
      ) : null}
      <Button
        className="w-full"
        disabled={pending}
        data-testid="confirm-upi-verified"
        onClick={() =>
          start(async () => {
            const res = await confirmUpiVerifiedAction({ tripId });
            if (res.ok) toast.success(t("payout.verifiedToast"));
            else toast.error(res.error);
          })
        }
      >
        <BadgeCheck /> {t("payout.verifyConfirm")}
      </Button>
    </section>
  );
}
