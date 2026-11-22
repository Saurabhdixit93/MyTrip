"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

/**
 * Renders `value` as an SVG QR code (encoder lazy-loaded).
 * `branded` adds the MyTrip logo + brand colours (error correction H, scan-tested);
 * keep it off for payment QRs so every UPI app reads them without fuss.
 */
export function QrCode({ value, label, className, branded = false }: { value: string; label: string; className?: string; branded?: boolean }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const render = branded
      ? import("@/lib/qr/branded").then(({ brandedQrSvg }) => brandedQrSvg(value))
      : import("qrcode").then((QR) => QR.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0F172A", light: "#FFFFFF" } }));
    void render.then((out) => {
      if (!cancelled) setSvg(out);
    });
    return () => {
      cancelled = true;
    };
  }, [value, branded]);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("aspect-square w-full rounded-2xl bg-white p-2 [&_svg]:size-full", !svg && "animate-pulse bg-muted", className)}
      // The SVG is generated locally from `value` by our QR encoder, never from user HTML.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      data-qr-ready={svg ? "true" : undefined}
    />
  );
}

/** Rasterises a branded QR to a PNG download (for printing or sharing in group chats). */
export async function downloadBrandedQr(value: string, fileName: string, px = 1024) {
  const { brandedQrSvg } = await import("@/lib/qr/branded");
  const url = URL.createObjectURL(new Blob([brandedQrSvg(value)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    canvas.getContext("2d")?.drawImage(img, 0, 0, px, px);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
