import { NextResponse } from "next/server";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { isReminderDue, reminderEmail } from "@/lib/notifications";
import { listReminderCandidates, markNotified } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the "pickup in about 2 hours" email (AC23).
 * Called every 10 minutes by a Supabase pg_cron job with `Authorization: Bearer <CRON_SECRET>`.
 * Safe to call repeatedly: each booking is reminded once (reminder_sent_at).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMailConfigured()) return NextResponse.json({ checked: 0, sent: 0, note: "email not configured" });

  const now = Date.now();
  const due = (await listReminderCandidates(now)).filter((b) => isReminderDue(b, now));
  let sent = 0;
  for (const b of due) {
    if (await sendMail({ to: b.contactEmail!, ...reminderEmail(b) })) {
      await markNotified(b.id, "reminder");
      sent += 1;
    }
  }
  return NextResponse.json({ checked: due.length, sent });
}

export const GET = handle;
export const POST = handle;
