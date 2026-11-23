import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { TripSummary } from "@/server/queries/expenses";
import { cn } from "cn";
import { myDues } from "./dues";

export function DuesCard({ tripId, summary, meId, isPayCoach }: { tripId: string; summary: TripSummary; meId: string; isPayCoach: boolean }) {
  const { owe, get } = myDues(summary.plan, meId);
  const iAmCoach = summary.coachMemberId === meId;
  const settled = owe === 0 && get === 0;

  return (
    <section
      aria-label={settled ? t("dashboard.allSettled") : owe > 0 ? t("dashboard.youOwe") : t("dashboard.youGet")}
      className={cn("rounded-3xl p-5", settled ? "bg-secondary text-secondary-foreground" : owe > 0 ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground")}
      data-testid="dues-card"
    >
      {settled ? (
        <div className="flex items-center gap-3">
          <PartyPopper className="size-8 shrink-0" aria-hidden />
          <div>
            <p className="text-lg font-bold">{t("dashboard.allSettled")}</p>
            <p className="text-sm opacity-80">{t("dashboard.allSettledBody")}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {owe > 0 ? (
            <div>
              <p className="text-sm opacity-85">{isPayCoach && !iAmCoach ? t("dashboard.youOweCoach") : t("dashboard.youOwe")}</p>
              <p className="font-heading tabular text-4xl font-extrabold" data-testid="you-owe">
                {formatPaise(owe)}
              </p>
            </div>
          ) : null}
          {get > 0 ? (
            <div>
              <p className="text-sm opacity-85">{iAmCoach && isPayCoach ? t("dashboard.youGetCoach") : t("dashboard.youGet")}</p>
              <p className={cn("font-heading tabular font-extrabold", owe > 0 ? "text-2xl" : "text-4xl")} data-testid="you-get">
                {formatPaise(get)}
              </p>
            </div>
          ) : null}
          <Button asChild variant="secondary" className={cn("rounded-xl", owe > 0 && "bg-highlight text-highlight-foreground hover:bg-highlight/90")}>
            <Link href={`/trips/${tripId}/settle`}>
              {owe > 0 ? t("dashboard.settleNow") : t("dashboard.viewBalances")} <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

export function TripStats({ summary, meId, budgetPaise, memberCount }: { summary: TripSummary; meId: string; budgetPaise: number | null; memberCount: number }) {
  const mine = summary.balances.find((b) => b.memberId === meId);
  const pct = budgetPaise ? Math.min(100, Math.round((summary.totalSpendPaise / budgetPaise) * 100)) : 0;
  const over = budgetPaise !== null && summary.totalSpendPaise > budgetPaise;
  return (
    <section className="grid grid-cols-2 gap-3">
      <Stat label={t("dashboard.totalSpend")} value={formatPaise(summary.totalSpendPaise)} />
      <Stat label={t("dashboard.yourSpend")} value={formatPaise(mine?.owed ?? 0)} />
      {summary.advancesPaise > 0 ? <Stat label={t("dashboard.advances")} value={formatPaise(summary.advancesPaise)} className="col-span-2" /> : null}
      {budgetPaise ? (
        <div className="bg-card col-span-2 space-y-2 rounded-2xl border p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t("dashboard.budget")}</span>
            <span className={cn("font-semibold", over && "text-destructive")}>
              {over ? t("dashboard.budgetOver", { amount: formatPaise(summary.totalSpendPaise - budgetPaise) }) : t("dashboard.budgetLeft", { amount: formatPaise(budgetPaise - summary.totalSpendPaise) })}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("dashboard.budget")}>
            <div className={cn("h-full rounded-full", over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-muted-foreground tabular text-xs">
            {formatPaise(summary.totalSpendPaise)} / {formatPaise(budgetPaise)}
          </p>
        </div>
      ) : (
        <Stat label={t("dashboard.perPerson")} value={formatPaise(memberCount ? Math.round(summary.totalSpendPaise / memberCount) : 0)} className="col-span-2" />
      )}
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl border p-4", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="tabular mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
