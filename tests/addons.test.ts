import { describe, expect, it, vi } from "vitest";
import { priceQuote, assess } from "@/lib/rules";
import { buildPlan } from "@/lib/plan";
import { x } from "./fixtures";

const extractTrip = vi.fn();
vi.mock("@/lib/ai", () => ({
  extractTrip: (d: string) => extractTrip(d),
  AiNotConfiguredError: class extends Error {},
  isAiConfigured: () => true,
}));
import { POST as planPOST } from "@/app/api/plan/route";
import { POST as bookPOST } from "@/app/api/bookings/route";

describe("Senior/PWD 20% fare discount (AC13)", () => {
  it("takes 20% off the ride fare only, not the add-on services", () => {
    // fare: 900 base + 300 (5.1–10 km) = 1200 -> discount 240; wheelchair 150 + companion 3h 750 are not discounted
    const q = priceQuote({ vehicle: "wav_ramp_van", crewSize: 1, floorsWithoutElevator: 0, distanceKm: 10, companionHours: 3, wheelchairRental: true, seniorPwdDiscount: true });
    expect(q.discount).toBe(240);
    expect(q.transportSubtotal).toBe(960);
    expect(q.total).toBe(960 + 150 + 750);
    expect(q.lines.some((l) => l.amount === -240 && /RA 9994/.test(l.label))).toBe(true);
  });
  it("adds an ID check to the driver checklist", () => {
    expect(assess(x(), { distanceKm: 5, companionHours: 0, seniorPwdDiscount: true }).assistChecklist.join(" ")).toMatch(/Check Senior Citizen \(OSCA\) or PWD ID/);
  });
});

describe("Wheelchair provided (AC14)", () => {
  it("adds ₱150 and tells the crew to bring a wheelchair", () => {
    const a = assess(x(), { distanceKm: 3, companionHours: 0, wheelchairRental: true });
    expect(a.quote.lines.find((l) => /Wheelchair provided/.test(l.label))?.amount).toBe(150);
    expect(a.assistChecklist[0]).toMatch(/Bring a clean, checked wheelchair/);
  });
});

describe("Step-1 tick boxes reach the plan and the booking (AC15)", () => {
  it("ticked companion sets default hours even if the message didn't ask", async () => {
    extractTrip.mockResolvedValue(x({ tripPurpose: "dialysis", wantsHospitalCompanion: false }));
    const res = await planPOST(new Request("http://t/api/plan", {
      method: "POST",
      headers: { "x-forwarded-for": "7.7.7.7" },
      body: JSON.stringify({ description: "Wheelchair user to St. Luke's BGC Tuesday 9am from Pasig", distanceKm: 10, addons: { wheelchair: true, companion: true, seniorPwd: true } }),
    }));
    const plan = await res.json();
    expect(plan.options).toMatchObject({ companionHours: 5, wheelchairRental: true, seniorPwdDiscount: true });
    expect(plan.assessment.quote.discount).toBeGreaterThan(0);
  });
  it("booking stores the options and recomputes the discount server-side", async () => {
    const plan = buildPlan(x(), { distanceKm: 10, wheelchairRental: true, seniorPwdDiscount: true });
    const tampered = { ...plan, assessment: { ...plan.assessment, quote: { ...plan.assessment.quote, discount: 9999 } } };
    const res = await bookPOST(new Request("http://t/api/bookings", { method: "POST", body: JSON.stringify({ contactName: "Liza", plan: tampered }) }));
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    expect(booking.assessment.quote.discount).toBe(Math.round((350 + 150) * 0.2)); // sedan base + 5.1–10 km band
  });
});
