import { describe, expect, it } from "vitest";
import { bookingRequestSchema, planRequestSchema, sanitizeText } from "@/lib/schemas";

describe("plan request validation (AC1)", () => {
  it("rejects descriptions under 20 characters", () => {
    const r = planRequestSchema.safeParse({ description: "wheelchair pls" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/at least 20/);
  });
  it("rejects descriptions over 1,500 characters", () => {
    expect(planRequestSchema.safeParse({ description: "a".repeat(1501) }).success).toBe(false);
  });
  it("accepts a normal description; distance and companion hours are optional", () => {
    const r = planRequestSchema.parse({ description: "Wheelchair user to PGH tomorrow at 8am" });
    expect(r.distanceKm).toBeUndefined();
    expect(r.companionHours).toBeUndefined();
  });
  it("rejects distanceKm over 150 and companion hours over 12", () => {
    expect(planRequestSchema.safeParse({ description: "Wheelchair user to PGH tomorrow at 8am", distanceKm: 500 }).success).toBe(false);
    expect(planRequestSchema.safeParse({ description: "Wheelchair user to PGH tomorrow at 8am", companionHours: 20 }).success).toBe(false);
  });
  it("strips control characters", () => {
    expect(sanitizeText("  hi\u0000 there\u0007 ")).toBe("hi there");
  });
});

describe("booking request validation", () => {
  it("rejects invalid PH mobile numbers", () => {
    const r = bookingRequestSchema.shape.contactPhone.safeParse("12345");
    expect(r.success).toBe(false);
  });
  it("accepts 09xx and +639xx formats, and empty", () => {
    expect(bookingRequestSchema.shape.contactPhone.parse("0917 123 4567")).toBe("09171234567");
    expect(bookingRequestSchema.shape.contactPhone.parse("+639171234567")).toBe("+639171234567");
    expect(bookingRequestSchema.shape.contactPhone.parse("")).toBeUndefined();
  });
});
