"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/client/compress-image";
import { cn } from "cn";

/**
 * File input that compresses the chosen image in the browser before the form submits,
 * by swapping the compressed File back into the input via DataTransfer.
 */
export function ImagePicker({
  name,
  label,
  initialUrl,
  onClear,
  className,
  aspect = "aspect-[16/9]",
  initialFile,
  onFile,
}: {
  name: string;
  label: string;
  initialUrl?: string | null;
  onClear?: () => void;
  className?: string;
  aspect?: string;
  initialFile?: File | null;
  /** Called with the file the form will submit (after compression). */
  onFile?: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [busy, setBusy] = useState(false);

  // Effect event: reads the latest handler without re-running when callbacks change identity.
  const loadInitial = useEffectEvent((file: File) => void handleFile(file));
  useEffect(() => {
    if (initialFile && inputRef.current) loadInitial(initialFile);
  }, [initialFile]);

  async function handleFile(file: File) {
    setBusy(true);
    const compressed = await compressImage(file);
    const dt = new DataTransfer();
    dt.items.add(compressed);
    if (inputRef.current) inputRef.current.files = dt.files;
    setPreview(URL.createObjectURL(compressed));
    setBusy(false);
    onFile?.(compressed);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    onClear?.();
  }

  return (
    <div className={cn("relative", className)}>
      <label
        className={cn(
          "bg-muted/50 hover:bg-muted focus-within:ring-ring/50 relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed text-sm transition-colors focus-within:ring-3",
          aspect,
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            {busy ? <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden /> : <ImagePlus className="text-muted-foreground size-6" aria-hidden />}
            <span className="text-muted-foreground font-medium">{label}</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      {preview ? (
        <Button type="button" size="icon-sm" variant="secondary" className="absolute end-2 top-2 rounded-full shadow" onClick={clear} aria-label={label}>
          <X />
        </Button>
      ) : null}
    </div>
  );
}
