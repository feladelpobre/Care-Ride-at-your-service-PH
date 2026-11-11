import type { TripExtraction, TripOptionsInput, TripPlan } from "./schemas";
import { estimateRoute } from "./geo";
import { assess, buildDriverBrief, DEFAULT_COMPANION_HOURS } from "./rules";

/**
 * Builds a complete plan from an extraction plus optional caregiver overrides.
 * Pure function: used by /api/plan, by /api/bookings (server recompute) and
 * by the UI for instant re-pricing when the caregiver edits km or companion hours.
 */
export function buildPlan(
  extraction: TripExtraction,
  overrides: {
    distanceKm?: number;
    companionHours?: number;
    /** Tick boxes: "avail a wheelchair", "avail a hospital companion", "Senior/PWD" */
    wheelchairRental?: boolean;
    companion?: boolean;
    seniorPwdDiscount?: boolean;
  } = {},
): TripPlan {
  const route = estimateRoute(extraction.pickupArea, extraction.destination);
  const options: TripOptionsInput = {
    distanceKm: overrides.distanceKm ?? route.distanceKm,
    distanceSource: overrides.distanceKm !== undefined ? "caregiver" : route.source,
    companionHours:
      overrides.companionHours ??
      (overrides.companion || extraction.wantsHospitalCompanion ? DEFAULT_COMPANION_HOURS[extraction.tripPurpose] : 0),
    wheelchairRental: overrides.wheelchairRental ?? false,
    seniorPwdDiscount: overrides.seniorPwdDiscount ?? false,
  };
  const assessment = assess(extraction, options);
  return {
    extraction,
    assessment,
    driverBrief: buildDriverBrief(extraction, assessment),
    options,
    route: { note: route.note, pickupCity: route.pickupCity, hospital: route.hospital, nearestHospitals: route.nearestHospitals },
    emergency: false,
    source: "ai",
  };
}
