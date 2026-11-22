import { formatShortDate, todayInIndia } from "@/lib/format";
import { membersLabel, t } from "@/lib/i18n";
import { tripPhase } from "@/lib/trip-phase";
import type { TripContext } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";
import { coverGradient } from "./trip-cover";
import { TripHeroCard } from "./trip-hero-card";

function phaseLabel(phase: ReturnType<typeof tripPhase>): string | null {
  if (!phase) return null;
  if (phase.kind === "upcoming") return phase.days === 1 ? t("trips.phaseTomorrow") : t("trips.phaseUpcoming", { days: phase.days });
  if (phase.kind === "ongoing") return t("trips.phaseOngoing", { day: phase.day, total: phase.total });
  return t("trips.phaseEnded");
}

export function TripHero({ trip, members }: Pick<TripContext, "trip" | "members">) {
  const phase = tripPhase(trip.startDate, trip.endDate, todayInIndia());
  const dateLabel = trip.startDate ? `${formatShortDate(trip.startDate)}${trip.endDate ? ` – ${formatShortDate(trip.endDate)}` : ""}` : null;
  return (
    <TripHeroCard
      name={trip.name}
      coverUrl={fileUrl(trip.coverKey)}
      gradient={coverGradient(trip.id) ?? ""}
      destination={trip.destination}
      dateLabel={dateLabel}
      phaseLabel={phaseLabel(phase)}
      phaseLive={phase?.kind === "ongoing"}
      statusLabel={trip.status !== "ACTIVE" ? t(`trips.status.${trip.status}`) : null}
      members={members.map((m) => ({ id: m.id, name: m.displayName, image: m.user?.image ?? null }))}
      membersLabel={membersLabel(members.length)}
    />
  );
}
