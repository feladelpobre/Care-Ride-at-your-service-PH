import { NextResponse } from "next/server";
import { planRequestSchema } from "@/lib/schemas";
import { detectEmergency, EMERGENCY_MESSAGE } from "@/lib/emergency";
import { AiNotConfiguredError, extractTrip } from "@/lib/ai";
import { buildPlan } from "@/lib/plan";
import { clientKey, rateLimit } from "@/lib/rateLimit";

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
  const { description, distanceKm, companionHours } = parsed.data;

  // 1) Emergency gate BEFORE the AI (AC2)
  if (detectEmergency(description).emergency) {
    return NextResponse.json({ emergency: true, message: EMERGENCY_MESSAGE });
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
    return NextResponse.json({ emergency: true, message: EMERGENCY_MESSAGE });
  }

  // 4) Deterministic rules: distance, pricing, vehicle, crew, pickup time
  const plan = buildPlan(extraction, { distanceKm, companionHours });
  return NextResponse.json(plan);
}
