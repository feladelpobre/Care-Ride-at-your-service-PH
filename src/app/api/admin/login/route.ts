import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, SESSION_HOURS, checkCredentials, createSessionToken, isAdminConfigured } from "@/lib/adminAuth";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ username: z.string().max(100), password: z.string().max(200) });

/** Dispatcher login (AC24): max 5 attempts per 15 minutes per IP. */
export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "The dispatcher login is not set up yet." }, { status: 503 });
  }
  if (!rateLimit(`admin-login:${clientKey(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many tries. Please wait 15 minutes and try again." }, { status: 429 });
  }
  let parsed;
  try {
    parsed = body.safeParse(await req.json());
  } catch {
    parsed = null;
  }
  if (!parsed?.success || !checkCredentials(parsed.data.username, parsed.data.password)) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
