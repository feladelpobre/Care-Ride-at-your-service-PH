import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";
import { statusUpdateSchema } from "@/lib/callQueue";
import { updateStatus } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Staff-only (AC35): marks a booking as called/confirmed, done or cancelled, or a feedback ticket as called back or resolved.
 * The admin session cookie is checked here, not trusted from the page.
 */
function readCookie(req: Request, name: string): string | undefined {
  const pair = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

export async function POST(req: Request) {
  if (!(await verifySessionToken(readCookie(req, ADMIN_COOKIE)))) {
    return json({ error: "Please log in to the dispatcher board again." }, 401);
  }
  // Same-site requests only: a page on another site can't change statuses
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "Not allowed." }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid status." }, 400);

  try {
    const found = await updateStatus(parsed.data);
    if (!found) return json({ error: "Not found. Please refresh the board." }, 404);
  } catch {
    return json({ error: "Could not save. Please try again." }, 502);
  }
  return json({ ok: true, status: parsed.data.status }, 200);
}
