import { beforeEach, describe, expect, it, vi } from "vitest";
import { x } from "./fixtures";
import { estimateRoute, isInServiceArea } from "@/lib/geo";
import { assess, nextCompanionHours } from "@/lib/rules";
import { buildPlan } from "@/lib/plan";
import { planRequestSchema } from "@/lib/schemas";
import { listBookings } from "@/lib/storage";
import { POST as bookPOST } from "@/app/api/bookings/route";

const extractTrip = vi.fn();
vi.mock("@/lib/ai", () => ({
  extractTrip: (d: string) => extractTrip(d),
  AiNotConfiguredError: class extends Error {},
  isAiConfigured: () => true,
}));
import { POST as planPOST } from "@/app/api/plan/route";

const plan = (body: Record<string, unknown>, ip: string) =>
  planPOST(
    new Request("http://t/api/plan", {
      method: "POST",
      headers: { "x-forwarded-for": ip },
      body: JSON.stringify({ pickupLocation: "Kapitolyo, Pasig", destination: "St. Luke's BGC", description: "Wheelchair user going for a check-up", ...body }),
    }),
  );

// Kapitolyo, Pasig (rounded GPS) is much closer to St. Luke's BGC than the Pasig city centre
const KAPITOLYO = { lat: 14.571, lng: 121.061 };

describe("GPS pickup location (AC29)", () => {
  it("measures from the phone's GPS position instead of the city centre", () => {
    const typed = estimateRoute("Pasig", "St. Luke's BGC");
    const gps = estimateRoute("Near Pasig (GPS)", "St. Luke's BGC", KAPITOLYO);
    expect(typed.distanceKm).toBe(6.5);
    expect(gps.distanceKm).toBe(3);
    expect(gps.pickupCity).toMatch(/pick-up point \(near Pasig\)/);
  });
  it("works anywhere in the Philippines, and ignores positions outside it", () => {
    expect(isInServiceArea({ lat: 10.3, lng: 123.9 })).toBe(true); // Cebu
    expect(isInServiceArea({ lat: 35.68, lng: 139.69 })).toBe(false); // Tokyo
    expect(estimateRoute("Pasig", "St. Luke's BGC", { lat: 35.68, lng: 139.69 }).distanceKm).toBe(6.5);
  });
  it("flags trips over 60 km so the dispatcher confirms the price", () => {
    const BAGUIO = { lat: 16.41, lng: 120.59 };
    const far = buildPlan(x({ pickupArea: "Current location (GPS)", destination: "PGH" }), { pickupGps: BAGUIO });
    expect(far.options.distanceKm).toBeGreaterThan(200);
    expect(far.route.pickupCity).toBe("your pick-up point (near Baguio)");
    expect(far.route.note).toMatch(/outside our usual Greater Manila area.*dispatcher confirms/);
    const near = buildPlan(x(), { pickupGps: KAPITOLYO });
    expect(near.route.note).not.toMatch(/outside our usual/);
  });
  it("rounds GPS to about 110 m before using it", () => {
    const r = planRequestSchema.parse({ description: "Wheelchair user to PGH tomorrow at 8am", pickupGps: { lat: 14.571234, lng: 121.061987 } });
    expect(r.pickupGps).toEqual({ lat: 14.571, lng: 121.062 });
  });
});

describe("caregiver hours stepper (AC30)", () => {
  it("steps by one hour between none, the 2-hour minimum and 12", () => {
    expect(nextCompanionHours(0, 1)).toBe(2);
    expect(nextCompanionHours(2, 1)).toBe(3);
    expect(nextCompanionHours(12, 1)).toBe(12);
    expect(nextCompanionHours(5, -1)).toBe(4);
    expect(nextCompanionHours(2, -1)).toBe(0);
    expect(nextCompanionHours(0, -1)).toBe(0);
  });
});

describe("rider's pick-up time (AC31)", () => {
  // Pasig → St. Luke's BGC 6.5 km = 35 min; check-up arrives 15 min early; sedan boarding 10 min → 08:00
  const opts = { distanceKm: 6.5, companionHours: 0 };
  it("suggests a time when the rider gives none", () => {
    const a = assess(x(), opts);
    expect(a.pickupTime).toBe("08:00");
    expect(a.suggestedPickupTime).toBe("08:00");
    expect(a.pickupWarning).toBeNull();
  });
  it("uses the rider's time when it's early enough", () => {
    const a = assess(x(), { ...opts, requestedPickupTime: "07:30" });
    expect(a.pickupTime).toBe("07:30");
    expect(a.pickupWarning).toBeNull();
  });
  it("keeps the rider's time but warns when it's later than suggested", () => {
    const late = assess(x(), { ...opts, requestedPickupTime: "08:30" });
    expect(late.pickupTime).toBe("08:30");
    expect(late.pickupWarning).toMatch(/may be too late.*08:00/);
    expect(assess(x(), { ...opts, requestedPickupTime: "09:15" }).pickupWarning).toMatch(/at or after the 09:00 appointment/);
  });
  it("doesn't change the cost", () => {
    expect(assess(x(), { ...opts, requestedPickupTime: "08:30" }).quote.total).toBe(assess(x(), opts).quote.total);
  });
});

describe("step-1 fields reach the plan and the booking (AC29–AC31)", () => {
  beforeEach(() => extractTrip.mockReset());

  it("uses step-1 mobility, appointment, pick-up time and GPS instead of the AI's guesses", async () => {
    extractTrip.mockResolvedValue(
      x({ mobility: "unknown", appointmentDate: null, appointmentTime: null, missingInfo: ["appointment date", "appointment time", "how the patient moves (wheelchair, walker, bedbound)", "floors"] }),
    );
    const p = await (
      await plan(
        { mobility: "wheelchair_must_stay_seated", appointmentDate: "2026-11-20", appointmentTime: "10:00", pickupTime: "08:45", pickupGps: KAPITOLYO, companionHours: 3 },
        "11.1.1.1",
      )
    ).json();
    expect(p.extraction).toMatchObject({ mobility: "wheelchair_must_stay_seated", appointmentDate: "2026-11-20", appointmentTime: "10:00" });
    expect(p.extraction.missingInfo).toEqual(["floors"]);
    expect(p.options).toMatchObject({ pickupGps: KAPITOLYO, requestedPickupTime: "08:45", companionHours: 3, distanceKm: 3 });
    expect(p.assessment.pickupTime).toBe("08:45");
    expect(p.assessment.vehicle).toBe("wav_ramp_van");
  });

  it("the booking recomputes with the GPS distance and keeps the rider's pick-up time", async () => {
    const p = buildPlan(x(), { pickupGps: KAPITOLYO, requestedPickupTime: "07:45" });
    const tampered = { ...p, assessment: { ...p.assessment, pickupTime: "05:00", quote: { ...p.assessment.quote, total: 1 } } };
    const res = await bookPOST(
      new Request("http://t/api/bookings", {
        method: "POST",
        body: JSON.stringify({ contactName: "Liza", contactEmail: "family@example.com", contactPhone: "09175553131", plan: tampered }),
      }),
    );
    expect(res.status).toBe(201);
    const saved = (await listBookings()).find((b) => b.contactPhone === "09175553131");
    expect(saved).toMatchObject({ pickupTime: "07:45", distanceKm: 3 });
    // The exact GPS position is never stored (spec §7)
    expect(JSON.stringify(saved)).not.toContain("121.061");
  });
});
