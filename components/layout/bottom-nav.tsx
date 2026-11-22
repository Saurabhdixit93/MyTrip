"use client";

import { Home, Plane, Plus, Receipt, Settings2, Ticket, UserRound, Users, Wallet } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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

/** Dock geometry (px). The centre button (60 + 6px ring) sits in a cradle of radius CRADLE_R. */
const CORNER = 26;
const CRADLE_R = 40;
const FILLET = 16;

/**
 * Dock outline with a smooth cradle: two fillet arcs blend the straight top edge into the cradle
 * circle (tangent at both joins), so there are no sharp shoulders at any width.
 */
export function dockPath(width: number, height: number, withCradle: boolean): string {
  const w = Math.max(width, CORNER * 2 + 1);
  const top = `M0 ${CORNER} Q0 0 ${CORNER} 0`;
  const end = `L${w - CORNER} 0 Q${w} 0 ${w} ${CORNER} L${w} ${height} L0 ${height} Z`;
  if (!withCradle) return `${top} ${end}`;
  const cx = w / 2;
  const r = CRADLE_R;
  const f = FILLET;
  const dx = Math.sqrt((r + f) ** 2 - f ** 2); // fillet centre offset from the cradle centre
  const k = r / (r + f);
  const px = cx - dx * k; // tangent point fillet ↔ cradle
  const py = f * k;
  const fmt = (n: number) => n.toFixed(2);
  return [
    top,
    `L${fmt(cx - dx)} 0`,
    `A${f} ${f} 0 0 1 ${fmt(px)} ${fmt(py)}`,
    `A${r} ${r} 0 0 0 ${fmt(2 * cx - px)} ${fmt(py)}`,
    `A${f} ${f} 0 0 1 ${fmt(cx + dx)} 0`,
    end,
  ].join(" ");
}

/**
 * Full-width docked bottom navigation:
 * - opaque SVG dock with a smooth cradle for the raised centre action (nothing shows through)
 * - Material-3 style active indicator: a pill behind the icon that slides between tabs
 * - spring micro-interactions; honours prefers-reduced-motion
 */
export function BottomNav({ items, label, action }: { items: NavItem[]; label: string; action?: { href: string; label: string } }) {
  const pathname = usePathname();
  const pillId = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const half = Math.ceil(items.length / 2);
  const actionActive = action ? pathname === action.href : false;
  const isActive = (item: NavItem) => !actionActive && (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const active = isActive(item);
    return (
      <li key={item.href} className="flex flex-1 justify-center">
        <MotionLink
          href={item.href}
          aria-current={active ? "page" : undefined}
          whileTap={{ scale: 0.9 }}
          transition={SPRING}
          className="group flex w-full max-w-[5rem] flex-col items-center gap-1 rounded-2xl py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="relative isolate flex h-8 w-14 items-center justify-center">
            {active ? <motion.span layoutId={`nav-pill-${pillId}`} transition={SPRING} className="bg-primary/15 dark:bg-primary/22 absolute inset-0 -z-10 rounded-full" aria-hidden /> : null}
            <motion.span animate={{ scale: active ? 1.08 : 1, y: active ? 0 : 1 }} transition={SPRING} className="flex">
              <Icon
                className={cn("size-[1.3rem] transition-colors duration-200", active ? "text-primary stroke-[2.3]" : "text-muted-foreground group-hover:text-foreground stroke-[1.9]")}
                aria-hidden
              />
            </motion.span>
          </span>
          <span className={cn("text-[11px] leading-none tracking-tight transition-colors duration-200", active ? "text-primary font-bold" : "text-muted-foreground font-medium")}>
            {item.label}
          </span>
        </MotionLink>
      </li>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.nav
        aria-label={label}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...SPRING, delay: 0.05 }}
        className="fixed inset-x-0 bottom-0 z-40"
      >
        <div ref={dockRef} className="relative mx-auto max-w-xl">
          {/* Dock surface */}
          {size ? (
            <svg
              className="text-card absolute inset-0 size-full overflow-visible [filter:drop-shadow(0_-6px_18px_rgb(15_23_42/0.08))] dark:[filter:drop-shadow(0_-8px_20px_rgb(0_0_0/0.45))]"
              viewBox={`0 0 ${size.w} ${size.h}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <path d={dockPath(size.w, size.h, Boolean(action))} fill="currentColor" className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <div className="bg-card absolute inset-0 rounded-t-[26px] border-t" aria-hidden />
          )}

          <ul className="relative flex items-center px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            {items.slice(0, half).map(renderItem)}
            {action ? (
              <li className="relative flex w-24 shrink-0 justify-center self-stretch">
                <MotionLink
                  href={action.href}
                  aria-label={action.label}
                  aria-current={actionActive ? "page" : undefined}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.9, rotate: 90 }}
                  transition={SPRING}
                  className="ring-background from-primary text-primary-foreground shadow-primary/40 focus-visible:ring-ring/60 absolute -top-[38px] flex size-[60px] items-center justify-center rounded-full bg-gradient-to-br to-[oklch(0.62_0.12_175)] shadow-xl ring-[6px] outline-none"
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
        </div>
      </motion.nav>
    </MotionConfig>
  );
}
