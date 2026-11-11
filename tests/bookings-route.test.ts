import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { listBookings, maskName } from "@/lib/storage";
import { buildPlan } from "@/lib/plan";
import { x } from "./fixtures";

const makePlan = (ext = x()) => buildPlan(ext, { distanceKm: 10 });
const call = (body: unknown) => POST(new Request("http://test/api/bookings", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/bookings", () => {
  it("recomputes the assessment and ignores a tampered fare/vehicle (AC8)", async () => {
    const plan = makePlan(x({ mobility: "wheelchair_must_stay_seated" }));
    const tampered = { ...plan, assessment: { ...plan.assessment, vehicle: "sedan_assist", fare: { min: 1, max: 1 } } };
    const res = await call({ contactName: "Liza Santos", contactPhone: "09171234567", plan: tampered });
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    expect(booking.assessment.vehicle).toBe("wav_ramp_van");
    expect(booking.assessment.fare.min).toBeGreaterThan(1);

    const saved = (await listBookings())[0];
    expect(saved.vehicleType).toBe("wav_ramp_van");
    expect(saved.status).toBe("pending");
    expect(saved.distanceKm).toBe(10);
  });

  it("recomputes the companion fee from hours, not from a client total", async () => {
    const plan = buildPlan(x(), { distanceKm: 3, companionHours: 3 });
    const tampered = { ...plan, assessment: { ...plan.assessment, quote: { ...plan.assessment.quote, total: 0 } } };
    const { booking } = await (await call({ contactName: "Liza", plan: tampered })).json();
    expect(booking.assessment.quote.companionSubtotal).toBe(750);
  });

  it("refuses to book blocked (stretcher) plans", async () => {
    const res = await call({ contactName: "Liza", plan: makePlan(x({ mobility: "stretcher_bedbound" })) });
    expect(res.status).toBe(422);
  });

  it("returns 400 when the contact name is missing", async () => {
    const res = await call({ contactName: "", plan: makePlan() });
    expect(res.status).toBe(400);
  });

  it("masks names for the dispatcher board", () => {
    expect(maskName("liza  santos")).toBe("L*** S***");
  });
});
