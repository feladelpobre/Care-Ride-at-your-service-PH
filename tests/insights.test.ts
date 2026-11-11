import { describe, expect, it, vi } from "vitest";
import { computeInsights } from "@/lib/insights";
import { listEvents } from "@/lib/storage";
import { x } from "./fixtures";

const extractTrip = vi.fn();
vi.mock("@/lib/ai", () => ({ extractTrip: (d: string) => extractTrip(d), AiNotConfiguredError: class extends Error {}, isAiConfigured: () => true }));
import { POST as planPOST } from "@/app/api/plan/route";

describe("funnel insights (AC16)", () => {
  it("computes conversion and add-on rates against the 40% target", () => {
    const i = computeInsights([
      { name: "trip_analyzed", props: {} },
      { name: "trip_analyzed", props: {} },
      { name: "trip_analyzed", props: {} },
      { name: "trip_analyzed", props: {} },
      { name: "booking_confirmed", props: { companion: true, wheelchair: false, seniorPwd: true } },
      { name: "booking_confirmed", props: { companion: false, wheelchair: true, seniorPwd: true } },
      { name: "emergency_redirect", props: {} },
    ]);
    expect(i).toMatchObject({ tripsPlanned: 4, bookings: 2, emergencies: 1, conversionPct: 50, companionPct: 50, wheelchairPct: 50, seniorPwdPct: 100, meetsConversionTarget: true });
  });
  it("shows no rate when there is no data yet", () => {
    expect(computeInsights([])).toMatchObject({ conversionPct: null, meetsConversionTarget: null });
  });
  it("records trip_analyzed and emergency_redirect events from /api/plan, without personal data", async () => {
    const before = (await listEvents()).length;
    extractTrip.mockResolvedValue(x());
    await planPOST(new Request("http://t", { method: "POST", headers: { "x-forwarded-for": "8.8.8.8" }, body: JSON.stringify({ description: "Wheelchair user to PGH tomorrow 8am from Sampaloc" }) }));
    await planPOST(new Request("http://t", { method: "POST", headers: { "x-forwarded-for": "8.8.8.9" }, body: JSON.stringify({ description: "Tatay has chest pain right now please help" }) }));
    const events = (await listEvents()).slice(before);
    expect(events.map((e) => e.name)).toEqual(["trip_analyzed", "emergency_redirect"]);
    expect(JSON.stringify(events)).not.toMatch(/Sampaloc|PGH|chest/);
  });
});
