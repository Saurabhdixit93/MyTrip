"use client";

import { Home, Plane, Plus, Receipt, Settings2, Ticket, UserRound, Users, Wallet } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type CSSProperties } from "react";
import { cn } from "cn";

const ICONS = { home: Home, receipt: Receipt, wallet: Wallet, users: Users, user: UserRound, plane: Plane, ticket: Ticket, settings: Settings2 } as const;
export type NavIcon = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
}

const SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;
const MotionLink = motion.create(Link);

/** Centre button: 60px + 6px background ring; the bar's notch leaves a 5px gap around it. */
const NOTCH_RADIUS = 41;
const notchMask: CSSProperties = {
  WebkitMaskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0, transparent ${NOTCH_RADIUS - 0.5}px, #000 ${NOTCH_RADIUS}px)`,
  maskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0, transparent ${NOTCH_RADIUS - 0.5}px, #000 ${NOTCH_RADIUS}px)`,
};

/**
 * Floating mobile-first bottom navigation:
 * - solid surface with a curved notch cut out for the raised centre action
 * - a pill + dot that slide (shared layout animation) to the active tab
 * - a fade behind the bar so scrolling content never clashes with it
 * Honours prefers-reduced-motion via MotionConfig.
 */
export function BottomNav({ items, label, action }: { items: NavItem[]; label: string; action?: { href: string; label: string } }) {
  const pathname = usePathname();
  const pillId = useId();
  const half = Math.ceil(items.length / 2);
  const actionActive = action ? pathname === action.href : false;
  const isActive = (item: NavItem) => !actionActive && (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const active = isActive(item);
    return (
      <li key={item.href} className="flex flex-1 justify-center">
        <MotionLink
          href={item.href}
          aria-current={active ? "page" : undefined}
          whileTap={{ scale: 0.88 }}
          transition={SPRING}
          className={cn(
            "relative isolate flex h-[3.25rem] w-full max-w-[4.75rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold tracking-tight outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {active ? (
            <motion.span layoutId={`nav-pill-${pillId}`} transition={SPRING} className="bg-primary/12 dark:bg-primary/16 absolute inset-x-1 inset-y-0.5 -z-10 rounded-2xl" aria-hidden />
          ) : null}
          <motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.14 : 1 }} transition={SPRING} className="flex">
            <Icon className={cn("size-[1.3rem]", active ? "stroke-[2.4]" : "stroke-[1.9]")} aria-hidden />
          </motion.span>
          <span className="leading-none">{item.label}</span>
          {active ? <motion.span layoutId={`nav-dot-${pillId}`} transition={SPRING} className="bg-primary absolute -bottom-0.5 h-[3px] w-4 rounded-full" aria-hidden /> : null}
        </MotionLink>
      </li>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label={label} className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        {/* Fade so page content dissolves before it reaches the bar. */}
        <div className="from-background via-background/85 absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent" aria-hidden />

        <motion.div
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...SPRING, delay: 0.05 }}
          className="relative mx-auto max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]"
        >
          {/* The surface: its drop-shadows (hairline + soft lift) follow the notch shape. */}
          <div className="absolute inset-x-3 top-0 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] [filter:drop-shadow(0_0_0.6px_rgb(15_23_42/0.28))_drop-shadow(0_10px_22px_rgb(15_118_110/0.18))] dark:[filter:drop-shadow(0_0_0.6px_rgb(255_255_255/0.28))_drop-shadow(0_12px_24px_rgb(0_0_0/0.5))]" aria-hidden>
            <div className="bg-card/95 size-full rounded-[1.75rem] backdrop-blur-xl" style={action ? notchMask : undefined} />
          </div>

          <ul className="pointer-events-auto relative flex h-[4.25rem] items-center px-1.5">
            {items.slice(0, half).map(renderItem)}
            {action ? (
              <li className="relative flex w-[5.5rem] shrink-0 justify-center self-stretch">
                <MotionLink
                  href={action.href}
                  aria-label={action.label}
                  aria-current={actionActive ? "page" : undefined}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.9, rotate: 90 }}
                  transition={SPRING}
                  className="ring-background from-primary text-primary-foreground shadow-primary/40 focus-visible:ring-ring/60 absolute -top-[30px] flex size-[60px] items-center justify-center rounded-full bg-gradient-to-br to-[oklch(0.62_0.12_175)] shadow-xl ring-[6px] outline-none"
                  data-testid="nav-create"
                >
                  <motion.span animate={{ rotate: actionActive ? 45 : 0 }} transition={SPRING} className="flex">
                    <Plus className="size-7 stroke-[2.6]" aria-hidden />
                  </motion.span>
                  <span className="bg-primary/35 pointer-events-none absolute inset-1 -z-10 rounded-full blur-md" aria-hidden />
                </MotionLink>
              </li>
            ) : null}
            {items.slice(half).map(renderItem)}
          </ul>
        </motion.div>
      </nav>
    </MotionConfig>
  );
}
