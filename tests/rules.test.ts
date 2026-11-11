import { describe, expect, it } from "vitest";
import { assess, buildDriverBrief, chooseCrew, chooseVehicle, companionHoursBillable, computePickupTime, distanceSurcharge, priceQuote } from "@/lib/rules";
import { normalizeExtraction, normalizeTime } from "@/lib/normalize";
import { aiRaw, x } from "./fixtures";

const OPTS = { distanceKm: 10, companionHours: 0 };

describe("vehicle selection (AC3)", () => {
  it("must-stay-seated wheelchair users get a ramp/lift van", () => {
    expect(chooseVehicle(x({ mobility: "wheelchair_must_stay_seated" }))).toBe("wav_ramp_van");
  });
  it("bedbound patients are not supported and the plan is blocked", () => {
    const a = assess(x({ mobility: "stretcher_bedbound" }), OPTS);
    expect(a.vehicle).toBe("not_supported");
    expect(a.blocked).toBe(true);
    expect(a.blockReason).toMatch(/ambulance/i);
  });
  it("oxygen tank upgrades a sedan to a WAV", () => {
    expect(chooseVehicle(x({ mobility: "walks_with_assistance", equipment: ["oxygen_tank"] }))).toBe("wav_ramp_van");
  });
  it("unknown mobility defaults to the safer WAV", () => {
    expect(chooseVehicle(x({ mobility: "unknown" }))).toBe("wav_ramp_van");
  });
});

describe("crew size (AC4)", () => {
  it("wheelchair + 3 floors without elevator needs 2 crew and stair assist", () => {
    const ext = x({ mobility: "wheelchair_must_stay_seated", floorsWithoutElevator: 3 });
    expect(chooseCrew(ext)).toBe(2);
    expect(assess(ext, OPTS).assistChecklist.join(" ")).toMatch(/stair assist/i);
  });
  it("ground-floor wheelchair user needs 1 crew", () => {
    expect(chooseCrew(x({ floorsWithoutElevator: 0 }))).toBe(1);
  });
  it("walker user on a 2nd floor still needs only 1 crew", () => {
    expect(chooseCrew(x({ mobility: "walks_with_assistance", floorsWithoutElevator: 2 }))).toBe(1);
  });
});

describe("pickup time (AC5, AC6)", () => {
  it("09:00 checkup, sedan, 2 crew, 45 min travel -> 07:35", () => {
    const r = computePickupTime({ appointmentTime: "09:00", travelMinutes: 45, tripPurpose: "checkup", vehicle: "sedan_assist", crewSize: 2 });
    expect(r.pickupTime).toBe("07:35");
  });
  it("09:00 dialysis, WAV, 1 crew, 45 min travel -> 07:25", () => {
    const r = computePickupTime({ appointmentTime: "09:00", travelMinutes: 45, tripPurpose: "dialysis", vehicle: "wav_ramp_van", crewSize: 1 });
    expect(r.pickupTime).toBe("07:25");
  });
  it("floors to the nearest 5 minutes", () => {
    const r = computePickupTime({ appointmentTime: "09:03", travelMinutes: 47, tripPurpose: "checkup", vehicle: "sedan_assist", crewSize: 1 });
    expect(r.pickupTime).toBe("07:50"); // 9:03-15-47-10 = 7:51 -> 7:50
  });
  it("returns null when there is no appointment time", () => {
    expect(computePickupTime({ appointmentTime: null, travelMinutes: 45, tripPurpose: "checkup", vehicle: "sedan_assist", crewSize: 1 }).pickupTime).toBeNull();
  });
});

describe("pricing: distance bands + hospital companion (AC11, AC12)", () => {
  it("WAV, 2 crew, 3 floors, 10 km -> ₱1,800 (range ₱1,530–₱2,070)", () => {
    const q = priceQuote({ vehicle: "wav_ramp_van", crewSize: 2, floorsWithoutElevator: 3, distanceKm: 10, companionHours: 0 });
    expect(q.transportSubtotal).toBe(1800);
    expect(q.min).toBe(1530);
    expect(q.max).toBe(2070);
  });
  it("sedan 3 km + 3 h hospital companion -> ₱350 + ₱750 = ₱1,100", () => {
    const q = priceQuote({ vehicle: "sedan_assist", crewSize: 1, floorsWithoutElevator: 0, distanceKm: 3, companionHours: 3 });
    expect(q.total).toBe(1100);
    expect(q.companionSubtotal).toBe(750);
    expect(q.min).toBe(1050); // companion fee is fixed; only transport varies ±15%
    expect(q.max).toBe(1150);
    expect(q.lines.map((l) => l.label).join(" ")).toMatch(/Hospital companion\/caregiver \(3 h/);
  });
  it("uses the right band at each boundary", () => {
    expect(distanceSurcharge("sedan_assist", 5).amount).toBe(0);
    expect(distanceSurcharge("sedan_assist", 5.5).amount).toBe(150);
    expect(distanceSurcharge("wav_ramp_van", 20).amount).toBe(750);
    expect(distanceSurcharge("sedan_assist", 45)).toEqual({ label: "Over 40 km", amount: 1050 }); // 900 + 5 km × ₱30
  });
  it("companion hours: none = 0, otherwise minimum 2 and maximum 12", () => {
    expect(companionHoursBillable(0)).toBe(0);
    expect(companionHoursBillable(1)).toBe(2);
    expect(companionHoursBillable(4.2)).toBe(5);
    expect(companionHoursBillable(15)).toBe(12);
  });
  it("not_supported has no price", () => {
    expect(priceQuote({ vehicle: "not_supported", crewSize: 1, floorsWithoutElevator: 0, distanceKm: 10, companionHours: 3 }).total).toBe(0);
  });
  it("assess() adds the companion to the driver checklist", () => {
    const a = assess(x(), { distanceKm: 10, companionHours: 3 });
    expect(a.companionHours).toBe(3);
    expect(a.assistChecklist.join(" ")).toMatch(/Hospital companion/);
  });
});

describe("normalisation (AC6, AC7)", () => {
  it("clamps out-of-range numbers from the AI", () => {
    const n = normalizeExtraction(aiRaw({ floorsWithoutElevator: 99, companions: -1 }));
    expect(n.floorsWithoutElevator).toBe(20);
    expect(n.companions).toBe(0);
  });
  it("adds 'appointment time' to missingInfo when the time is absent or malformed", () => {
    const n = normalizeExtraction(aiRaw({ appointmentTime: "morningish" }));
    expect(n.appointmentTime).toBeNull();
    expect(n.missingInfo).toContain("appointment time");
  });
  it("normalises 12-hour times", () => {
    expect(normalizeTime("9:00 AM")).toBe("09:00");
    expect(normalizeTime("2:30 pm")).toBe("14:30");
    expect(normalizeTime("12:00 am")).toBe("00:00");
    expect(normalizeTime("25:00")).toBeNull();
  });
});

describe("driver brief", () => {
  it("includes pickup time, vehicle, crew and checklist items", () => {
    const ext = x({ mobility: "wheelchair_must_stay_seated", floorsWithoutElevator: 3, tripPurpose: "dialysis", recurring: true, recurrenceNote: "Tue/Thu/Sat" });
    const a = assess(ext, OPTS);
    const brief = buildDriverBrief(ext, a).join("\n");
    expect(brief).toContain(a.pickupTime!);
    expect(brief).toMatch(/Crew: 2/);
    expect(brief).toMatch(/☐ Stair assist/);
    expect(brief).toMatch(/Recurring trip: Tue\/Thu\/Sat/);
  });
});
