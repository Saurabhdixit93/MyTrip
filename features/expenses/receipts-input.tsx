"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/client/compress-image";
import { t } from "@/lib/i18n";

const SHARE_CACHE = "mytrip-share-target";
const SHARED_RECEIPT_URL = "/__shared-receipt";

/** Multi-image receipt input: compresses in the browser, keeps files in a real <input> for form submission. */
export function ReceiptsInput({ existing, max, loadShared }: { existing: { id: string; url: string }[]; max: number; loadShared?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const kept = existing.filter((e) => !removed.includes(e.id));
  const room = max - kept.length - files.length;

  const sync = (next: File[]) => {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(next);
    setPreviews((old) => {
      old.forEach((u) => URL.revokeObjectURL(u));
      return next.map((f) => URL.createObjectURL(f));
    });
  };

  const add = async (picked: File[]) => {
    const compressed = await Promise.all(picked.slice(0, Math.max(0, room)).map((f) => compressImage(f)));
    sync([...files, ...compressed]);
  };

  // A receipt shared into the app from the OS share sheet (Web Share Target) waits in the SW cache.
  useEffect(() => {
    if (!loadShared || !("caches" in window)) return;
    void (async () => {
      const cache = await caches.open(SHARE_CACHE);
      const res = await cache.match(SHARED_RECEIPT_URL);
      if (!res) return;
      const blob = await res.blob();
      await cache.delete(SHARED_RECEIPT_URL);
      const name = decodeURIComponent(res.headers.get("X-File-Name") ?? "receipt.jpg");
      await add([new File([blob], name, { type: blob.type })]);
      toast.success(t("expenses.sharedReceiptLoaded"));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadShared]);

  return (
    <div className="space-y-2">
      {removed.map((id) => (
        <input key={id} type="hidden" name="removeAttachmentIds" value={id} />
      ))}
      <input
        ref={inputRef}
        type="file"
        name="receipts"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={() => undefined}
      />
      <div className="flex flex-wrap gap-2">
        {kept.map((e) => (
          <Thumb key={e.id} url={e.url} onRemove={() => setRemoved((r) => [...r, e.id])} />
        ))}
        {previews.map((url, i) => (
          <Thumb key={url} url={url} onRemove={() => sync(files.filter((_, j) => j !== i))} />
        ))}
        {room > 0 ? (
          <label className="bg-muted/50 hover:bg-muted focus-within:ring-ring/50 text-muted-foreground flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs font-medium focus-within:ring-3">
            <Camera className="size-5" aria-hidden />
            {t("expenses.addReceipt")}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void add([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function Thumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <div className="relative size-20 overflow-hidden rounded-xl border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="size-full object-cover" />
      <Button type="button" size="icon-xs" variant="secondary" className="absolute end-1 top-1 rounded-full" onClick={onRemove} aria-label={t("expenses.removeReceipt")}>
        <X />
      </Button>
    </div>
  );
}
