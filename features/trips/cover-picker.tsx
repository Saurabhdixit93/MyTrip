"use client";

import { ImageOff, Link2, Loader2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ImagePicker } from "@/components/forms/image-picker";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { cn } from "cn";

type Mode = "upload" | "link";

/**
 * Trip cover: upload a photo (compressed in the browser) or paste a direct image link.
 * Only the active mode's input is rendered, so exactly one source is submitted.
 */
export function CoverPicker({ initialUrl, errors, onRemove }: { initialUrl?: string | null; errors?: string[]; onRemove: () => void }) {
  const [mode, setMode] = useState<Mode>("upload");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ url: string; state: "ok" | "error"; src?: string; message?: string } | null>(null);
  const error = errors?.[0];
  const value = url.trim();
  const isLink = /^https?:\/\/\S+$/i.test(value);
  // Idle/loading are derived; only finished results live in state (keyed by the link they belong to).
  const preview = !isLink ? { state: "idle" as const } : result?.url === value ? result : { state: "loading" as const };

  // Preview through our server (same importer as saving), debounced while typing/pasting.
  useEffect(() => {
    if (!isLink) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    const setPreview = (r: { state: "ok" | "error"; src?: string; message?: string }) => setResult({ url: value, ...r });
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/image-preview?url=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : t("trips.coverUrlPreviewError");
          setPreview({ state: "error", message });
          return;
        }
        objectUrl = URL.createObjectURL(await res.blob());
        setPreview({ state: "ok", src: objectUrl });
      } catch {
        if (!controller.signal.aborted) setPreview({ state: "error", message: t("trips.coverUrlPreviewError") });
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isLink, value]);

  return (
    <div className="space-y-2">
      <div role="tablist" aria-label={t("trips.coverSource")} className="bg-muted relative grid grid-cols-2 gap-1 rounded-xl p-1">
        {(
          [
            ["upload", Upload, "trips.coverUpload"],
            ["link", Link2, "trips.coverLink"],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn("relative flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors", mode === value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            data-testid={`cover-mode-${value}`}
          >
            {mode === value ? <motion.span layoutId="cover-mode-pill" className="bg-card absolute inset-0 rounded-lg shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative">{t(label)}</span>
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <ImagePicker name="cover" label={t("trips.cover")} initialUrl={initialUrl} onClear={onRemove} />
      ) : (
        <div className="space-y-2">
          <label htmlFor="coverUrl" className="sr-only">
            {t("trips.coverUrl")}
          </label>
          <Input
            id="coverUrl"
            name="coverUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("trips.coverUrlPlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "coverUrl-error" : "coverUrl-hint"}
            className="h-11"
            data-testid="cover-url"
          />
          <div className="bg-muted/50 relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl border border-dashed">
            {preview.state === "ok" && preview.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.src} alt="" className="absolute inset-0 size-full object-cover" data-testid="cover-url-preview" />
            ) : preview.state === "loading" ? (
              <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label={t("common.loading")} />
            ) : preview.state === "error" ? (
              <p className="text-muted-foreground flex items-center gap-2 px-4 text-center text-xs" role="status" data-testid="cover-url-preview-error">
                <ImageOff className="size-4 shrink-0" aria-hidden /> {preview.message}
              </p>
            ) : (
              <Link2 className="text-muted-foreground size-6" aria-hidden />
            )}
          </div>
          {error ? (
            <p id="coverUrl-error" role="alert" className="text-destructive text-xs font-medium">
              {error}
            </p>
          ) : (
            <p id="coverUrl-hint" className="text-muted-foreground text-xs">
              {t("trips.coverUrlHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
