import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { HUMAN_COOKIE, isHumanCheckEnabled, verifyHumanToken } from "@/lib/humanCheck";

/** Customer pages and APIs that need the "I am human" check first (AC28). */
const HUMAN_API = ["/api/plan", "/api/bookings", "/api/feedback"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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

  // "I am human" check before the app opens (AC28). Switched off until the Turnstile keys are set.
  if (!isHumanCheckEnabled() || (await verifyHumanToken(req.cookies.get(HUMAN_COOKIE)?.value))) {
    return NextResponse.next();
  }
  if (HUMAN_API.includes(pathname)) {
    return NextResponse.json(
      { error: "Please confirm you are human first: reload the page and tick the box." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const verify = new URL("/verify", req.url);
  verify.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(verify, { status: 307, headers: { "Cache-Control": "no-store" } });
}

export const config = {
  matcher: ["/", "/feedback", "/dispatch", "/dispatch/:path*", "/api/plan", "/api/bookings", "/api/feedback"],
};
