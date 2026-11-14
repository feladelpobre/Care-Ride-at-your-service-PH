import { NextResponse } from "next/server";
import { z } from "zod";
import { HUMAN_COOKIE, HUMAN_HOURS, createHumanToken, isHumanCheckEnabled, verifyTurnstile } from "@/lib/humanCheck";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ token: z.string().min(1).max(2048) });

/** Confirms the "I am human" checkbox with Cloudflare, then sets the 24-hour cookie (AC28). */
export async function POST(req: Request) {
  if (!isHumanCheckEnabled()) return NextResponse.json({ ok: true, skipped: true });
  if (!rateLimit(`human:${clientKey(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }
  let parsed;
  try {
    parsed = body.safeParse(await req.json());
  } catch {
    parsed = null;
  }
  const ip = clientKey(req);
  if (!parsed?.success || !(await verifyTurnstile(parsed.data.token, ip === "anon" ? null : ip))) {
    return NextResponse.json({ error: "We couldn't confirm the check. Please tick the box again." }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HUMAN_COOKIE, await createHumanToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HUMAN_HOURS * 3600,
  });
  return res;
}
