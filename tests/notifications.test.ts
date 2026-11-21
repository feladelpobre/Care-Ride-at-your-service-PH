import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
vi.mock("@/lib/mailer", () => ({
  sendMail: (m: unknown) => sendMail(m),
  isMailConfigured: () => true,
}));

import { POST as bookPOST } from "@/app/api/bookings/route";
import { GET as remindGET } from "@/app/api/reminders/route";
import { buildPlan } from "@/lib/plan";
import { bookingRequestSchema, type Booking } from "@/lib/schemas";
import { confirmationEmail, isReminderDue, maskEmail, reminderEmail } from "@/lib/notifications";
import { x } from "./fixtures";

const manila = (t: number) => {
  const d = new Date(t + 8 * 3_600_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 16) };
};
const book = (over: Record<string, unknown>, ext = x()) =>
  bookPOST(
    new Request("http://t/api/bookings", {
      method: "POST",
      body: JSON.stringify({ contactName: "Gina", contactPhone: "09290000639", contactEmail: "gina@example.com", plan: buildPlan(ext), ...over }),
    }),
  );

describe("booking confirmation email (AC22)", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
  });

  it("requires a valid email address", () => {
    const base = { contactName: "Gina", contactPhone: "09290000639", plan: buildPlan(x()) };
    expect(bookingRequestSchema.safeParse(base).success).toBe(false);
    const bad = bookingRequestSchema.safeParse({ ...base, contactEmail: "gina@" });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].message).toMatch(/valid email/);
    expect(bookingRequestSchema.safeParse({ ...base, contactEmail: " Gina@Example.com " }).data?.contactEmail).toBe("gina@example.com");
  });

  it("emails the CR- reference right after the request is saved", async () => {
    const res = await book({ contactPhone: "09290000101" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.emailSent).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe("gina@example.com");
    expect(mail.subject).toContain(json.booking.reference);
    expect(mail.text).toContain(json.booking.reference);
    expect(mail.text).toContain("911");
  });

  it("still saves the booking when the email can't be sent", async () => {
    sendMail.mockResolvedValue(false);
    const res = await book({ contactPhone: "09290000102" });
    expect(res.status).toBe(201);
    expect((await res.json()).emailSent).toBe(false);
  });

  it("escapes names in the HTML email and masks the address for the board", () => {
    const mail = confirmationEmail({ ...({} as Booking), id: "abcdef12-0000", contactName: "<b>Gina</b>", contactPhone: "09290000639", pickupArea: "Carmona", destination: "Asian Hospital", appointmentDate: "2026-11-13", appointmentTime: "10:00", pickupTime: "08:40", vehicleType: "wav_ramp_van", crewSize: 1, fareMin: 820, fareMax: 1100 });
    expect(mail.html).not.toContain("<b>Gina</b>");
    expect(mail.subject).toBe("Ride request received · CR-ABCDEF12");
    expect(maskEmail("gina.imperial@gmail.com")).toBe("gi***@gmail.com");
    expect(maskEmail(null)).toBe("no email");
  });
});

describe("2-hour pickup reminder (AC23)", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
    process.env.CRON_SECRET = "test-secret";
  });

  it("is due only when pickup is within the next 2 hours", () => {
    const now = Date.parse("2026-11-13T00:00:00Z"); // 08:00 Manila
    expect(isReminderDue({ appointmentDate: "2026-11-13", pickupTime: "09:30" }, now)).toBe(true);
    expect(isReminderDue({ appointmentDate: "2026-11-13", pickupTime: "10:00" }, now)).toBe(true);
    expect(isReminderDue({ appointmentDate: "2026-11-13", pickupTime: "10:01" }, now)).toBe(false);
    expect(isReminderDue({ appointmentDate: "2026-11-13", pickupTime: "07:59" }, now)).toBe(false);
    expect(isReminderDue({ appointmentDate: null, pickupTime: "09:00" }, now)).toBe(false);
  });

  it("refuses calls without the cron secret", async () => {
    const res = await remindGET(new Request("http://t/api/reminders"));
    expect(res.status).toBe(401);
  });

  it("sends each due reminder once", async () => {
    // Fixed clock: 08:00 Manila; appointment 10:30 so the computed pickup is within 2 h
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T00:00:00Z"));
    const appt = manila(Date.now() + 150 * 60_000);
    const res = await book(
      { contactPhone: "09290000103", contactEmail: "soon@example.com" },
      x({ appointmentDate: appt.date, appointmentTime: appt.time }),
    );
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    expect(isReminderDue({ appointmentDate: appt.date, pickupTime: booking.assessment.pickupTime })).toBe(true);
    sendMail.mockClear();

    const auth = { headers: { authorization: "Bearer test-secret" } };
    const first = await (await remindGET(new Request("http://t/api/reminders", auth))).json();
    const reminders = sendMail.mock.calls.map((c) => c[0]).filter((m) => m.to === "soon@example.com");
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].subject).toMatch(/^Pickup reminder/);

    sendMail.mockClear();
    await remindGET(new Request("http://t/api/reminders", auth));
    expect(sendMail.mock.calls.filter((c) => c[0].to === "soon@example.com")).toHaveLength(0);
    vi.useRealTimers();
  });

  it("reminder text tells the family the pickup time", () => {
    const mail = reminderEmail({ ...({} as Booking), id: "abcdef12-0000", contactName: "Gina", pickupTime: "08:40", appointmentDate: "2026-11-13", vehicleType: "sedan_assist", crewSize: 1, fareMin: 490, fareMax: 610 });
    expect(mail.text).toContain("about 2 hours, at 08:40");
  });
});

describe("the app's main mailbox is told about every new ride request (AC40)", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
    delete process.env.DISPATCH_NOTIFY_EMAIL;
    delete process.env.SMTP_USER;
  });

  it("sends the rider's confirmation and an alert to the app's mailbox (SMTP_USER, or DISPATCH_NOTIFY_EMAIL if set)", async () => {
    process.env.SMTP_USER = "careride.app@example.com";
    expect((await book({ contactPhone: "09290000701" })).status).toBe(201);
    const to = sendMail.mock.calls.map((c) => (c[0] as { to: string }).to);
    expect(to).toEqual(["gina@example.com", "careride.app@example.com"]);
    const alert = sendMail.mock.calls[1][0] as { subject: string; text: string };
    expect(alert.subject).toMatch(/^New ride request CR-[0-9A-F]{8}/);
    expect(alert.text).toMatch(/Please call to confirm/);
    expect(alert.text).toMatch(/\/dispatch/);
    // Contact details masked, as on the board
    expect(alert.text).toContain("G***");
    expect(alert.text).toContain("0929 *** 0701");
    expect(alert.text).not.toContain("09290000701");
    expect(alert.text).not.toContain("gina@example.com");

    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
    process.env.DISPATCH_NOTIFY_EMAIL = "dispatch.desk@example.com";
    await book({ contactPhone: "09290000702" });
    expect((sendMail.mock.calls[1][0] as { to: string }).to).toBe("dispatch.desk@example.com");
  });

  it("a failed alert never loses the booking, and no alert is sent when no mailbox is set", async () => {
    process.env.SMTP_USER = "careride.app@example.com";
    sendMail.mockResolvedValue(false);
    expect((await book({ contactPhone: "09290000703" })).status).toBe(201);
    delete process.env.SMTP_USER;
    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
    await book({ contactPhone: "09290000704" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
