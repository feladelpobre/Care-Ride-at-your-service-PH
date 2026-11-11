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
  it("counts ride requests from saved bookings, so the panel matches the dispatcher board", () => {
    // 2 booking_confirmed events were logged, but 5 bookings are saved (e.g. older ones predate event logging)
    const events = [
      ...Array.from({ length: 8 }, () => ({ name: "trip_analyzed" as const, props: {} })),
      { name: "booking_confirmed" as const, props: { companion: true, wheelchair: true, seniorPwd: true } },
      { name: "booking_confirmed" as const, props: { companion: false, wheelchair: false, seniorPwd: false } },
    ];
    const saved = [
      { companion: true, wheelchair: true, seniorPwd: true },
      { companion: true, wheelchair: true, seniorPwd: true },
      { companion: false, wheelchair: true, seniorPwd: true },
      { companion: false, wheelchair: false, seniorPwd: false },
      { companion: false, wheelchair: false, seniorPwd: false },
    ];
    expect(computeInsights(events, saved)).toMatchObject({ tripsPlanned: 8, bookings: 5, conversionPct: 63, companionPct: 40, wheelchairPct: 60, seniorPwdPct: 60, meetsConversionTarget: true });
  });
  it("never reports more than 100% plan-to-request", () => {
    const saved = Array.from({ length: 3 }, () => ({ companion: false, wheelchair: false, seniorPwd: false }));
    expect(computeInsights([{ name: "trip_analyzed", props: {} }], saved).conversionPct).toBe(100);
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
