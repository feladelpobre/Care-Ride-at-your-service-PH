/**
 * Offline distance estimator (spec §3.5). No maps API in v1:
 * - pickup = centroid of the Metro Manila city/municipality named by the caregiver
 * - destination = a known hospital from a curated list (approximate coordinates)
 * - road distance ≈ straight-line distance × 1.35, rounded to 0.5 km
 * The distance is always calculated here, never typed by the caregiver (AC26).
 * A maps API is planned for v2.
 */

export type Place = { name: string; aliases: string[]; lat: number; lng: number };

export const CITIES: Place[] = [
  { name: "Manila", aliases: ["manila", "ermita", "malate", "sampaloc", "tondo", "sta. mesa", "santa mesa", "paco", "quiapo", "binondo"], lat: 14.5995, lng: 120.9842 },
  { name: "Quezon City", aliases: ["quezon city", "qc", "cubao", "fairview", "novaliches", "diliman", "commonwealth", "kamuning"], lat: 14.676, lng: 121.0437 },
  { name: "Makati", aliases: ["makati"], lat: 14.5547, lng: 121.0244 },
  { name: "Pasig", aliases: ["pasig", "ortigas", "kapitolyo"], lat: 14.5764, lng: 121.0851 },
  { name: "Taguig", aliases: ["taguig", "bgc", "bonifacio global city", "fort bonifacio"], lat: 14.5176, lng: 121.0509 },
  { name: "Mandaluyong", aliases: ["mandaluyong"], lat: 14.5794, lng: 121.0359 },
  { name: "San Juan", aliases: ["san juan", "greenhills"], lat: 14.6019, lng: 121.0355 },
  { name: "Pasay", aliases: ["pasay"], lat: 14.5378, lng: 121.0014 },
  { name: "Parañaque", aliases: ["parañaque", "paranaque", "bf homes"], lat: 14.4793, lng: 121.0198 },
  { name: "Las Piñas", aliases: ["las piñas", "las pinas"], lat: 14.4445, lng: 120.9939 },
  { name: "Muntinlupa", aliases: ["muntinlupa", "alabang"], lat: 14.4081, lng: 121.0415 },
  { name: "Marikina", aliases: ["marikina"], lat: 14.6507, lng: 121.1029 },
  { name: "Caloocan", aliases: ["caloocan", "bagong silang", "camarin"], lat: 14.6507, lng: 120.9667 },
  { name: "Malabon", aliases: ["malabon"], lat: 14.6681, lng: 120.9567 },
  { name: "Navotas", aliases: ["navotas"], lat: 14.6667, lng: 120.9417 },
  { name: "Valenzuela", aliases: ["valenzuela"], lat: 14.7011, lng: 120.983 },
  { name: "Pateros", aliases: ["pateros"], lat: 14.5446, lng: 121.0687 },
  { name: "Cainta", aliases: ["cainta"], lat: 14.5786, lng: 121.1222 },
  { name: "Antipolo", aliases: ["antipolo"], lat: 14.586, lng: 121.1761 },
];

export const HOSPITALS: Place[] = [
  { name: "Philippine General Hospital (PGH)", aliases: ["pgh", "philippine general"], lat: 14.5776, lng: 120.9857 },
  { name: "St. Luke's Medical Center – BGC", aliases: ["st. luke's bgc", "st lukes bgc", "st. luke's global", "st luke's bgc", "slmc bgc"], lat: 14.5547, lng: 121.0482 },
  { name: "St. Luke's Medical Center – Quezon City", aliases: ["st. luke's qc", "st lukes qc", "st. luke's quezon", "st luke's e. rodriguez", "slmc qc"], lat: 14.6227, lng: 121.0233 },
  { name: "Makati Medical Center", aliases: ["makati med", "makati medical"], lat: 14.5592, lng: 121.0146 },
  { name: "The Medical City (Ortigas)", aliases: ["medical city", "tmc"], lat: 14.5895, lng: 121.0693 },
  { name: "Asian Hospital and Medical Center", aliases: ["asian hospital"], lat: 14.4072, lng: 121.0414 },
  { name: "National Kidney and Transplant Institute (NKTI)", aliases: ["nkti", "national kidney"], lat: 14.6474, lng: 121.0469 },
  { name: "Philippine Heart Center", aliases: ["heart center", "phc"], lat: 14.6436, lng: 121.0487 },
  { name: "Lung Center of the Philippines", aliases: ["lung center"], lat: 14.6466, lng: 121.0465 },
  { name: "East Avenue Medical Center", aliases: ["east avenue", "eamc"], lat: 14.6417, lng: 121.0479 },
  { name: "Cardinal Santos Medical Center", aliases: ["cardinal santos"], lat: 14.6011, lng: 121.0398 },
  { name: "UST Hospital", aliases: ["ust hospital", "university of santo tomas hospital"], lat: 14.6097, lng: 120.9894 },
  { name: "Manila Doctors Hospital", aliases: ["manila doctors"], lat: 14.5823, lng: 120.981 },
  { name: "Rizal Medical Center", aliases: ["rizal medical"], lat: 14.5764, lng: 121.0681 },
  { name: "Amang Rodriguez Memorial Medical Center", aliases: ["amang rodriguez"], lat: 14.6331, lng: 121.0997 },
];

/** Lower-case, strip accents, unify apostrophes, and treat dashes/extra spaces as one space. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function findPlace(text: string | null, list: Place[]): Place | null {
  if (!text) return null;
  const t = norm(text);
  // Prefer the longest matching alias (e.g., "st. luke's bgc" over "bgc")
  let best: { p: Place; len: number } | null = null;
  for (const p of list) {
    for (const a of [p.name, ...p.aliases]) {
      const na = norm(a);
      if (t.includes(na) && (!best || na.length > best.len)) best = { p, len: na.length };
    }
  }
  return best?.p ?? null;
}

export const findCity = (text: string | null) => findPlace(text, CITIES);
export const findHospital = (text: string | null) => findPlace(text, HOSPITALS);

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Straight line × 1.35 road factor, minimum 2 km, rounded to 0.5 km. */
export function roadKm(a: Place, b: Place): number {
  return Math.max(2, Math.round(haversineKm(a, b) * 1.35 * 2) / 2);
}

/** GPS works anywhere in the Philippines (AC29); positions outside this box are ignored. */
export const SERVICE_AREA = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 };

/** Trips longer than this are outside our usual Greater Manila area: the dispatcher confirms the price. */
export const USUAL_MAX_KM = 60;

/** True when a GPS position is inside the Philippines (positions outside it are ignored). */
export function isInServiceArea(g: { lat: number; lng: number } | null | undefined): g is { lat: number; lng: number } {
  return Boolean(
    g && g.lat >= SERVICE_AREA.minLat && g.lat <= SERVICE_AREA.maxLat && g.lng >= SERVICE_AREA.minLng && g.lng <= SERVICE_AREA.maxLng,
  );
}

/** The Metro Manila city centre closest to a GPS position, to name the pickup area. */
export function nearestCity(g: { lat: number; lng: number }): Place {
  return CITIES.reduce((best, c) => (haversineKm(g, c) < haversineKm(g, best) ? c : best), CITIES[0]);
}

/** A short name for a GPS pickup: "near Pasig" inside Metro Manila, otherwise just "your GPS location". */
export function gpsPlaceName(g: { lat: number; lng: number }): string {
  const c = nearestCity(g);
  return haversineKm(g, c) <= 15 ? `your GPS location (near ${c.name})` : "your GPS location";
}

export type RouteEstimate = {
  distanceKm: number;
  source: "estimated" | "default";
  pickupCity: string | null;
  hospital: string | null;
  nearestHospitals: { name: string; km: number }[];
  note: string;
};

export const DEFAULT_KM = 10;

/**
 * Estimate route distance. Destination order: a known hospital, else the area (city/barangay
 * alias) written in the destination, else 10 km. If no destination is given, the nearest hospital.
 */
export function estimateRoute(
  pickupArea: string | null,
  destination: string | null,
  gps?: { lat: number; lng: number } | null,
): RouteEstimate {
  // Phone GPS beats the typed area (AC29): measure from the exact pickup point
  const fromGps = isInServiceArea(gps);
  const city: Place | null = fromGps
    ? { name: gpsPlaceName(gps), aliases: [], lat: gps.lat, lng: gps.lng }
    : findCity(pickupArea);
  const hospital = findHospital(destination);
  const nearest = city
    ? HOSPITALS.map((h) => ({ name: h.name, km: roadKm(city, h) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 3)
    : [];

  if (city && hospital) {
    return { distanceKm: roadKm(city, hospital), source: "estimated", pickupCity: city.name, hospital: hospital.name, nearestHospitals: nearest, note: `Approx. road distance ${city.name} → ${hospital.name}` };
  }
  if (city && !destination) {
    return { distanceKm: nearest[0].km, source: "estimated", pickupCity: city.name, hospital: null, nearestHospitals: nearest, note: `No hospital named; priced to the nearest: ${nearest[0].name}` };
  }
  // Hospital/clinic not on our list: read the area written in the destination instead
  // (e.g., "Healthway Clinic, Mandaluyong" or "dialysis center sa Las-Pinas"), dash or no dash.
  const destinationArea = hospital ? null : findCity(destination);
  if (city && destinationArea) {
    return {
      distanceKm: roadKm(city, destinationArea),
      source: "estimated",
      pickupCity: city.name,
      hospital: null,
      nearestHospitals: nearest,
      note: `Approx. road distance ${city.name} → ${destinationArea.name} (area of your destination)`,
    };
  }
  return {
    distanceKm: DEFAULT_KM,
    source: "default",
    pickupCity: city?.name ?? null,
    hospital: hospital?.name ?? null,
    nearestHospitals: nearest,
    note: "We couldn't find this pickup area or hospital on our map yet, so we used 10 km. The dispatcher confirms the distance when they call.",
  };
}

/** Adds the "far trip" note when a trip is longer than the usual Greater Manila area. */
export function withFarTripNote(r: RouteEstimate): RouteEstimate {
  if (r.distanceKm <= USUAL_MAX_KM) return r;
  return {
    ...r,
    note: `${r.note}. This trip is outside our usual Greater Manila area (over ${USUAL_MAX_KM} km): the price shown is an estimate, and the dispatcher confirms it when they call`,
  };
}

/** Metro Manila average ≈ 3.5 min/km + 10 min buffer, rounded to 5, clamped 15–180. */
export function estimateTravelMinutes(km: number): number {
  return Math.min(180, Math.max(15, Math.round((km * 3.5 + 10) / 5) * 5));
}
