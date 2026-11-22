import { cn } from "cn";

const GRADIENTS = [
  "from-teal-500 to-emerald-700",
  "from-amber-400 to-orange-600",
  "from-sky-500 to-indigo-700",
  "from-rose-400 to-fuchsia-700",
  "from-lime-500 to-teal-700",
  "from-violet-500 to-purple-800",
];

export function coverGradient(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/** Trip cover photo (private, served via /api/files) or a deterministic brand gradient. */
export function TripCover({ tripId, coverUrl, className, children, eager }: { tripId: string; coverUrl: string | null; className?: string; children?: React.ReactNode; eager?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", coverGradient(tripId), className)}>
      {coverUrl ? (
        // Private images can't go through the next/image optimizer (it has no session cookie).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" loading={eager ? "eager" : "lazy"} decoding="async" data-testid="trip-cover-image" />
      ) : null}
      {children}
    </div>
  );
}
