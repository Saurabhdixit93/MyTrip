"use client";

import { Home, Plus, Receipt, Settings2, UserRound, Users, Wallet, Plane, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ICONS = { home: Home, receipt: Receipt, wallet: Wallet, users: Users, user: UserRound, plane: Plane, ticket: Ticket, settings: Settings2 } as const;
export type NavIcon = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
}

/** Mobile-first bottom navigation with an optional centre action button. */
export function BottomNav({ items, label, action }: { items: NavItem[]; label: string; action?: { href: string; label: string } }) {
  const pathname = usePathname();
  const half = Math.ceil(items.length / 2);
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const renderItem = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const active = isActive(item);
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-[var(--bottom-nav-height)] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={label} className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-safe md:inset-x-auto md:start-1/2 md:bottom-4 md:w-[28rem] md:-translate-x-1/2 md:rounded-2xl md:border md:pb-0 rtl:md:translate-x-1/2">
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.slice(0, half).map(renderItem)}
        {action ? (
          <li className="flex flex-1 items-center justify-center">
            <Link
              href={action.href}
              aria-label={action.label}
              className="bg-primary text-primary-foreground shadow-primary/30 flex size-12 -translate-y-3 items-center justify-center rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              <Plus className="size-6" aria-hidden />
            </Link>
          </li>
        ) : null}
        {items.slice(half).map(renderItem)}
      </ul>
    </nav>
  );
}
