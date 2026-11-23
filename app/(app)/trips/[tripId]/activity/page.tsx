import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { getAuditLog, requireTripPage } from "@/server/queries/trips";

export const metadata: Metadata = { title: "Activity log" };

const ACTIONS = ["create", "update", "delete", "restore", "join", "claim", "lock", "unlock", "role", "submit", "verify", "reject", "cancel", "advance", "void"] as const;
const ENTITIES = ["trip", "member", "expense", "payment", "user"] as const;

function verb(action: string): string {
  if (action === "invite.regenerate") return t("activity.actions.inviteRegenerate");
  const known = ACTIONS.find((a) => a === action);
  return known ? t(`activity.actions.${known}`) : action;
}

function entity(type: string): string {
  const known = ENTITIES.find((e) => e === type);
  return known ? t(`activity.entities.${known}`) : type;
}

function summarize(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default async function ActivityPage({ params, searchParams }: PageProps<"/trips/[tripId]/activity">) {
  const { tripId } = await params;
  const { cursor } = await searchParams;
  const { trip, me } = await requireTripPage(tripId, "/activity");
  if (!can(me.role, "audit.view")) notFound();
  const { rows, nextCursor } = await getAuditLog(trip.id, 30, typeof cursor === "string" ? cursor : undefined);

  return (
    <>
      <PageHeader title={t("activity.title")} subtitle={trip.name} backHref={`/trips/${tripId}/settings`} />
      <PageBody>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("activity.empty")}</p>
        ) : (
          <ol className="bg-card divide-y rounded-3xl border">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1 px-4 py-3 text-sm">
                <p>
                  <span className="font-semibold">{r.actorMember?.displayName ?? t("activity.someone")}</span> {verb(r.action)} {entity(r.entityType)}
                </p>
                {r.before || r.after ? (
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {r.before ? <span className="line-through opacity-70">{summarize(r.before)}</span> : null}
                    {r.before && r.after ? " → " : null}
                    {r.after ? <span>{summarize(r.after)}</span> : null}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  <time dateTime={r.createdAt.toISOString()}>{formatDateTime(r.createdAt)}</time>
                </p>
              </li>
            ))}
          </ol>
        )}
        {nextCursor ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/trips/${tripId}/activity?cursor=${nextCursor}`}>{t("activity.loadMore")}</Link>
          </Button>
        ) : null}
      </PageBody>
    </>
  );
}
