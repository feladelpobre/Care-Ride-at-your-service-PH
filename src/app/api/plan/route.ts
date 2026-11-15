import { NextResponse } from "next/server";
import { planRequestSchema } from "@/lib/schemas";
import { detectEmergency, EMERGENCY_MESSAGE } from "@/lib/emergency";
import { AiNotConfiguredError, extractTrip } from "@/lib/ai";
import { buildPlan } from "@/lib/plan";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { recordEvent } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { description, pickupLocation, destination, companionHours, addons, mobility, appointmentDate, appointmentTime, pickupTime, pickupGps } =
    parsed.data;

  // 1) Emergency gate BEFORE the AI (AC2)
  if (detectEmergency(description).emergency) {
    await recordEvent("emergency_redirect", { source: "keywords" });
    return NextResponse.json({ emergency: true, message: EMERGENCY_MESSAGE });
  }

  // Pickup location is required (AC21), checked after the emergency gate so 911 always wins
  if (!pickupLocation || pickupLocation.trim().length < 3) {
    return NextResponse.json({ error: "Please enter the pickup location (barangay and city)." }, { status: 400 });
  }
  // Destination is required too (AC25): the system calculates the distance from it
  if (!destination || destination.trim().length < 3) {
    return NextResponse.json({ error: "Please enter the destination (hospital or clinic)." }, { status: 400 });
  }

  // 2) Rate limit to protect the AI budget
  if (!rateLimit(clientKey(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  }

  // 3) AI extraction
  let extraction;
  try {
    extraction = await extractTrip(description);
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
    }
    const e = err as { name?: string; statusCode?: number; message?: string };
    // Log the error type, status and provider message (never the request body or keys)
    console.error("plan: AI extraction failed", e?.name ?? "unknown", e?.statusCode ?? "-", (e?.message ?? "").slice(0, 200));
    return NextResponse.json({ error: "Could not analyse the trip. Please try again." }, { status: 502 });
  }

  if (extraction.emergencySignals) {
    await recordEvent("emergency_redirect", { source: "ai" });
    return NextResponse.json({ emergency: true, message: EMERGENCY_MESSAGE });
  }

  // The caregiver's own step-1 fields win over the AI's guesses (AC21, AC25, AC30)
  extraction = {
    ...extraction,
    pickupArea: pickupLocation.trim(),
    destination: destination.trim(),
    ...(mobility && mobility !== "unknown" ? { mobility } : {}),
    ...(appointmentDate ? { appointmentDate } : {}),
    ...(appointmentTime ? { appointmentTime } : {}),
  };
  extraction.missingInfo = extraction.missingInfo.filter(
    (m) =>
      !/pickup|destination|hospital|clinic/i.test(m) &&
      // Only drop reminders the caregiver has just answered in step 1
      !(mobility && mobility !== "unknown" && /moves|mobility|wheelchair|walker/i.test(m)) &&
      !(appointmentDate && /date/i.test(m)) &&
      !(appointmentTime && /appointment time/i.test(m)),
  );

  // 4) Deterministic rules: system-calculated distance (AC26), pricing, vehicle, crew, pickup time
  const plan = buildPlan(extraction, {
    pickupGps: pickupGps ?? null,
    requestedPickupTime: pickupTime ?? null,
    companionHours,
    companion: addons.companion,
    wheelchairRental: addons.wheelchair,
    seniorPwdDiscount: addons.seniorPwd,
  });
  await recordEvent("trip_analyzed", {
    vehicle: plan.assessment.vehicle,
    blocked: plan.assessment.blocked,
    companion: plan.options.companionHours > 0,
    wheelchair: plan.options.wheelchairRental,
    seniorPwd: plan.options.seniorPwdDiscount,
  });
  return NextResponse.json(plan);
}
