import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitePanel } from "@/features/invites/invite-panel";
import { AddMemberForm, MemberActions, MyProfileForm } from "@/features/members/member-forms";
import { membersLabel, t } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { requireTripPage } from "@/server/queries/trips";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ params, searchParams }: PageProps<"/trips/[tripId]/members">) {
  const { tripId } = await params;
  const { welcome } = await searchParams;
  const { trip, me, members } = await requireTripPage(tripId, "/members");
  const canAdd = can(me.role, "member.add");

  return (
    <>
      <PageHeader title={t("members.title")} subtitle={trip.name} backHref={`/trips/${tripId}`} />
      <PageBody>
        {welcome ? <p className="bg-success/15 text-foreground rounded-xl px-4 py-3 text-sm font-medium">🎉 {t("members.welcome")}</p> : null}

        <InvitePanel
          tripId={trip.id}
          tripName={trip.name}
          inviteUrl={absoluteUrl(`/join/${trip.inviteToken}`)}
          code={trip.inviteCode}
          siteUrl={siteConfig.url}
          enabled={trip.inviteEnabled}
          canManage={can(me.role, "invite.manage")}
        />

        <section aria-labelledby="members-heading" className="space-y-3">
          <h2 id="members-heading" className="text-lg font-bold">
            {membersLabel(members.length)}
          </h2>
          <ul className="bg-card divide-y rounded-3xl border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar id={m.id} name={m.displayName} image={m.user?.image} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.displayName}
                    {m.id === me.id ? <span className="text-muted-foreground"> ({t("members.you")})</span> : null}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{m.userId ? (m.upiVpa ?? "") : t("members.placeholder")}</p>
                </div>
                {m.role !== "MEMBER" ? <Badge variant={m.role === "COACH" ? "default" : "secondary"}>{t(`roles.${m.role}`)}</Badge> : null}
                {m.id !== me.id ? (
                  <MemberActions
                    tripId={trip.id}
                    memberId={m.id}
                    name={m.displayName}
                    role={m.role}
                    isPlaceholder={!m.userId}
                    canChangeRole={can(me.role, "member.role.update")}
                    canRemove={can(me.role, "member.remove") && (m.role !== "CO_COACH" || me.role === "COACH")}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {canAdd ? (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{t("members.add")}</CardTitle>
              <CardDescription>{t("members.addBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AddMemberForm tripId={trip.id} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{t("members.myProfile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <MyProfileForm tripId={trip.id} displayName={me.displayName} upiVpa={me.upiVpa} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
