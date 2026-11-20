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

async function getJson(url: string, fetchImpl: typeof fetch, timeoutMs = 6000): Promise<unknown> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
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

/**
 * Typed pick-up spot (AC38): street or nearby landmark + barangay + city, never a house number.
 * Spots a likely house, block/lot or unit number so the screen can ask the rider to leave it out.
 */
export function hasHouseNumber(text: string): boolean {
  return /^\s*(#|no\.?\s*)?\d+[a-z]?\b/i.test(text) || /\b(blk|block|lot|unit|apt|rm|room)\.?\s*#?\d+/i.test(text) || /#\s*\d+/.test(text);
}

type Spot = { lat: number; lng: number; label: string };
const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Short, readable name: up to 4 parts, no postcode, no "Philippines", no repeats. */
function shortLabel(parts: (string | null)[]): string {
  const clean = parts.map((x) => (x ?? "").trim()).filter((x) => x && !/^\d{4}$/.test(x) && x !== "Philippines");
  return clean.filter((x, i) => clean.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i).slice(0, 4).join(", ");
}

/** Nominatim (OpenStreetMap) answer -> spot. */
export function spotFromNominatim(data: unknown): Spot | null {
  const hit = Array.isArray(data) ? (data[0] as { lat?: unknown; lon?: unknown; display_name?: unknown } | undefined) : undefined;
  const lat = Number(hit?.lat);
  const lng = Number(hit?.lon);
  if (!hit || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: round3(lat), lng: round3(lng), label: shortLabel((str(hit.display_name) ?? "").split(",")) };
}

/** Photon (OpenStreetMap search by Komoot) answer -> spot, Philippines only. */
export function spotFromPhoton(data: unknown): Spot | null {
  const f = (data as { features?: { geometry?: { coordinates?: unknown }; properties?: Record<string, unknown> }[] } | null)?.features?.[0];
  const c = f?.geometry?.coordinates;
  const pr = f?.properties ?? {};
  if (!Array.isArray(c) || (str(pr.countrycode) && pr.countrycode !== "PH")) return null;
  const [lng, lat] = c.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: round3(lat), lng: round3(lng), label: shortLabel([str(pr.name), str(pr.street), str(pr.district), str(pr.city), str(pr.state)]) };
}

/**
 * Shorter versions of what the rider typed, tried in order when the full text isn't found:
 * "Nuvali, Canlubang, Calamba" -> "Nuvali, Calamba" -> "Nuvali, Canlubang". Drops "(GPS)" and "near".
 */
export function spotQueries(query: string): string[] {
  const q = query.replace(/\(GPS\)/gi, "").replace(/^\s*(near|malapit sa|tapat ng)\s+/i, "").replace(/\s+/g, " ").trim();
  const parts = q.split(",").map((x) => x.trim()).filter(Boolean);
  const list = [q];
  if (parts.length >= 3) list.push(`${parts[0]}, ${parts[parts.length - 1]}`, `${parts[0]}, ${parts[1]}`);
  if (parts.length === 2) list.push(parts[0]);
  return list.filter((x, i) => x.length >= 4 && list.indexOf(x) === i);
}

/**
 * Finds a typed street or landmark on the map (Philippines only) so the distance is measured
 * from that spot (AC38). Runs only when the rider leaves the box or taps "Find this spot", never
 * while typing (OpenStreetMap search policy). Tries OpenStreetMap's Nominatim first and Photon
 * as a backup, with shorter versions of the text if needed. Returns the position rounded to
 * ~110 m and a short name, or null (never throws).
 */
export async function findSpot(query: string, fetchImpl: typeof fetch = fetch, pauseMs = 1000): Promise<Spot | null> {
  if (query.trim().length < 5) return null;
  const nominatim = (q: string) =>
    `${OSM_ENDPOINT.replace("/reverse", "/search")}?format=jsonv2&countrycodes=ph&limit=1&accept-language=en&q=${encodeURIComponent(q)}`;
  // Photon has no country filter: limit it to the Philippines' bounding box
  const photon = (q: string) => `${PHOTON_ENDPOINT}?limit=1&bbox=116,4.5,127,21.5&q=${encodeURIComponent(q)}`;
  const queries = spotQueries(query).slice(0, 3);
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    // OpenStreetMap asks for at most 1 search per second
    if (i > 0 && pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
    const spot = spotFromNominatim(await getJson(nominatim(q), fetchImpl, 10_000)) ?? spotFromPhoton(await getJson(photon(q), fetchImpl, 10_000));
    if (spot) return spot;
  }
  return null;
}
