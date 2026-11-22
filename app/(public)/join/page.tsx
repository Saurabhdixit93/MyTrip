import { Ticket } from "lucide-react";
import type { Metadata } from "next";
import { JoinCodeForm } from "@/features/invites/join-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Join a trip" };

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const { code } = await searchParams;
  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-2 text-center">
        <span className="bg-secondary mx-auto flex size-14 items-center justify-center rounded-2xl">
          <Ticket className="text-primary size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">{t("join.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("join.subtitle")}</p>
      </div>
      <JoinCodeForm defaultCode={typeof code === "string" ? code : ""} />
    </div>
  );
}
