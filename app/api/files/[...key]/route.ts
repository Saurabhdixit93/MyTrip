import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { tripIdFromKey } from "@/server/storage/uploads";

/** Serves private trip files (covers, receipts, QR, proofs) to trip members only. */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  const tripId = tripIdFromKey(key);
  if (!tripId) return new NextResponse("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const member = await db.tripMember.findFirst({ where: { tripId, userId: user.id, deletedAt: null }, select: { id: true } });
  if (!member) return new NextResponse("Not found", { status: 404 });

  const obj = await storage.get(key);
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(obj.body), {
    headers: {
      "Content-Type": obj.contentType,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
