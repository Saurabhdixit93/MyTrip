"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

/** Renders `value` as an SVG QR code (lazy-loads the encoder). */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((QR) =>
      QR.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0F172A", light: "#FFFFFF" } }).then((out) => {
        if (!cancelled) setSvg(out);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("aspect-square w-full rounded-2xl bg-white p-3 [&_svg]:size-full", !svg && "animate-pulse bg-muted", className)}
      // The SVG is generated locally from `value` by the qrcode library, never from user HTML.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
