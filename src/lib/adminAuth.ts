/**
 * Admin login for the dispatcher board (AC24). Edge-safe (used by middleware and API routes).
 *
 * - Credentials: DISPATCH_USER / DISPATCH_PASSWORD set in Vercel. Fails closed if either is missing.
 * - Session: an HttpOnly cookie holding "<expiry>.<HMAC-SHA256 signature>", valid 12 hours.
 *   The signing key is derived from the credentials, so changing the password logs everyone out.
 */
export const ADMIN_COOKIE = "cr_admin";
export const SESSION_HOURS = 12;

type Creds = { user?: string; password?: string };
const env = (): Creds => ({ user: process.env.DISPATCH_USER, password: process.env.DISPATCH_PASSWORD });

export function isAdminConfigured(c: Creds = env()): boolean {
  return Boolean(c.user && c.password);
}

/** Compares two strings in time independent of where they first differ. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function checkCredentials(user: string, password: string, c: Creds = env()): boolean {
  if (!isAdminConfigured(c)) return false;
  const okUser = safeEqual(user.trim(), c.user!);
  const okPass = safeEqual(password, c.password!);
  return okUser && okPass;
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, c: Creds): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`care-ride-admin:${c.user}:${c.password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export async function createSessionToken(now = Date.now(), c: Creds = env()): Promise<string> {
  const exp = String(now + SESSION_HOURS * 3_600_000);
  return `${exp}.${await sign(exp, c)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now(), c: Creds = env()): Promise<boolean> {
  if (!token || !isAdminConfigured(c)) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  return safeEqual(sig, await sign(exp, c));
}
