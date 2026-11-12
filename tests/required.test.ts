import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { buildPlan } from "@/lib/plan";
import { missingDetailsMessage, missingRequiredDetails } from "@/lib/required";
import { x } from "./fixtures";

const call = (body: unknown) => POST(new Request("http://test/api/bookings", { method: "POST", body: JSON.stringify(body) }));

describe("required ride details (AC20)", () => {
  it("a complete trip has nothing missing", () => {
    expect(missingRequiredDetails(x())).toEqual([]);
  });

  it("flags unknown mobility and blank pickup, hospital, date and time in form order", () => {
    const missing = missingRequiredDetails(
      x({ mobility: "unknown", pickupArea: "  ", destination: null, appointmentDate: null, appointmentTime: null }),
    );
    expect(missing).toEqual(["pickupArea", "destination", "appointmentDate", "appointmentTime", "mobility"]);
    expect(missingDetailsMessage(["mobility"])).toBe(
      "Please add the missing details before requesting the ride: How the patient moves.",
    );
  });

  it("the server refuses a request with unknown mobility and names what is missing (400)", async () => {
    const res = await call({ contactName: "Jean", contactEmail: "family@example.com", contactPhone: "09170002020", plan: buildPlan(x({ mobility: "unknown" }), { distanceKm: 10 }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.missing).toEqual(["mobility"]);
    expect(body.error).toMatch(/How the patient moves/);
  });

  it("the server refuses a request with no appointment time (400)", async () => {
    const res = await call({ contactName: "Gina", contactEmail: "family@example.com", contactPhone: "09170002021", plan: buildPlan(x({ appointmentTime: null }), { distanceKm: 10 }) });
    expect(res.status).toBe(400);
    expect((await res.json()).missing).toEqual(["appointmentTime"]);
  });

  it("a complete request still goes through (201)", async () => {
    const res = await call({ contactName: "Jessan", contactEmail: "family@example.com", contactPhone: "09170002022", plan: buildPlan(x(), { distanceKm: 10 }) });
    expect(res.status).toBe(201);
  });
});
