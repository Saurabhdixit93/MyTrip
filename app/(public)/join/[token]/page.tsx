import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinTripForm } from "@/features/invites/join-forms";
import { coverGradient } from "@/features/trips/trip-cover";
import { TripHeroCard } from "@/features/trips/trip-hero-card";
import { formatShortDate } from "@/lib/format";
import { membersLabel, t } from "@/lib/i18n";
import { getCurrentUser } from "@/server/auth/session";
import { getInvitePreview } from "@/server/services/invites";

export const metadata: Metadata = { title: "You're invited" };

export default async function JoinTokenPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const [preview, user] = await Promise.all([getInvitePreview(token), getCurrentUser()]);

  if (!preview) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-bold">{t("join.invalid")}</h1>
        <p className="text-muted-foreground">{t("join.invalidBody")}</p>
        <Link href="/join" className="text-primary font-semibold">
          {t("join.title")}
        </Link>
      </div>
    );
  }
  if (user && preview.memberUserIds.includes(user.id)) redirect(`/trips/${preview.id}`);

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium">{t("join.invitedTo")}</p>
        <TripHeroCard
          name={preview.name}
          coverUrl={preview.hasCover ? `/api/invite-cover/${token}` : null}
          gradient={coverGradient(preview.id) ?? ""}
          destination={preview.destination}
          dateLabel={preview.startDate ? `${formatShortDate(preview.startDate)}${preview.endDate ? ` – ${formatShortDate(preview.endDate)}` : ""}` : null}
          phaseLabel={preview.coachName ? t("join.coach", { name: preview.coachName }) : null}
          phaseLive={false}
          statusLabel={null}
          members={preview.members}
          membersLabel={membersLabel(preview.memberCount)}
        />
      </div>

      <JoinTripForm token={token} placeholders={preview.placeholders} signedInName={user?.name ?? null} />

      {!user ? (
        <p className="text-muted-foreground text-center text-sm">
          {t("join.haveAccount")}{" "}
          <Link href={`/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`} className="text-primary font-semibold">
            {t("join.signIn")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
