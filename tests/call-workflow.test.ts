import { beforeEach, describe, expect, it } from "vitest";
import { POST as bookPOST } from "@/app/api/bookings/route";
import { POST as fbPOST } from "@/app/api/feedback/route";
import { POST as statusPOST } from "@/app/api/admin/status/route";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/adminAuth";
import { callSummary, feedbackCallDue, isOverdue, statusUpdateSchema, telHref } from "@/lib/callQueue";
import { buildPlan } from "@/lib/plan";
import { listBookings, listFeedback } from "@/lib/storage";
import { x } from "./fixtures";

const creds = { user: "peng-admin", password: "s3cret-pass-123" };
const book = async (phone: string) => {
  const res = await bookPOST(
    new Request("http://t", {
      method: "POST",
      body: JSON.stringify({
        contactName: "Liza",
        contactEmail: "family@example.com",
        contactPhone: phone,
        plan: buildPlan(x()),
      }),
    }),
  );
  return (await res.json()).booking as { reference: string };
};
const setStatus = (body: unknown, cookie?: string, origin?: string) =>
  statusPOST(
    new Request("http://t/api/admin/status", {
      method: "POST",
      headers: {
        ...(cookie ? { cookie: `${ADMIN_COOKIE}=${cookie}` } : {}),
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe("dispatcher call workflow (AC35)", () => {
  beforeEach(() => {
    process.env.DISPATCH_USER = creds.user;
    process.env.DISPATCH_PASSWORD = creds.password;
  });

  it("callbacks are due 2 hours after urgent feedback and 24 hours after high; normal or called-back ones need no call", () => {
    const at = "2026-11-20T00:00:00.000Z";
    const t = Date.parse(at);
    expect(feedbackCallDue({ priority: "urgent", status: "open", createdAt: at })).toBe(t + 2 * 3_600_000);
    expect(feedbackCallDue({ priority: "high", status: "open", createdAt: at })).toBe(t + 24 * 3_600_000);
    expect(feedbackCallDue({ priority: "normal", status: "open", createdAt: at })).toBeNull();
    expect(
      feedbackCallDue({
        priority: "urgent",
        status: "in_progress",
        createdAt: at,
      }),
    ).toBeNull();
    expect(isOverdue(t + 2 * 3_600_000, t + 3 * 3_600_000)).toBe(true);
    expect(isOverdue(t + 24 * 3_600_000, t + 3 * 3_600_000)).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });

  it("the 'To call now' bar counts pending requests, promised callbacks and overdue ones", () => {
    const now = Date.parse("2026-11-20T05:00:00.000Z");
    const s = callSummary(
      [{ status: "pending" }, { status: "pending" }, { status: "confirmed" }, { status: "cancelled" }],
      [
        {
          priority: "urgent",
          status: "open",
          createdAt: "2026-11-20T01:00:00.000Z",
        }, // due 03:00, overdue
        {
          priority: "high",
          status: "open",
          createdAt: "2026-11-20T01:00:00.000Z",
        }, // due tomorrow
        {
          priority: "normal",
          status: "open",
          createdAt: "2026-11-20T01:00:00.000Z",
        }, // no call owed
        {
          priority: "urgent",
          status: "resolved",
          createdAt: "2026-11-19T01:00:00.000Z",
        }, // done
      ],
      now,
    );
    expect(s).toEqual({ bookingsToCall: 2, callbacksDue: 2, overdue: 1 });
  });

  it("makes a one-tap call link from a PH mobile number, and none for missing or odd numbers", () => {
    expect(telHref("09171234567")).toBe("tel:+639171234567");
    expect(telHref("+63 917 123 4567")).toBe("tel:+639171234567");
    expect(telHref(null)).toBeNull();
    expect(telHref("12345")).toBeNull();
  });

  it("only accepts status values the database allows", () => {
    const id = "4ed3b086-0000-4000-8000-000000000000";
    expect(statusUpdateSchema.safeParse({ kind: "booking", id, status: "confirmed" }).success).toBe(true);
    expect(
      statusUpdateSchema.safeParse({
        kind: "feedback",
        id,
        status: "in_progress",
      }).success,
    ).toBe(true);
    expect(
      statusUpdateSchema.safeParse({
        kind: "booking",
        id,
        status: "in_progress",
      }).success,
    ).toBe(false);
    expect(
      statusUpdateSchema.safeParse({
        kind: "feedback",
        id,
        status: "confirmed",
      }).success,
    ).toBe(false);
    expect(
      statusUpdateSchema.safeParse({
        kind: "booking",
        id: "not-a-uuid",
        status: "confirmed",
      }).success,
    ).toBe(false);
  });

  it("refuses status changes without a dispatcher login, or from another site", async () => {
    await book("09181110001");
    const b = (await listBookings())[0];
    const body = { kind: "booking", id: b.id, status: "confirmed" };
    expect((await setStatus(body)).status).toBe(401);
    expect((await setStatus(body, "forged.token")).status).toBe(401);
    const token = await createSessionToken();
    expect((await setStatus(body, token, "https://evil.example")).status).toBe(403);
    expect((await listBookings()).find((x) => x.id === b.id)?.status).toBe("pending");
  });

  it("a logged-in dispatcher marks a booking 'Called & confirmed' and a feedback ticket 'Called back', then 'Resolved'", async () => {
    const { reference } = await book("09181110002");
    const b = (await listBookings()).find((x) => x.contactPhone === "09181110002")!;
    const token = await createSessionToken();

    const r1 = await setStatus({ kind: "booking", id: b.id, status: "confirmed" }, token, "http://t");
    expect(r1.status).toBe(200);
    expect((await listBookings()).find((x) => x.id === b.id)?.status).toBe("confirmed");

    const fb = await fbPOST(
      new Request("http://t/api/feedback", {
        method: "POST",
        headers: { "x-forwarded-for": "10.9.9.1" },
        body: JSON.stringify({
          reference,
          contactPhone: "09181110002",
          ratingOverall: 1,
          issueTypes: ["safety"],
        }),
      }),
    );
    expect(fb.status).toBe(201);
    const f = (await listFeedback())[0];
    expect(f.priority).toBe("urgent");
    expect(feedbackCallDue(f)).not.toBeNull();

    expect((await setStatus({ kind: "feedback", id: f.id, status: "in_progress" }, token)).status).toBe(200);
    const called = (await listFeedback()).find((x) => x.id === f.id)!;
    expect(called.status).toBe("in_progress");
    expect(feedbackCallDue(called)).toBeNull();
    expect((await setStatus({ kind: "feedback", id: f.id, status: "resolved" }, token)).status).toBe(200);
  });

  it("answers 'not found' for an unknown id and 'invalid' for a bad status", async () => {
    const token = await createSessionToken();
    expect(
      (
        await setStatus(
          {
            kind: "booking",
            id: "00000000-0000-4000-8000-000000000000",
            status: "confirmed",
          },
          token,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await setStatus(
          {
            kind: "booking",
            id: "00000000-0000-4000-8000-000000000000",
            status: "lost",
          },
          token,
        )
      ).status,
    ).toBe(400);
  });
});
