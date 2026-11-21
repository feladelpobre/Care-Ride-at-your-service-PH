import { NextResponse } from "next/server";
import { z } from "zod";
import { createLoginLinkToken, isAdminConfigured, isStaffEmail, LINK_MINUTES, LINK_SENT_MESSAGE } from "@/lib/adminAuth";
import { sendMail } from "@/lib/mailer";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Links always point to the real site, never to the Host header a request claims
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://care-ride-at-your-service-ph.vercel.app";

const body = z.object({ email: z.string().trim().toLowerCase().max(200).email("Please enter a valid email address.") });

/**
 * "Email me a login link" (AC39). Max 5 requests per device and 3 per email per 15 minutes.
 * Never says whether the email is on the list; never logs the email address.
 */
export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "The dispatcher login is not set up yet." }, { status: 503 });
  }
  if (!rateLimit(`admin-link-ip:${clientKey(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many tries. Please wait 15 minutes and try again." }, { status: 429 });
  }
  let parsed;
  try {
    parsed = body.safeParse(await req.json());
  } catch {
    parsed = null;
  }
  if (!parsed?.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const email = parsed.data.email;
  if (isStaffEmail(email) && rateLimit(`admin-link-email:${email}`, 3, 15 * 60_000)) {
    const link = `${SITE}/admin/link?token=${encodeURIComponent(await createLoginLinkToken(email))}`;
    await sendMail({
      to: email,
      subject: "Your Care Ride dispatcher login link",
      text: `Tap this link to log in to the Care Ride dispatcher board:\n\n${link}\n\nIt works for ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email; nobody can log in without it.`,
      html: `<p>Tap the button to log in to the Care Ride dispatcher board.</p><p><a href="${link}" style="display:inline-block;background:#5B3E96;color:#fff;padding:12px 20px;border-radius:10px;font-weight:bold;text-decoration:none">Log in to the dispatcher board</a></p><p>It works for ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email; nobody can log in without it.</p>`,
    });
  }
  return NextResponse.json({ ok: true, message: LINK_SENT_MESSAGE });
}
