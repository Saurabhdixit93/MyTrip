import { NextResponse, type NextRequest } from "next/server";

/**
 * The installed PWA launches at "/?source=pwa" (manifest start_url).
 * Send it straight into the app instead of the marketing page.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.get("source") === "pwa") {
    return NextResponse.redirect(new URL("/trips?source=pwa", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
