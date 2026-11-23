import { NextResponse } from "next/server";
import { getInviteCoverKey } from "@/server/services/invites";
import { storage } from "@/server/storage";

/**
 * Trip cover for the join screen. Invitees aren't members yet, so /api/files would refuse them;
 * a valid invite token unlocks ONLY the cover photo (never receipts, QR or payment proofs).
 * Turning invites off or resetting the link immediately revokes it.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/invite-cover/[token]">) {
  const { token } = await ctx.params;
  if (!/^[\w-]{16,64}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const key = await getInviteCoverKey(token);
  const obj = key ? await storage.get(key) : null;
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
