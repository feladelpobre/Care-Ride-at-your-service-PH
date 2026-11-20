import { describe, expect, it } from "vitest";
import { firstUnfinished, isUnlocked, type Step1Fields } from "@/lib/stepGate";

const empty: Step1Fields = { description: "", pickupLocation: "", hasGps: false, destination: "", mobility: "unknown", appointmentDate: "", appointmentTime: "" };
const filled: Step1Fields = {
  description: "Mama uses a wheelchair, 3rd floor walang elevator",
  pickupLocation: "Kapitolyo, Pasig",
  hasGps: false,
  gpsTried: true,
  destination: "St. Luke's BGC",
  mobility: "wheelchair_must_stay_seated",
  appointmentDate: "2026-11-20",
  appointmentTime: "09:00",
};

describe("step 1 is filled in order (AC33)", () => {
  it("starts with only the description open", () => {
    expect(isUnlocked(empty, "description")).toBe(true);
    expect(isUnlocked(empty, "pickup")).toBe(false);
    expect(firstUnfinished(empty)?.key).toBe("description");
  });

  it("keeps caregiver hours and the times locked until mobility is chosen (the founder's test)", () => {
    const noMobility = { ...filled, mobility: "unknown", appointmentDate: "", appointmentTime: "" };
    expect(isUnlocked(noMobility, "mobility")).toBe(true);
    expect(isUnlocked(noMobility, "caregiver")).toBe(false);
    expect(isUnlocked(noMobility, "appointmentDate")).toBe(false);
    expect(firstUnfinished(noMobility)?.label).toBe("how the patient moves");
    expect(isUnlocked({ ...noMobility, mobility: "walks_with_assistance" }, "caregiver")).toBe(true);
  });

  it("GPS comes first: a typed pickup counts only after the GPS button was tried (AC37)", () => {
    const typedOnly = { ...filled, gpsTried: false };
    expect(firstUnfinished(typedOnly)?.key).toBe("pickup");
    expect(firstUnfinished(typedOnly)?.label).toMatch(/GPS button first/);
    expect(isUnlocked(typedOnly, "destination")).toBe(false);
    // GPS found the place, or GPS was tried (refused/failed/not exact) and the place was typed
    expect(isUnlocked({ ...typedOnly, hasGps: true }, "destination")).toBe(true);
    expect(isUnlocked({ ...typedOnly, gpsTried: true }, "destination")).toBe(true);
    expect(isUnlocked({ ...typedOnly, gpsTried: true, pickupLocation: "" }, "destination")).toBe(false);
  });

  it("GPS counts as a pickup location", () => {
    const withGps = { ...empty, description: filled.description, hasGps: true };
    expect(isUnlocked(withGps, "destination")).toBe(true);
  });

  it("re-locks later parts if an earlier one is cleared, even if they were filled", () => {
    const cleared = { ...filled, destination: "" };
    expect(isUnlocked(cleared, "mobility")).toBe(false);
    expect(isUnlocked(cleared, "plan")).toBe(false);
    expect(firstUnfinished(cleared)?.key).toBe("destination");
  });

  it("opens Plan my ride, the pick-up time and the add-ons only when everything is done", () => {
    expect(firstUnfinished(filled)).toBeNull();
    for (const k of ["pickupTime", "addons", "plan"] as const) expect(isUnlocked(filled, k)).toBe(true);
    expect(isUnlocked({ ...filled, appointmentTime: "" }, "plan")).toBe(false);
  });
});
