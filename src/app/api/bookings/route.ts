import { NextResponse } from "next/server";
import { bookingRequestSchema } from "@/lib/schemas";
import { buildPlan } from "@/lib/plan";
import { countRecentBookingsByPhone, recordEvent, saveBooking } from "@/lib/storage";
import { bookingReference } from "@/lib/format";

export const runtime = "nodejs";

const MAX_REQUESTS_PER_PHONE_PER_DAY = 3;

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
  const fresh = buildPlan(x, {
    distanceKm: plan.options.distanceKm,
    companionHours: plan.options.companionHours,
    wheelchairRental: plan.options.wheelchairRental,
    seniorPwdDiscount: plan.options.seniorPwdDiscount,
  });
  const assessment = fresh.assessment;
  if (assessment.blocked) {
    return NextResponse.json({ error: assessment.blockReason }, { status: 422 });
  }

  // Anti-fraud: cap ride requests per mobile number per 24 hours
  try {
    if ((await countRecentBookingsByPhone(contactPhone)) >= MAX_REQUESTS_PER_PHONE_PER_DAY) {
      return NextResponse.json(
        { error: "This mobile number already has 3 ride requests today. Please call us to add more trips." },
        { status: 429 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Could not save the booking. Please try again." }, { status: 503 });
  }

  try {
    const booking = await saveBooking({
      contactName,
      contactPhone,
      pickupArea: x.pickupArea,
      destination: x.destination,
      appointmentDate: x.appointmentDate,
      appointmentTime: x.appointmentTime,
      pickupTime: assessment.pickupTime,
      distanceKm: fresh.options.distanceKm,
      companionHours: assessment.companionHours,
      wheelchairRental: fresh.options.wheelchairRental,
      seniorPwdDiscount: fresh.options.seniorPwdDiscount,
      tripPurpose: x.tripPurpose,
      mobility: x.mobility,
      vehicleType: assessment.vehicle,
      crewSize: assessment.crewSize,
      fareMin: assessment.fare.min,
      fareMax: assessment.fare.max,
      driverBrief: fresh.driverBrief,
      recurring: x.recurring,
    });
    await recordEvent("booking_confirmed", {
      vehicle: assessment.vehicle,
      companion: assessment.companionHours > 0,
      wheelchair: fresh.options.wheelchairRental,
      seniorPwd: fresh.options.seniorPwdDiscount,
    });
    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          reference: bookingReference(booking.id),
          requestedAt: booking.createdAt,
          status: booking.status,
          assessment,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("bookings: save failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Could not save the booking. Please try again." }, { status: 503 });
  }
}
