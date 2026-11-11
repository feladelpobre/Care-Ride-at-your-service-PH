import { NextResponse } from "next/server";
import { feedbackPriority, feedbackRequestSchema, feedbackTicket } from "@/lib/feedback";
import { countFeedbackForBooking, findBookingForFeedback, recordEvent, saveFeedback } from "@/lib/storage";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_FEEDBACK_PER_BOOKING = 3;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = feedbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Slow down guessing of references
  if (!rateLimit(`fb:${clientKey(req)}`, 10)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const { reference, contactPhone, ...feedback } = parsed.data;
  try {
    const booking = await findBookingForFeedback(reference, contactPhone);
    if (!booking) {
      return NextResponse.json(
        { error: "We couldn't find a booking with that reference and mobile number. Please check both and try again." },
        { status: 404 },
      );
    }
    if ((await countFeedbackForBooking(booking.id)) >= MAX_FEEDBACK_PER_BOOKING) {
      return NextResponse.json(
        { error: "We already have 3 feedback forms for this booking. Please call us so we can help directly." },
        { status: 429 },
      );
    }
    const priority = feedbackPriority(feedback);
    const saved = await saveFeedback(booking.id, feedback, priority);
    await recordEvent("feedback_submitted", { rating: feedback.ratingOverall, priority, issues: feedback.issueTypes.length });
    return NextResponse.json({ ticket: feedbackTicket(saved.id), priority, createdAt: saved.createdAt }, { status: 201 });
  } catch (err) {
    console.error("feedback: failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Could not send your feedback. Please try again." }, { status: 503 });
  }
}
