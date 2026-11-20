import { describe, expect, it, vi } from "vitest";
import { barangayFromOsm, findSpot, formatOsmPlace, formatPlace, hasHouseNumber, lookupPlace, spotQueries } from "@/lib/placeName";

// Shapes taken from the real reverse-geocoding answers for these places
const SANTA_ROSA = {
  city: "Santa Rosa", locality: "Santa Rosa", principalSubdivision: "Calabarzon (Region IV-A)", countryCode: "PH",
  localityInfo: { administrative: [{ name: "Philippines", adminLevel: 2 }, { name: "Calabarzon (Region IV-A)", adminLevel: 3 }, { name: "Laguna", adminLevel: 4 }, { name: "Santa Rosa", adminLevel: 6 }] },
};
const PASIG = {
  city: "Manila", locality: "City of Pasig", principalSubdivision: "National Capital Region", countryCode: "PH",
  localityInfo: { administrative: [{ name: "Philippines", adminLevel: 2 }, { name: "National Capital Region", adminLevel: 3 }, { name: "Manila", adminLevel: 3 }, { name: "City of Pasig", adminLevel: 6 }, { name: "Pasig First District", adminLevel: 7 }] },
};

describe("GPS fills the pickup area automatically (AC29)", () => {
  it("names the town and province outside Metro Manila", () => {
    expect(formatPlace(SANTA_ROSA)).toBe("Santa Rosa, Laguna");
  });
  it("names the city and 'Metro Manila' inside NCR, without 'City of'", () => {
    expect(formatPlace(PASIG)).toBe("Pasig, Metro Manila");
  });
  it("adds the barangay when the service knows it", () => {
    const withBrgy = { ...SANTA_ROSA, localityInfo: { administrative: [...SANTA_ROSA.localityInfo.administrative, { name: "Dita", adminLevel: 10 }] } };
    expect(formatPlace(withBrgy)).toBe("Dita, Santa Rosa, Laguna");
  });
  it("gives up quietly for other countries, bad data or a network error", async () => {
    expect(formatPlace({ ...SANTA_ROSA, countryCode: "JP" })).toBeNull();
    expect(formatPlace("nonsense")).toBeNull();
    expect(await lookupPlace({ lat: 14.312, lng: 121.111 }, vi.fn(async () => { throw new Error("offline"); }))).toBeNull();
  });
  it("adds the barangay from OpenStreetMap when BigDataCloud doesn't have it (AC37)", async () => {
    // Real answers for Pasig: BigDataCloud stops at the city; OpenStreetMap has barangay Pineda
    const OSM_PASIG = { address: { neighbourhood: "Coronado Estate", quarter: "Pineda", city: "Pasig", region: "Metro Manila", country_code: "ph" } };
    const OSM_CEBU = { address: { suburb: "Luz", city: "Cebu City", region: "Central Visayas", country_code: "ph" } };
    expect(barangayFromOsm(OSM_PASIG)).toBe("Pineda");
    expect(barangayFromOsm(OSM_CEBU)).toBe("Luz");
    expect(barangayFromOsm({ address: { village: "Barangay Dita", country_code: "ph" } })).toBe("Dita");
    expect(barangayFromOsm({ address: { quarter: "Shibuya", country_code: "jp" } })).toBeNull();
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes("openstreetmap") ? OSM_PASIG : PASIG)));
    expect(await lookupPlace({ lat: 14.566, lng: 121.061 }, f as unknown as typeof fetch)).toBe("Pineda, Pasig, Metro Manila");
  });

  it("uses OpenStreetMap alone when BigDataCloud is down", async () => {
    const OSM = { address: { quarter: "Pineda", city: "Pasig", region: "Metro Manila", country_code: "ph" } };
    expect(formatOsmPlace(OSM)).toBe("Pineda, Pasig, Metro Manila");
    const f = vi.fn(async (url: string) => (String(url).includes("openstreetmap") ? new Response(JSON.stringify(OSM)) : new Response("", { status: 500 })));
    expect(await lookupPlace({ lat: 14.566, lng: 121.061 }, f as unknown as typeof fetch)).toBe("Pineda, Pasig, Metro Manila");
  });

  it("sends only the rounded position", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(SANTA_ROSA)));
    expect(await lookupPlace({ lat: 14.312, lng: 121.111 }, f)).toBe("Santa Rosa, Laguna");
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toMatch(/latitude=14\.312&longitude=121\.111/);
    expect(String((f.mock.calls[1] as unknown as [string])[0])).toMatch(/openstreetmap.*lat=14\.312&lon=121\.111/);
  });
});

describe("typed street or landmark is found on the map (AC38)", () => {
  it("finds the spot in the Philippines, rounds it to ~110 m and gives a short name", async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify([{ lat: "14.31449", lon: "121.10852", display_name: "Jollibee, Balibago, Santa Rosa, Laguna, Calabarzon, 4026, Philippines" }])),
    );
    const spot = await findSpot("Near Jollibee Balibago, Santa Rosa, Laguna", f as unknown as typeof fetch);
    expect(spot).toEqual({ lat: 14.314, lng: 121.109, label: "Jollibee, Balibago, Santa Rosa, Laguna" });
    const url = String((f.mock.calls[0] as unknown as [string])[0]);
    expect(url).toMatch(/nominatim\.openstreetmap\.org\/search/);
    expect(url).toMatch(/countrycodes=ph/);
    expect(url).toMatch(/q=Jollibee%20Balibago%2C%20Santa%20Rosa/);
  });

  it("returns null when nothing is found, the text is too short, or the network fails", async () => {
    expect(await findSpot("Narnia castle", vi.fn(async () => new Response("[]")) as unknown as typeof fetch)).toBeNull();
    expect(await findSpot("abc", vi.fn() as unknown as typeof fetch)).toBeNull();
    expect(await findSpot("SM Calamba", vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeNull();
  });

  it("tries shorter versions of the text: 'Nuvali, Canlubang, Calamba' -> 'Nuvali, Calamba' -> 'Nuvali, Canlubang'", () => {
    expect(spotQueries("Nuvali, Canlubang, Calamba")).toEqual(["Nuvali, Canlubang, Calamba", "Nuvali, Calamba", "Nuvali, Canlubang"]);
    expect(spotQueries("Near SM Calamba, Calamba")).toEqual(["SM Calamba, Calamba", "SM Calamba"]);
    expect(spotQueries("Pineda, Pasig, Metro Manila (GPS)")[0]).toBe("Pineda, Pasig, Metro Manila");
  });

  it("uses the backup map service (Photon) when OpenStreetMap's Nominatim fails or finds nothing (the Nuvali phone test)", async () => {
    const PHOTON_NUVALI = {
      features: [{ geometry: { coordinates: [121.0853319, 14.1807394] }, properties: { name: "Avida Settings Nuvali", district: "Canlubang", city: "Calamba", state: "Laguna", countrycode: "PH" } }],
    };
    const f = vi.fn(async (url: string) => (String(url).includes("photon") ? new Response(JSON.stringify(PHOTON_NUVALI)) : new Response("busy", { status: 429 })));
    expect(await findSpot("Nuvali, Canlubang, Calamba", f as unknown as typeof fetch, 0)).toEqual({ lat: 14.181, lng: 121.085, label: "Avida Settings Nuvali, Canlubang, Calamba, Laguna" });
    expect(String((f.mock.calls[1] as unknown as [string])[0])).toMatch(/photon\.komoot\.io\/api\/\?limit=1&bbox=116,4\.5,127,21\.5/);
  });

  it("retries with a shorter version when the full text isn't found anywhere", async () => {
    const f = vi.fn(async (url: string) => {
      const u = decodeURIComponent(String(url));
      if (u.includes("nominatim") && u.endsWith("q=Nuvali, Calamba")) return new Response(JSON.stringify([{ lat: "14.1929", lon: "121.0649", display_name: "Nuvali Wildlife and Bird Sanctuary, Calamba, Laguna, Philippines" }]));
      return new Response(u.includes("photon") ? JSON.stringify({ features: [] }) : "[]");
    });
    expect((await findSpot("Nuvali, Canlubang, Calamba", f as unknown as typeof fetch, 0))?.label).toBe("Nuvali Wildlife and Bird Sanctuary, Calamba, Laguna");
  });

  it("ignores a backup result outside the Philippines", async () => {
    const f = vi.fn(async (url: string) =>
      String(url).includes("photon") ? new Response(JSON.stringify({ features: [{ geometry: { coordinates: [139.7, 35.7] }, properties: { name: "Shinjuku", countrycode: "JP" } }] })) : new Response("[]"),
    );
    expect(await findSpot("Shinjuku station", f as unknown as typeof fetch, 0)).toBeNull();
  });

  it("asks the rider to leave out house, block/lot and unit numbers", () => {
    for (const t of ["123 Rizal St, Pasig", "#45 Mabini, Makati", "Blk 3 Lot 12, Dasmariñas", "Unit 5B, Ortigas", "No. 7 Luna St"]) expect(hasHouseNumber(t)).toBe(true);
    for (const t of ["Near Jollibee Balibago, Santa Rosa", "Rizal St corner Mabini, Pasig", "Brgy. 176, Caloocan", "Pineda, Pasig"]) expect(hasHouseNumber(t)).toBe(false);
  });
});
