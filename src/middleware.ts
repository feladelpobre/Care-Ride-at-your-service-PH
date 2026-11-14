import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { HUMAN_COOKIE, isHumanCheckEnabled, verifyHumanToken } from "@/lib/humanCheck";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only logged-in operators may open the dispatcher board (AC24).
  if (pathname === "/dispatch" || pathname.startsWith("/dispatch/")) {
    if (await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    const login = new URL("/admin/login", req.url);
    return NextResponse.redirect(login, { status: 307, headers: { "Cache-Control": "no-store" } });
  }

  // "I am human" check at the booking step (AC28): pages open for everyone (and for Google),
  // but planning, booking and feedback need the 24-hour pass. Off until the Turnstile keys are set.
  if (!isHumanCheckEnabled() || (await verifyHumanToken(req.cookies.get(HUMAN_COOKIE)?.value))) {
    return NextResponse.next();
  }
  return NextResponse.json(
    { error: "Please tick the \"I am human\" box first, then try again." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** Admin pages + the customer APIs that need the "I am human" pass. Public pages are not listed. */
export const config = {
  matcher: ["/dispatch", "/dispatch/:path*", "/api/plan", "/api/bookings", "/api/feedback"],
};
