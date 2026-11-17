import { describe, expect, it, vi } from "vitest";
import { formatPlace, lookupPlace } from "@/lib/placeName";

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
  it("sends only the rounded position", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(SANTA_ROSA)));
    expect(await lookupPlace({ lat: 14.312, lng: 121.111 }, f)).toBe("Santa Rosa, Laguna");
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toMatch(/latitude=14\.312&longitude=121\.111/);
  });
});
