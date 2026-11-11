import { describe, expect, it } from "vitest";
import { estimateRoute, estimateTravelMinutes, findCity, findHospital } from "@/lib/geo";
import { buildPlan } from "@/lib/plan";
import { x } from "./fixtures";

describe("distance estimation (AC11)", () => {
  it("matches hospitals and cities by name or alias", () => {
    expect(findHospital("St. Luke's BGC")?.name).toMatch(/BGC/);
    expect(findHospital("dialysis sa NKTI")?.name).toMatch(/NKTI/);
    expect(findCity("Brgy. Kapitolyo, Pasig")?.name).toBe("Pasig");
    expect(findCity("Las Pinas")?.name).toBe("Las Piñas");
  });
  it("estimates a road distance between a known city and hospital", () => {
    const r = estimateRoute("Pasig", "St. Luke's BGC");
    expect(r.source).toBe("estimated");
    expect(r.distanceKm).toBeGreaterThan(3);
    expect(r.distanceKm).toBeLessThan(12);
  });
  it("prices to the nearest hospital when none is named", () => {
    const r = estimateRoute("Muntinlupa", null);
    expect(r.nearestHospitals[0].name).toMatch(/Asian Hospital/);
    expect(r.note).toMatch(/nearest/i);
  });
  it("falls back to 10 km when the pickup area is unknown", () => {
    const r = estimateRoute(null, "PGH");
    expect(r.source).toBe("default");
    expect(r.distanceKm).toBe(10);
  });
  it("converts km to Metro Manila travel minutes", () => {
    expect(estimateTravelMinutes(10)).toBe(45);
    expect(estimateTravelMinutes(1)).toBe(15);
  });
  it("buildPlan defaults companion hours when the caregiver asks for one", () => {
    const p = buildPlan(x({ wantsHospitalCompanion: true, tripPurpose: "dialysis" }));
    expect(p.options.companionHours).toBe(5);
    expect(p.assessment.quote.companionSubtotal).toBe(1250);
  });
});
