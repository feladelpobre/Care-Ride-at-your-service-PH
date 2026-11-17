/**
 * Turns a GPS position into a readable pickup area, e.g. "Santa Rosa, Laguna" (AC29).
 * Uses BigDataCloud's free client-side reverse-geocoding endpoint (no key). Only the rounded
 * position (~110 m) is sent, and only when the rider taps "Use my current location".
 */
const ENDPOINT = "https://api-bdc.io/data/reverse-geocode-client";

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
export function formatPlace(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Bdc;
  if (str(d.countryCode) && d.countryCode !== "PH") return null;
  const admin = (d.localityInfo?.administrative ?? []).filter((a) => str(a.name) && typeof a.adminLevel === "number");
  const at = (level: number) => admin.filter((a) => a.adminLevel === level).map((a) => str(a.name)!).pop() ?? null;
  const barangay = admin.filter((a) => (a.adminLevel as number) >= 8).map((a) => str(a.name)!).pop() ?? null;
  const town = at(6) ?? str(d.locality) ?? str(d.city);
  const ncr = /national capital region/i.test(str(d.principalSubdivision) ?? "");
  const province = at(4) ?? (ncr ? "Metro Manila" : null);
  const parts = [barangay, town ? tidy(town) : null, province].filter((p): p is string => Boolean(p));
  const unique = parts.filter((p, i) => parts.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
  return unique.length ? unique.join(", ").slice(0, 100) : null;
}

/** Looks up the place name for a rounded GPS position; null if it can't (never throws). */
export async function lookupPlace(g: { lat: number; lng: number }, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const url = `${ENDPOINT}?latitude=${g.lat}&longitude=${g.lng}&localityLanguage=en`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return formatPlace(await res.json());
  } catch {
    return null;
  }
}
