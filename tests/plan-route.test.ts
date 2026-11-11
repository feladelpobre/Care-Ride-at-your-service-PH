import { beforeEach, describe, expect, it, vi } from "vitest";
import { x } from "./fixtures";

const extractTrip = vi.fn();
vi.mock("@/lib/ai", () => ({
  extractTrip: (d: string) => extractTrip(d),
  AiNotConfiguredError: class extends Error {},
  isAiConfigured: () => true,
}));

import { POST } from "@/app/api/plan/route";

const call = (body: unknown, ip = "1.1.1.1") =>
  POST(new Request("http://test/api/plan", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

describe("POST /api/plan", () => {
  beforeEach(() => {
    extractTrip.mockReset();
  });

  it("returns 400 for a too-short description (AC1)", async () => {
    const res = await call({ description: "short" });
    expect(res.status).toBe(400);
  });

  it("returns emergency WITHOUT calling the AI (AC2)", async () => {
    const res = await call({ description: "Tatay has chest pain and is very pale right now" });
    const json = await res.json();
    expect(json.emergency).toBe(true);
    expect(extractTrip).not.toHaveBeenCalled();
  });

  it("returns a full plan using AI extraction + rules (F1–F3)", async () => {
    extractTrip.mockResolvedValue(x({ mobility: "wheelchair_must_stay_seated", floorsWithoutElevator: 3, tripPurpose: "dialysis" }));
    const res = await call(
      { description: "Mama uses a wheelchair, dialysis at St. Luke's BGC Tuesday 9am, 3rd floor no elevator", distanceKm: 10 },
      "2.2.2.2",
    );
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.assessment.vehicle).toBe("wav_ramp_van");
    expect(plan.assessment.crewSize).toBe(2);
    expect(plan.assessment.pickupTime).toBe("07:10"); // 9:00-30-45-20-15
    expect(plan.driverBrief.length).toBeGreaterThan(3);
    expect(plan.options.distanceSource).toBe("caregiver");
    expect(plan.assessment.quote.total).toBe(1800); // 900 base + 300 (5.1–10 km) + 300 crew + 300 stairs
  });

  it("blocks when the AI flags emergency signals", async () => {
    extractTrip.mockResolvedValue(x({ emergencySignals: true }));
    const json = await (await call({ description: "Lola is very weak and confused since this morning, need check-up" }, "3.3.3.3")).json();
    expect(json.emergency).toBe(true);
  });

  it("returns 502 with a friendly message when the AI fails", async () => {
    extractTrip.mockImplementation(async () => {
      throw new Error("provider down");
    });
    const res = await call({ description: "Wheelchair user going to PGH tomorrow 8am" }, "4.4.4.4");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/try again/i);
  });

  it("rate limits after 10 analyses per IP", async () => {
    extractTrip.mockResolvedValue(x());
    for (let i = 0; i < 10; i++) await call({ description: "Wheelchair user going to PGH tomorrow 8am" }, "9.9.9.9");
    const res = await call({ description: "Wheelchair user going to PGH tomorrow 8am" }, "9.9.9.9");
    expect(res.status).toBe(429);
  });
});
