import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { HUMAN_COOKIE, createHumanToken, safeNext, verifyHumanToken, verifyTurnstile } from "@/lib/humanCheck";
import { middleware } from "@/middleware";
import { POST as humanPOST } from "@/app/api/human/route";

// Cloudflare's published test keys (always pass)
const keys = { siteKey: "1x00000000000000000000AA", secret: "1x0000000000000000000000000000000AA" };

describe('"I am human" check before the app opens (AC28)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = keys.siteKey;
    process.env.TURNSTILE_SECRET_KEY = keys.secret;
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  it("sends visitors without the cookie to /verify, keeping where they were going", async () => {
    const res = await middleware(new NextRequest("http://t/feedback?ref=CR-ABCD1234"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://t/verify?next=%2Ffeedback%3Fref%3DCR-ABCD1234");
  });

  it("blocks the booking APIs (403) without the cookie", async () => {
    for (const path of ["/api/plan", "/api/bookings", "/api/feedback"]) {
      const res = await middleware(new NextRequest(`http://t${path}`, { method: "POST" }));
      expect(res.status).toBe(403);
    }
  });

  it("lets people in with a valid cookie", async () => {
    const cookie = await createHumanToken();
    const res = await middleware(new NextRequest("http://t/", { headers: { cookie: `${HUMAN_COOKIE}=${cookie}` } }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("is switched off when the keys aren't set, so customers are never locked out", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const res = await middleware(new NextRequest("http://t/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("cookie lasts 24 hours and can't be forged", async () => {
    const now = Date.parse("2026-11-14T00:00:00Z");
    const token = await createHumanToken(now, keys);
    expect(await verifyHumanToken(token, now + 23 * 3_600_000, keys)).toBe(true);
    expect(await verifyHumanToken(token, now + 24 * 3_600_000 + 1, keys)).toBe(false);
    const [exp, sig] = token.split(".");
    expect(await verifyHumanToken(`${Number(exp) + 999999}.${sig}`, now, keys)).toBe(false);
    expect(await verifyHumanToken(token, now, { ...keys, secret: "rotated-secret" })).toBe(false);
  });

  it("confirms the token with Cloudflare on the server and sets an HttpOnly cookie", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await humanPOST(new Request("http://t/api/human", { method: "POST", headers: { "x-forwarded-for": "8.1.1.1" }, body: JSON.stringify({ token: "XXXX.DUMMY.TOKEN" }) }));
    expect(ok.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent).toMatchObject({ secret: keys.secret, response: "XXXX.DUMMY.TOKEN", remoteip: "8.1.1.1" });
    const cookie = (ok.headers.get("set-cookie") ?? "").toLowerCase();
    expect(cookie).toContain(`${HUMAN_COOKIE}=`);
    expect(cookie).toContain("httponly");
    expect(cookie).toContain("samesite=lax");
  });

  it("refuses a token Cloudflare rejects, a missing token, and a network error (403)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }))));
    const bad = await humanPOST(new Request("http://t/api/human", { method: "POST", headers: { "x-forwarded-for": "8.1.1.2" }, body: JSON.stringify({ token: "fake" }) }));
    expect(bad.status).toBe(403);
    expect((await bad.json()).error).toMatch(/didn't pass/);
    expect(bad.headers.get("set-cookie")).toBeNull();
    const none = await humanPOST(new Request("http://t/api/human", { method: "POST", headers: { "x-forwarded-for": "8.1.1.3" }, body: "{}" }));
    expect(none.status).toBe(403);
    expect(await verifyTurnstile("t", null, keys, vi.fn(async () => { throw new Error("offline"); }))).toBe(false);
  });

  it("only returns visitors to pages on this site", () => {
    expect(safeNext("/feedback?ref=CR-1")).toBe("/feedback?ref=CR-1");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext(String.raw`/\evil.example`)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
