import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_HOURS, createSessionToken, verifyLoginLinkToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opens a login link (AC39). Called by the "Log in" button on /admin/link (a form on our own site),
 * so email scanners that only open the link can't log anyone in, and the strict session cookie works.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  let token: string | undefined;
  try {
    token = String((await req.formData()).get("token") ?? "") || undefined;
  } catch {
    token = undefined;
  }
  if (!(await verifyLoginLinkToken(token))) {
    return NextResponse.redirect(new URL("/admin/login?link=expired", req.url), 303);
  }
  const res = NextResponse.redirect(new URL("/dispatch", req.url), 303);
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
