import { cn } from "cn";

const PIN = "M32 3C19.85 3 10 12.85 10 25c0 16.1 19.03 33.9 20.65 35.4a2 2 0 0 0 2.7 0C34.97 58.9 54 41.1 54 25 54 12.85 44.15 3 32 3z";
const LEFT_HALF = "M30.4 12.1a12.9 12.9 0 0 0 0 25.8z";
const RIGHT_HALF = "M33.6 12.1a12.9 12.9 0 0 1 0 25.8z";

/** Route pin whose head is a coin split in two: travel + splitting money. */
export function LogoMark({ className, title = "MyTrip" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} role="img" aria-label={title}>
      <defs>
        <linearGradient id="mt-pin-grad" x1="10" y1="3" x2="54" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <path fill="url(#mt-pin-grad)" d={PIN} />
      <g transform="rotate(-28 32 25)">
        <path className="fill-white dark:fill-slate-900" d={LEFT_HALF} />
        <path fill="#FBBF24" d={RIGHT_HALF} />
      </g>
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} title="" />
      <span className="font-heading text-xl font-extrabold tracking-tight">
        My<span className="text-primary">Trip</span>
      </span>
      <span className="sr-only">MyTrip</span>
    </span>
  );
}
