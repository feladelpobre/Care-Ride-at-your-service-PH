import type { TripExtraction, TripOptionsInput, TripPlan } from "./schemas";
import { estimateRoute, withFarTripNote } from "./geo";
import { assess, buildDriverBrief, DEFAULT_COMPANION_HOURS } from "./rules";

/**
 * Builds a complete plan from an extraction plus optional caregiver choices.
 * Pure function: used by /api/plan, by /api/bookings (server recompute) and
 * by the UI for instant re-pricing when the caregiver edits places or companion hours.
 * The distance is always calculated by the system from pickup + destination (AC26);
 * there is deliberately no way to pass a caregiver-typed distance.
 */
export function buildPlan(
  extraction: TripExtraction,
  overrides: {
    companionHours?: number;
    /** Tick boxes: "avail a wheelchair", "avail a hospital companion", "Senior/PWD" */
    wheelchairRental?: boolean;
    companion?: boolean;
    seniorPwdDiscount?: boolean;
    /** Phone GPS pickup position, only for the distance (AC29). */
    pickupGps?: { lat: number; lng: number } | null;
    /** The rider's preferred pick-up time (AC31). */
    requestedPickupTime?: string | null;
  } = {},
): TripPlan {
  const route = withFarTripNote(estimateRoute(extraction.pickupArea, extraction.destination, overrides.pickupGps));
  const options: TripOptionsInput = {
    distanceKm: route.distanceKm,
    distanceSource: route.source,
    companionHours:
      overrides.companionHours ??
      (overrides.companion || extraction.wantsHospitalCompanion ? DEFAULT_COMPANION_HOURS[extraction.tripPurpose] : 0),
    wheelchairRental: overrides.wheelchairRental ?? false,
    seniorPwdDiscount: overrides.seniorPwdDiscount ?? false,
    pickupGps: overrides.pickupGps ?? null,
    requestedPickupTime: overrides.requestedPickupTime ?? null,
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
