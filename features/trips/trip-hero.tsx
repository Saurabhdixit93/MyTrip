import { CalendarDays, Lock, MapPin } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { Badge } from "@/components/ui/badge";
import type { TripContext } from "@/server/queries/trips";
import { fileUrl } from "@/server/storage/uploads";
import { formatShortDate } from "@/lib/format";
import { membersLabel, t } from "@/lib/i18n";
import { TripCover } from "./trip-cover";

export function TripHero({ trip, members }: Pick<TripContext, "trip" | "members">) {
  const shown = members.slice(0, 5);
  return (
    <TripCover tripId={trip.id} coverUrl={fileUrl(trip.coverKey)} className="rounded-3xl text-white" eager>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative flex min-h-44 flex-col justify-end gap-2 p-5">
        {trip.status !== "ACTIVE" ? (
          <Badge variant="secondary" className="w-fit">
            <Lock /> {t(`trips.status.${trip.status}`)}
          </Badge>
        ) : null}
        <h2 className="text-2xl font-extrabold drop-shadow">{trip.name}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          {trip.destination ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {trip.destination}
            </span>
          ) : null}
          {trip.startDate ? (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden /> {formatShortDate(trip.startDate)}
              {trip.endDate ? ` – ${formatShortDate(trip.endDate)}` : null}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {shown.map((m) => (
              <MemberAvatar key={m.id} id={m.id} name={m.displayName} image={m.user?.image} className="size-8 ring-2 ring-black/20" />
            ))}
          </div>
          <span className="text-sm text-white/90">{membersLabel(members.length)}</span>
        </div>
      </div>
    </TripCover>
  );
}
