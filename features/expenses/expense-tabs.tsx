import Link from "next/link";
import { t } from "@/lib/i18n";
import { cn } from "cn";

/** Expenses | Advances switcher shown at the top of both lists. */
export function ExpenseTabs({ tripId, active }: { tripId: string; active: "expenses" | "advances" }) {
  const tabs = [
    { key: "expenses", href: `/trips/${tripId}/expenses`, label: t("advances.tabExpenses") },
    { key: "advances", href: `/trips/${tripId}/expenses/advances`, label: t("advances.tabAdvances") },
  ] as const;
  return (
    <nav aria-label={t("expenses.title")} className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={cn(
            "rounded-lg py-2 text-center text-sm font-semibold transition-colors",
            active === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
