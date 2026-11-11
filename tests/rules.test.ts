import { describe, expect, it } from "vitest";
import { assess, buildDriverBrief, chooseCrew, chooseVehicle, computePickupTime, estimateFare } from "@/lib/rules";
import { normalizeExtraction, normalizeTime } from "@/lib/normalize";
import { aiRaw, x } from "./fixtures";

describe("vehicle selection (AC3)", () => {
  it("must-stay-seated wheelchair users get a ramp/lift van", () => {
    expect(chooseVehicle(x({ mobility: "wheelchair_must_stay_seated" }))).toBe("wav_ramp_van");
  });
  it("bedbound patients are not supported and the plan is blocked", () => {
    const a = assess(x({ mobility: "stretcher_bedbound" }), 45);
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
    expect(assess(ext, 45).assistChecklist.join(" ")).toMatch(/stair assist/i);
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

describe("fare estimate", () => {
  it("WAV with 2 crew and 3 floors", () => {
    // mid = 900 + 300 + 300 = 1500 -> 1280..1730 (rounded to ₱10)
    expect(estimateFare({ vehicle: "wav_ramp_van", crewSize: 2, floorsWithoutElevator: 3 })).toEqual({ min: 1280, max: 1730 });
  });
  it("not_supported has no fare", () => {
    expect(estimateFare({ vehicle: "not_supported", crewSize: 1, floorsWithoutElevator: 0 })).toEqual({ min: 0, max: 0 });
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
    const a = assess(ext, 45);
    const brief = buildDriverBrief(ext, a).join("\n");
    expect(brief).toContain(a.pickupTime!);
    expect(brief).toMatch(/Crew: 2/);
    expect(brief).toMatch(/☐ Stair assist/);
    expect(brief).toMatch(/Recurring trip: Tue\/Thu\/Sat/);
  });
});
