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

describe("hospital names typed by caregivers (AC26)", () => {
  it("matches a hospital with or without the dash and extra spaces", () => {
    expect(findHospital("St. Luke's Medical Center BGC")?.name).toBe("St. Luke's Medical Center – BGC");
    expect(findHospital("st. luke's medical center  -  bgc")?.name).toBe("St. Luke's Medical Center – BGC");
  });
});

describe("destination read by its area when the hospital isn't on our list (AC26)", () => {
  it("uses the area written in the destination, with or without a dash", () => {
    const plain = estimateRoute("Kapitolyo, Pasig", "Healthway Clinic, Las Pinas");
    const dashed = estimateRoute("Kapitolyo-Pasig", "Healthway Clinic - Las-Pinas");
    expect(plain.source).toBe("estimated");
    expect(plain.distanceKm).toBeGreaterThan(10);
    expect(dashed.distanceKm).toBe(plain.distanceKm);
    expect(plain.note).toMatch(/Pasig → Las Piñas \(area of your destination\)/);
  });
  it("still prefers a known hospital over the area", () => {
    expect(estimateRoute("Pasig", "St. Luke's Medical Center - BGC, Taguig").hospital).toBe("St. Luke's Medical Center – BGC");
  });
  it("falls back to 10 km only when neither the hospital nor its area is known", () => {
    const r = estimateRoute("Pasig", "Some Clinic");
    expect(r.source).toBe("default");
    expect(r.distanceKm).toBe(10);
  });
});

describe("typed pickup towns outside Metro Manila (AC37)", () => {
  it("finds nearby-province towns and measures the distance instead of the 10 km default", () => {
    const r = estimateRoute("Brgy. Balibago, Santa Rosa, Laguna", "Asian Hospital Alabang");
    expect(r.pickupCity).toBe("Santa Rosa, Laguna");
    expect(r.source).toBe("estimated");
    expect(r.distanceKm).toBeGreaterThan(5);
    expect(r.distanceKm).toBeLessThan(25);
    expect(estimateRoute("Bacoor, Cavite", "PGH").pickupCity).toBe("Bacoor, Cavite");
    expect(estimateRoute("SJDM Bulacan", "NKTI").pickupCity).toBe("San Jose del Monte, Bulacan");
    expect(estimateRoute("Dasmarinas", "PGH").pickupCity).toBe("Dasmariñas, Cavite");
  });

  it("measures trips inside a major city from the destination's area, not from Manila", () => {
    const r = estimateRoute("Mandaue City, Cebu", "Chong Hua Hospital, Cebu City");
    expect(r.pickupCity).toBe("Mandaue, Cebu");
    expect(r.distanceKm).toBeLessThan(15);
  });

  it("doesn't suggest Manila hospitals as 'nearest' for a far city", () => {
    expect(estimateRoute("Davao City", null).nearestHospitals).toEqual([]);
    expect(estimateRoute("Davao City", null).source).toBe("default");
  });
});
