import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, checkCredentials, createSessionToken, verifySessionToken } from "@/lib/adminAuth";
import { middleware } from "@/middleware";
import { POST as loginPOST } from "@/app/api/admin/login/route";
import { POST as logoutPOST } from "@/app/api/admin/logout/route";

const creds = { user: "peng-admin", password: "s3cret-pass-123" };
const login = (body: unknown, ip: string) =>
  loginPOST(new Request("http://t/api/admin/login", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

describe("dispatcher board is admin-only (AC24)", () => {
  beforeEach(() => {
    process.env.DISPATCH_USER = creds.user;
    process.env.DISPATCH_PASSWORD = creds.password;
  });

  it("checks the username and password, and fails closed when not set up", () => {
    expect(checkCredentials("peng-admin", "s3cret-pass-123", creds)).toBe(true);
    expect(checkCredentials(" peng-admin ", "s3cret-pass-123", creds)).toBe(true);
    expect(checkCredentials("peng-admin", "wrong", creds)).toBe(false);
    expect(checkCredentials("someone", "s3cret-pass-123", creds)).toBe(false);
    expect(checkCredentials("peng-admin", "", { user: "peng-admin", password: "" })).toBe(false);
  });

  it("session tokens expire after 12 hours, can't be forged, and die when the password changes", async () => {
    const now = Date.parse("2026-11-13T00:00:00Z");
    const token = await createSessionToken(now, creds);
    expect(await verifySessionToken(token, now + 60_000, creds)).toBe(true);
    expect(await verifySessionToken(token, now + 12 * 3_600_000 + 1, creds)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(exp) + 999999}.${sig}`, now, creds)).toBe(false);
    expect(await verifySessionToken("garbage", now, creds)).toBe(false);
    expect(await verifySessionToken(token, now, { ...creds, password: "new-password-456" })).toBe(false);
  });

  it("login page flow: wrong password 401, right password sets an HttpOnly cookie", async () => {
    const bad = await login({ username: "peng-admin", password: "nope" }, "7.7.7.1");
    expect(bad.status).toBe(401);
    expect((await bad.json()).error).toBe("Wrong username or password.");

    const ok = await login({ username: "peng-admin", password: "s3cret-pass-123" }, "7.7.7.2");
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${ADMIN_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
  });

  it("blocks guessing after 5 tries (429) and refuses when not set up (503)", async () => {
    for (let i = 0; i < 5; i++) await login({ username: "x", password: "y" }, "7.7.7.3");
    expect((await login({ username: "peng-admin", password: "s3cret-pass-123" }, "7.7.7.3")).status).toBe(429);
    delete process.env.DISPATCH_PASSWORD;
    expect((await login({ username: "peng-admin", password: "s3cret-pass-123" }, "7.7.7.4")).status).toBe(503);
  });

  it("middleware sends visitors to the login page and lets a logged-in admin in", async () => {
    const out = await middleware(new NextRequest("http://t/dispatch"));
    expect(out.status).toBe(307);
    expect(out.headers.get("location")).toBe("http://t/admin/login");

    const token = await createSessionToken();
    const inside = await middleware(new NextRequest("http://t/dispatch", { headers: { cookie: `${ADMIN_COOKIE}=${token}` } }));
    expect(inside.status).toBe(200);
    expect(inside.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("logout clears the cookie and returns to the login page", async () => {
    const res = await logoutPOST(new Request("http://t/api/admin/logout", { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://t/admin/login?out=1");
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`${ADMIN_COOKIE}=;`));
  });
});
