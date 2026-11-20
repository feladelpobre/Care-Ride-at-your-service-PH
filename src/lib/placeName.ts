/**
 * Turns a GPS position into a readable pickup area, e.g. "Santa Rosa, Laguna" (AC29).
 * Uses BigDataCloud's free client-side reverse-geocoding endpoint (no key). Only the rounded
 * position (~110 m) is sent, and only when the rider taps "Use my current location".
 */
const ENDPOINT = "https://api-bdc.io/data/reverse-geocode-client";
/** OpenStreetMap's reverse lookup: knows many barangays that BigDataCloud leaves out (AC37). */
const OSM_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

type Admin = { name?: unknown; adminLevel?: unknown };
type Bdc = {
  city?: unknown;
  locality?: unknown;
  principalSubdivision?: unknown;
  countryCode?: unknown;
  localityInfo?: { administrative?: Admin[] };
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
/** "City of Pasig" -> "Pasig"; "Municipality of Cainta" -> "Cainta". */
const tidy = (s: string) => s.replace(/^(City|Municipality) of\s+/i, "").replace(/\s+City$/i, "").trim();

/** Builds "Barangay, Town, Province" (or "Town, Metro Manila") from a reverse-geocoding answer. */
export function formatPlace(data: unknown, extraBarangay: string | null = null): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Bdc;
  if (str(d.countryCode) && d.countryCode !== "PH") return null;
  const admin = (d.localityInfo?.administrative ?? []).filter((a) => str(a.name) && typeof a.adminLevel === "number");
  const at = (level: number) => admin.filter((a) => a.adminLevel === level).map((a) => str(a.name)!).pop() ?? null;
  const barangay = admin.filter((a) => (a.adminLevel as number) >= 8).map((a) => str(a.name)!).pop() ?? extraBarangay;
  const town = at(6) ?? str(d.locality) ?? str(d.city);
  const ncr = /national capital region/i.test(str(d.principalSubdivision) ?? "");
  const province = at(4) ?? (ncr ? "Metro Manila" : null);
  const parts = [barangay, town ? tidy(town) : null, province].filter((p): p is string => Boolean(p));
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(", ").slice(0, 100) : null;
}

type Osm = { address?: Record<string, unknown> };

/** The barangay from an OpenStreetMap answer: PH barangays are mapped as quarter, village, suburb or hamlet. */
export function barangayFromOsm(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const a = (data as Osm).address;
  if (!a || (str(a.country_code) && a.country_code !== "ph")) return null;
  const name = str(a.quarter) ?? str(a.village) ?? str(a.suburb) ?? str(a.hamlet);
  return name ? name.replace(/^(Barangay|Brgy\.?)\s+/i, "") : null;
}

/** "Barangay, Town, Province" from OpenStreetMap alone, used when BigDataCloud is down. */
export function formatOsmPlace(data: unknown): string | null {
  const brgy = barangayFromOsm(data);
  const a = (data as Osm | null)?.address;
  if (!a || (str(a.country_code) && a.country_code !== "ph")) return null;
  const town = str(a.city) ?? str(a.town) ?? str(a.municipality);
  const province = str(a.state) ?? (/metro manila/i.test(str(a.region) ?? "") ? "Metro Manila" : null);
  const parts = [brgy, town ? tidy(town) : null, province].filter((p): p is string => Boolean(p));
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(", ").slice(0, 100) : null;
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Looks up "Barangay, Town, Province" for a rounded GPS position; null if it can't (never throws).
 * Asks BigDataCloud and OpenStreetMap at the same time; OpenStreetMap fills in the barangay when
 * BigDataCloud doesn't have it. Both receive only the rounded position.
 */
export async function lookupPlace(g: { lat: number; lng: number }, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const [bdc, osm] = await Promise.all([
    getJson(`${ENDPOINT}?latitude=${g.lat}&longitude=${g.lng}&localityLanguage=en`, fetchImpl),
    getJson(`${OSM_ENDPOINT}?format=jsonv2&lat=${g.lat}&lon=${g.lng}&zoom=16&addressdetails=1&accept-language=en`, fetchImpl),
  ]);
  return formatPlace(bdc, barangayFromOsm(osm)) ?? formatOsmPlace(osm);
}
