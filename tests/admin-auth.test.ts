import { describe, expect, it } from "vitest";
import { checkAdmin } from "@/lib/adminAuth";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

const basic = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`;

describe("dispatcher board is admin-only (AC24)", () => {
  it("accepts only the configured username and password", () => {
    expect(checkAdmin(basic("admin", "s3cret-pass"), "admin", "s3cret-pass")).toBe("ok");
    expect(checkAdmin(basic("admin", "wrong"), "admin", "s3cret-pass")).toBe("missing-credentials");
    expect(checkAdmin(basic("someone", "s3cret-pass"), "admin", "s3cret-pass")).toBe("missing-credentials");
    expect(checkAdmin(null, "admin", "s3cret-pass")).toBe("missing-credentials");
    expect(checkAdmin("Basic !!!not-base64", "admin", "s3cret-pass")).toBe("missing-credentials");
    expect(checkAdmin(basic("admin", "pass:with:colons"), "admin", "pass:with:colons")).toBe("ok");
  });

  it("fails closed when the login is not set up", () => {
    expect(checkAdmin(basic("admin", "x"), undefined, undefined)).toBe("not-configured");
    expect(checkAdmin(basic("admin", ""), "admin", "")).toBe("not-configured");
  });

  it("middleware asks for a login (401), lets the admin in, and hides the page from search engines", () => {
    process.env.DISPATCH_USER = "admin";
    process.env.DISPATCH_PASSWORD = "s3cret-pass";
    const denied = middleware(new NextRequest("http://t/dispatch"));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("WWW-Authenticate")).toMatch(/^Basic/);

    const allowed = middleware(new NextRequest("http://t/dispatch", { headers: { authorization: basic("admin", "s3cret-pass") } }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("X-Robots-Tag")).toContain("noindex");

    delete process.env.DISPATCH_PASSWORD;
    expect(middleware(new NextRequest("http://t/dispatch")).status).toBe(503);
  });
});
