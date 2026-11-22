import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  isGuest: boolean;
};

/** Current signed-in, non-deleted user (deduped per request). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, image: true, phone: true, isGuest: true },
  });
});

/** For pages: redirect to login (with a return path) when signed out. */
export async function requireUser(returnTo = "/trips"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For server actions: throw a typed error instead of redirecting. */
export async function requireActionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Please sign in again.");
  return user;
}
