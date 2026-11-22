"use client";

import { Copy, Download, QrCode as QrIcon, RefreshCw, Share2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { downloadBrandedQr, QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { copyText, whatsappUrl } from "@/lib/client/clipboard";
import { t } from "@/lib/i18n";
import { regenerateInviteAction } from "@/server/actions/trips";

export function InvitePanel({
  tripId,
  tripName,
  inviteUrl,
  code,
  siteUrl,
  enabled,
  canManage,
}: {
  tripId: string;
  tripName: string;
  inviteUrl: string;
  code: string;
  siteUrl: string;
  enabled: boolean;
  canManage: boolean;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [pending, start] = useTransition();
  const message = t("members.inviteMessage", { trip: tripName, link: inviteUrl, code, site: siteUrl.replace(/^https?:\/\//, "") });

  const copy = async (text: string) => {
    if (await copyText(text)) toast.success(t("common.copied"));
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: tripName, text: message, url: inviteUrl }).catch(() => undefined);
    } else await copy(message);
  };
  const regenerate = (nextEnabled: boolean) =>
    start(async () => {
      const res = await regenerateInviteAction({ tripId, enabled: nextEnabled });
      if (!res.ok) toast.error(res.error);
    });

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>{t("members.invite")}</CardTitle>
        <CardDescription>{enabled ? t("members.inviteBody") : t("members.invitesOff")}</CardDescription>
      </CardHeader>
      {enabled ? (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-secondary flex-1 rounded-2xl px-4 py-3 text-center">
              <p className="text-muted-foreground text-xs">{t("members.inviteCode")}</p>
              <p className="font-heading text-3xl font-extrabold tracking-[0.3em]" data-testid="invite-code">
                {code}
              </p>
            </div>
            <Button variant="outline" size="icon-lg" className="size-16 rounded-2xl" onClick={() => setQrOpen(true)} aria-label={t("members.showQr")}>
              <QrIcon className="size-7" />
            </Button>
          </div>
          <div className="flex gap-2">
            <code className="bg-muted text-muted-foreground flex-1 truncate rounded-lg px-3 py-2 text-xs" data-testid="invite-link">
              {inviteUrl}
            </code>
            <Button variant="outline" onClick={() => copy(inviteUrl)} aria-label={t("members.copyLink")}>
              <Copy />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
              <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> WhatsApp
              </a>
            </Button>
            <Button variant="secondary" onClick={share}>
              <Share2 /> {t("members.shareNative")}
            </Button>
          </div>
        </CardContent>
      ) : null}
      {canManage ? (
        <CardContent className="flex flex-wrap gap-2 border-t pt-4">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => regenerate(true)}>
            <RefreshCw /> {t("members.regenerate")}
          </Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => regenerate(!enabled)}>
            {enabled ? t("members.disableInvites") : t("members.enableInvites")}
          </Button>
        </CardContent>
      ) : null}

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("members.qrTitle", { trip: tripName })}</DialogTitle>
            <DialogDescription>{code}</DialogDescription>
          </DialogHeader>
          <QrCode value={inviteUrl} label={t("members.qrTitle", { trip: tripName })} branded className="shadow-sm ring-1 ring-black/5" />
          <p className="text-muted-foreground text-center text-xs">{t("members.qrHint")}</p>
          <Button variant="outline" className="w-full" onClick={() => void downloadBrandedQr(inviteUrl, `mytrip-invite-${code}.png`)} data-testid="download-qr">
            <Download /> {t("members.downloadQr")}
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2S21.8 6.6 21.8 12 17.4 21.8 12 21.8zM12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0z" />
    </svg>
  );
}
