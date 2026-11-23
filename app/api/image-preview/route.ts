import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";
import { importRemoteImage } from "@/server/storage/remote-image";

const query = z.object({ url: z.url({ protocol: /^https?$/ }).max(2048) });

/**
 * Same-origin preview for a pasted image link: downloads it with the SSRF-safe importer and returns
 * the optimised copy, i.e. exactly what saving will store. Works even when the source site blocks
 * hotlinking, and reports the real reason when a link can't be used.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const parsed = query.safeParse({ url: req.nextUrl.searchParams.get("url") });
  if (!parsed.success) return NextResponse.json({ error: "Paste a full image link starting with https://" }, { status: 400 });

  try {
    await rateLimit("image.preview", user.id, 60, "10 m");
    const file = await importRemoteImage(parsed.data.url);
    return new NextResponse(new Uint8Array(await file.arrayBuffer()), {
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "private, max-age=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.code === "RATE_LIMITED" ? 429 : 422 });
    console.error("[image-preview] failed", err);
    return NextResponse.json({ error: "We couldn't load that image. Try another link or upload the photo." }, { status: 502 });
  }
}
