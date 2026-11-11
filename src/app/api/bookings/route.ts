import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/schemas";
import { assess, buildDriverBrief } from "@/lib/rules";
import { saveBooking } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid booking.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { contactName, contactPhone, plan } = parsed.data;

  // Never trust client-sent assessment: recompute (AC8)
  const x = plan.extraction;
  const assessment = assess(x, plan.travelMinutes);
  if (assessment.blocked) {
    return NextResponse.json({ error: assessment.blockReason }, { status: 422 });
  }

  try {
    const booking = await saveBooking({
      contactName,
      contactPhone: contactPhone ?? null,
      pickupArea: x.pickupArea,
      destination: x.destination,
      appointmentDate: x.appointmentDate,
      appointmentTime: x.appointmentTime,
      pickupTime: assessment.pickupTime,
      tripPurpose: x.tripPurpose,
      mobility: x.mobility,
      vehicleType: assessment.vehicle,
      crewSize: assessment.crewSize,
      fareMin: assessment.fare.min,
      fareMax: assessment.fare.max,
      driverBrief: buildDriverBrief(x, assessment),
      recurring: x.recurring,
    });
    return NextResponse.json({ booking: { id: booking.id, status: booking.status, assessment } }, { status: 201 });
  } catch (err) {
    console.error("bookings: save failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Could not save the booking. Please try again." }, { status: 503 });
  }
}
