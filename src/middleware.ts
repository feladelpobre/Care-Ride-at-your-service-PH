import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

/** Only logged-in operators may open the dispatcher board (AC24). */
export async function middleware(req: NextRequest) {
  if (await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  const login = new URL("/admin/login", req.url);
  return NextResponse.redirect(login, { status: 307, headers: { "Cache-Control": "no-store" } });
}

export const config = { matcher: ["/dispatch", "/dispatch/:path*"] };
