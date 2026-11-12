import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";

/** Only operators may open the dispatcher board (AC24). */
export function middleware(req: NextRequest) {
  const result = checkAdmin(req.headers.get("authorization"), process.env.DISPATCH_USER, process.env.DISPATCH_PASSWORD);
  if (result === "ok") {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (result === "not-configured") {
    return new NextResponse("The dispatcher login is not set up yet.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse("Admin login required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Care Ride dispatcher", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/dispatch", "/dispatch/:path*"] };
