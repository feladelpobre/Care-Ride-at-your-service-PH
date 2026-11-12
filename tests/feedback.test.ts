import { describe, expect, it } from "vitest";
import { POST as bookPOST } from "@/app/api/bookings/route";
import { POST as fbPOST } from "@/app/api/feedback/route";
import { buildPlan } from "@/lib/plan";
import { averageRating, feedbackPriority, feedbackRequestSchema, feedbackTicket, referenceToIdRange } from "@/lib/feedback";
import { listFeedback } from "@/lib/storage";
import { x } from "./fixtures";

const book = async (phone: string) => {
  const res = await bookPOST(new Request("http://t", { method: "POST", body: JSON.stringify({ contactName: "Liza", contactPhone: phone, plan: buildPlan(x(), { distanceKm: 5 }) }) }));
  return (await res.json()).booking as { reference: string };
};
let ip = 0;
const send = (body: unknown) =>
  fbPOST(new Request("http://t/api/feedback", { method: "POST", headers: { "x-forwarded-for": `10.0.0.${++ip}` }, body: JSON.stringify(body) }));

describe("feedback system (AC19)", () => {
  it("accepts feedback for a real booking and returns an FB- ticket", async () => {
    const { reference } = await book("09191110001");
    const res = await send({
      reference: reference.toLowerCase(),
      contactPhone: "0919 111 0001",
      ratingOverall: 5,
      ratingDriver: 5,
      onTime: "yes",
      driverName: "Mang Jun",
      details: "Very kind and careful on the stairs.",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ticket).toMatch(/^FB-[0-9A-F]{8}$/);
    expect(json.priority).toBe("normal");
    const saved = (await listFeedback())[0];
    expect(saved).toMatchObject({ ratingOverall: 5, driverName: "Mang Jun", onTime: true, status: "open" });
  });

  it("refuses feedback when the reference and mobile number don't match (anti-fraud)", async () => {
    const { reference } = await book("09191110002");
    const res = await send({ reference, contactPhone: "09990000000", ratingOverall: 1 });
    expect(res.status).toBe(404);
  });

  it("marks safety reports urgent, and low ratings or callback requests high", async () => {
    const { reference } = await book("09191110003");
    const res = await send({ reference, contactPhone: "09191110003", ratingOverall: 2, issueTypes: ["safety", "late"], incidentAt: new Date().toISOString() });
    expect((await res.json()).priority).toBe("urgent");
    expect(feedbackPriority({ issueTypes: [], ratingOverall: 2, wantsCallback: false })).toBe("high");
    expect(feedbackPriority({ issueTypes: [], ratingOverall: 4, wantsCallback: true })).toBe("high");
    expect(feedbackPriority({ issueTypes: ["billing"], ratingOverall: 4, wantsCallback: false })).toBe("normal");
  });

  it("rejects an incident time in the future or before the ride was booked (AC19)", async () => {
    const { reference } = await book("09191110005");
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const r1 = await send({ reference, contactPhone: "09191110005", ratingOverall: 3, incidentAt: future });
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toMatch(/can't be in the future/);
    const before = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const r2 = await send({ reference, contactPhone: "09191110005", ratingOverall: 3, incidentAt: before });
    expect(r2.status).toBe(400);
    expect((await r2.json()).error).toMatch(/before this ride was booked/);
    expect((await send({ reference, contactPhone: "09191110005", ratingOverall: 3, incidentAt: new Date().toISOString() })).status).toBe(201);
  });

  it("allows at most 3 feedback forms per booking", async () => {
    const { reference } = await book("09191110004");
    for (let i = 0; i < 3; i++) expect((await send({ reference, contactPhone: "09191110004", ratingOverall: 4 })).status).toBe(201);
    expect((await send({ reference, contactPhone: "09191110004", ratingOverall: 4 })).status).toBe(429);
  });

  it("validates the form", () => {
    expect(feedbackRequestSchema.safeParse({ reference: "CR-123", contactPhone: "09171234567", ratingOverall: 3 }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ reference: "CR-4ED3B086", contactPhone: "09171234567", ratingOverall: 0 }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ reference: "CR-4ED3B086", contactPhone: "09171234567", ratingOverall: 3, details: "a".repeat(1001) }).success).toBe(false);
    expect(feedbackRequestSchema.safeParse({ reference: "CR-4ED3B086", contactPhone: "09171234567", ratingOverall: 3, issueTypes: ["hacking"] }).success).toBe(false);
  });

  it("treats the incident time as Philippine time (7:40 AM stays 7:40 AM)", async () => {
    const { manilaLocalToIso } = await import("@/lib/feedback");
    const { formatManilaDateTime } = await import("@/lib/format");
    expect(manilaLocalToIso("2026-11-12T07:40")).toBe("2026-11-12T07:40:00+08:00");
    expect(manilaLocalToIso("2026-11-12T07:40:00Z")).toBe("2026-11-12T07:40:00Z");
    expect(formatManilaDateTime(new Date(manilaLocalToIso("2026-11-12T07:40")).toISOString())).toBe("Nov 12, 2026, 7:40 AM");
  });

  it("helpers: ticket, reference range and average", () => {
    expect(feedbackTicket("ab12cd34-0000-0000-0000-000000000000")).toBe("FB-AB12CD34");
    expect(referenceToIdRange("CR-4ED3B086")).toEqual({ from: "4ed3b086-0000-0000-0000-000000000000", to: "4ed3b086-ffff-ffff-ffff-ffffffffffff" });
    expect(averageRating([{ ratingOverall: 5 }, { ratingOverall: 4 }, { ratingOverall: 4 }])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});
