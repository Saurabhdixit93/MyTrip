import { CalendarDays, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { JoinTripForm } from "@/features/invites/join-forms";
import { formatShortDate } from "@/lib/format";
import { t } from "@/lib/i18n";
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
      <Card className="bg-primary text-primary-foreground overflow-hidden rounded-3xl border-0">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm opacity-85">{t("join.invitedTo")}</p>
          <h1 className="text-3xl font-extrabold">{preview.name}</h1>
          <ul className="space-y-1 text-sm opacity-90">
            {preview.destination ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden /> {preview.destination}
              </li>
            ) : null}
            {preview.startDate ? (
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden /> {formatShortDate(preview.startDate)}
                {preview.endDate ? ` – ${formatShortDate(preview.endDate)}` : null}
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Users className="size-4" aria-hidden /> {t("trips.members", { count: preview.memberCount })}
              {preview.coachName ? ` · ${t("join.coach", { name: preview.coachName })}` : null}
            </li>
          </ul>
        </CardContent>
      </Card>

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
