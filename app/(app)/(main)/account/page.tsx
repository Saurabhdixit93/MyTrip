import { LogOut, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountForm, ProfileForm } from "@/features/auth/account-forms";
import { t } from "@/lib/i18n";
import { signOutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <>
      <PageHeader title={t("account.title")} actions={<ThemeToggle />} />
      <PageBody>
        {user.isGuest ? (
          <Card className="border-primary/40 bg-primary/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="text-primary size-5" aria-hidden /> {t("auth.upgradeTitle")}
              </CardTitle>
              <CardDescription>{t("auth.upgradeBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/login?callbackUrl=/trips">{t("marketing.signIn")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{t("account.profile")}</CardTitle>
            <CardDescription>{user.email ?? t("account.guest")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name ?? ""} phone={user.phone?.replace(/^\+91/, "") ?? ""} />
          </CardContent>
        </Card>

        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOut /> {t("auth.signOut")}
          </Button>
        </form>

        <Card className="border-destructive/40 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-destructive">{t("account.deleteTitle")}</CardTitle>
            <CardDescription>{t("account.deleteBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountForm />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
