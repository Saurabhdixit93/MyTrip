"use client";

import { ImageOff, Link2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
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
  const [previewState, setPreviewState] = useState<"idle" | "ok" | "error">("idle");
  const looksLikeUrl = /^https?:\/\/\S+$/i.test(url.trim());
  const error = errors?.[0];

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
            onChange={(e) => {
              setUrl(e.target.value);
              setPreviewState("idle");
            }}
            placeholder={t("trips.coverUrlPlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "coverUrl-error" : "coverUrl-hint"}
            className="h-11"
            data-testid="cover-url"
          />
          <div className="bg-muted/50 relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl border border-dashed">
            {looksLikeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url.trim()}
                alt=""
                referrerPolicy="no-referrer"
                onLoad={() => setPreviewState("ok")}
                onError={() => setPreviewState("error")}
                className={cn("absolute inset-0 size-full object-cover transition-opacity", previewState === "ok" ? "opacity-100" : "opacity-0")}
                data-testid="cover-url-preview"
              />
            ) : null}
            {previewState === "error" ? (
              <p className="text-muted-foreground flex items-center gap-2 px-4 text-center text-xs">
                <ImageOff className="size-4 shrink-0" aria-hidden /> {t("trips.coverUrlPreviewError")}
              </p>
            ) : previewState !== "ok" ? (
              <Link2 className="text-muted-foreground size-6" aria-hidden />
            ) : null}
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
