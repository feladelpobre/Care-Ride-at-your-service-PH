import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/mailer", () => ({
  sendMail: async (m: { to: string; subject: string; text: string }) => {
    sent.push(m);
    return true;
  },
  isMailConfigured: () => true,
}));

import { ADMIN_COOKIE, createLoginLinkToken, isStaffEmail, LINK_SENT_MESSAGE, staffEmails, verifyLoginLinkToken } from "@/lib/adminAuth";
import { POST as requestLink } from "@/app/api/admin/login-link/route";
import { POST as openLink } from "@/app/api/admin/login-link/open/route";

const creds = { user: "peng-admin", password: "s3cret-pass-123" };
const LIST = "dispatcher.one@example.com, Dispatcher.Two@Example.com, dispatcher.three@example.com";
let ip = 0;
const ask = (email: unknown, fixedIp?: string) =>
  requestLink(
    new Request("http://t/api/admin/login-link", {
      method: "POST",
      headers: { "x-forwarded-for": fixedIp ?? `10.30.0.${++ip}` },
      body: JSON.stringify({ email }),
    }),
  );
const open = (token: string, origin?: string) => {
  const form = new FormData();
  form.set("token", token);
  return openLink(new Request("http://t/api/admin/login-link/open", { method: "POST", headers: origin ? { origin } : {}, body: form }));
};

describe("staff can log in with an email link when the password is forgotten (AC39)", () => {
  beforeEach(() => {
    process.env.DISPATCH_USER = creds.user;
    process.env.DISPATCH_PASSWORD = creds.password;
    process.env.DISPATCH_STAFF_EMAILS = LIST;
    sent.length = 0;
  });

  it("reads the staff list from DISPATCH_STAFF_EMAILS, ignoring case, spaces and bad entries", () => {
    expect(staffEmails("a@x.ph, B@Y.com;  not-an-email ,c@z.org")).toEqual(["a@x.ph", "b@y.com", "c@z.org"]);
    expect(isStaffEmail(" DISPATCHER.ONE@example.com ", LIST)).toBe(true);
    expect(isStaffEmail("stranger@example.com", LIST)).toBe(false);
    expect(staffEmails("")).toEqual([]);
  });

  it("links last 15 minutes, can't be forged, and die when the password changes or the email is removed", async () => {
    const now = Date.parse("2026-11-21T00:00:00Z");
    const token = await createLoginLinkToken("dispatcher.one@example.com", now, creds);
    expect(await verifyLoginLinkToken(token, now + 14 * 60_000, creds, LIST)).toBe("dispatcher.one@example.com");
    expect(await verifyLoginLinkToken(token, now + 15 * 60_000 + 1, creds, LIST)).toBeNull();
    const [exp, mail, sig] = token.split(".");
    expect(await verifyLoginLinkToken(`${Number(exp) + 9e6}.${mail}.${sig}`, now, creds, LIST)).toBeNull();
    expect(await verifyLoginLinkToken(`${exp}.${btoa("dispatcher.two@example.com")}.${sig}`, now, creds, LIST)).toBeNull();
    expect(await verifyLoginLinkToken(token, now, { ...creds, password: "new-password-456" }, LIST)).toBeNull();
    expect(await verifyLoginLinkToken(token, now, creds, "dispatcher.two@example.com")).toBeNull();
    expect(await verifyLoginLinkToken("garbage", now, creds, LIST)).toBeNull();
  });

  it("emails a link only to staff, but gives everyone the same answer (no probing for staff emails)", async () => {
    const staff = await ask("Dispatcher.One@example.com");
    const stranger = await ask("stranger@example.com");
    expect(staff.status).toBe(200);
    expect(stranger.status).toBe(200);
    expect((await staff.json()).message).toBe(LINK_SENT_MESSAGE);
    expect((await stranger.json()).message).toBe(LINK_SENT_MESSAGE);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("dispatcher.one@example.com");
    expect(sent[0].text).toMatch(/https:\/\/care-ride-at-your-service-ph\.vercel\.app\/admin\/link\?token=/);
    expect(sent[0].text).toMatch(/15 minutes/);
  });

  it("logs only yes/no flags for troubleshooting, never the email address", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await ask("dispatcher.one@example.com");
    await ask("stranger@example.com");
    const lines = log.mock.calls.map((c) => c.join(" "));
    expect(lines[0]).toBe("login-link: request onList=yes limited=no sent=yes");
    expect(lines[1]).toBe("login-link: request onList=no limited=no sent=no");
    expect(lines.join(" ")).not.toMatch(/@/);
    log.mockRestore();
  });

  it("the link always points to the real site, even if a request fakes its Host", async () => {
    await requestLink(
      new Request("http://evil.example/api/admin/login-link", {
        method: "POST",
        headers: { host: "evil.example", "x-forwarded-for": "10.31.0.1" },
        body: JSON.stringify({ email: "dispatcher.two@example.com" }),
      }),
    );
    expect(sent[0].text).not.toMatch(/evil/);
  });

  it("refuses a bad email, and limits requests per device (5) and links per email (3) every 15 minutes", async () => {
    expect((await ask("not-an-email")).status).toBe(400);
    for (let i = 0; i < 5; i++) expect((await ask("stranger@example.com", "10.32.0.1")).status).toBe(200);
    expect((await ask("stranger@example.com", "10.32.0.1")).status).toBe(429);
    sent.length = 0;
    for (let i = 0; i < 5; i++) await ask("dispatcher.three@example.com");
    expect(sent).toHaveLength(3);
  });

  it("opening a valid link logs the staff member in and goes to the board; a bad link goes back to login", async () => {
    const good = await open(await createLoginLinkToken("dispatcher.one@example.com"), "http://t");
    expect(good.status).toBe(303);
    expect(good.headers.get("location")).toBe("http://t/dispatch");
    const cookie = good.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${ADMIN_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    const bad = await open("forged.token.value");
    expect(bad.headers.get("location")).toBe("http://t/admin/login?link=expired");
    expect(bad.headers.get("set-cookie") ?? "").not.toContain(`${ADMIN_COOKIE}=`);
    expect((await open(await createLoginLinkToken("dispatcher.one@example.com"), "https://evil.example")).status).toBe(403);
  });

  it("does nothing when the dispatcher login isn't set up", async () => {
    delete process.env.DISPATCH_PASSWORD;
    expect((await ask("dispatcher.one@example.com")).status).toBe(503);
    expect(sent).toHaveLength(0);
  });
});
