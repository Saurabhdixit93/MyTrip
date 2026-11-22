import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DevLoginForm, EmailLoginForm } from "@/features/auth/login-forms";
import { t } from "@/lib/i18n";
import { signInWithGoogleAction } from "@/server/actions/auth";
import { authFeatures } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

function safeCallback(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/trips";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  const user = await getCurrentUser();
  if (user && !user.isGuest) redirect(callbackUrl);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <LogoMark className="mx-auto size-14" />
        <h1 className="text-2xl font-bold">{user?.isGuest ? t("auth.upgradeTitle") : t("auth.title")}</h1>
        <p className="text-muted-foreground text-sm">{user?.isGuest ? t("auth.upgradeBody") : t("auth.subtitle")}</p>
      </div>

      {sp.error ? (
        <Alert variant="destructive">
          <AlertDescription>{t("auth.error")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        {authFeatures.google ? (
          <form action={signInWithGoogleAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <Button type="submit" size="lg" className="h-11 w-full">
              <GoogleIcon /> {t("auth.google")}
            </Button>
          </form>
        ) : null}

        {authFeatures.google && authFeatures.email ? <OrDivider /> : null}
        {authFeatures.email ? <EmailLoginForm callbackUrl={callbackUrl} /> : null}

        {authFeatures.devLogin ? (
          <>
            <OrDivider />
            <section aria-labelledby="dev-login-title" className="space-y-3 rounded-2xl border border-dashed p-4">
              <h2 id="dev-login-title" className="text-sm font-semibold">
                {t("auth.devTitle")}
              </h2>
              <DevLoginForm callbackUrl={callbackUrl} />
            </section>
          </>
        ) : null}
      </div>

      <p className="text-muted-foreground text-center text-sm">
        {t("auth.haveCode")}{" "}
        <Link href="/join" className="text-primary font-semibold underline-offset-4 hover:underline">
          {t("auth.joinTrip")}
        </Link>
      </p>
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          {t("auth.terms")}
        </Link>
      </p>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs uppercase">
      <Separator className="flex-1" /> {t("auth.or")} <Separator className="flex-1" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
