import { Skeleton } from "@/components/ui/skeleton";

/** Generic page skeleton: header bar, a hero card and a few rows. */
export function ListSkeleton({ rows = 4, hero = true }: { rows?: number; hero?: boolean }) {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-7 w-40" />
      {hero ? <Skeleton className="h-36 w-full rounded-3xl" /> : null}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
