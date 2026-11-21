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
  // Usernames ignore capital letters (phones capitalise the first letter); the password does not
  const okUser = safeEqual(user.trim().toLowerCase(), c.user!.trim().toLowerCase());
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

/*
 * Staff login by email link (AC39), for when the password is forgotten and the admin can't reset it
 * (e.g. on leave abroad). DISPATCH_STAFF_EMAILS lists the staff work emails, separated by commas.
 * A link is valid for 15 minutes; it is signed with the same key as the session, so changing the
 * password also kills every link. No database is needed.
 */
export const LINK_MINUTES = 15;

/** Same answer whether or not the email is on the staff list, so nobody can probe for staff emails. */
export const LINK_SENT_MESSAGE =
  "If this email is on the Care Ride staff list, we've sent a login link. It works for 15 minutes. Check your inbox and spam folder.";

export function staffEmails(list: string | undefined = process.env.DISPATCH_STAFF_EMAILS): string[] {
  return (list ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[\x21-\x7e]+$/.test(e) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)); // plain ASCII emails only
}

export function isStaffEmail(email: string, list?: string): boolean {
  const e = email.trim().toLowerCase();
  return staffEmails(list).some((s) => safeEqual(s, e));
}

const toB64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => {
  try {
    return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return null;
  }
};

export async function createLoginLinkToken(email: string, now = Date.now(), c: Creds = env()): Promise<string> {
  const e = email.trim().toLowerCase();
  const exp = String(now + LINK_MINUTES * 60_000);
  return `${exp}.${toB64url(e)}.${await sign(`link:${exp}:${e}`, c)}`;
}

/** The staff email the link was sent to, or null if the link is fake, expired, or the email was removed from the list. */
export async function verifyLoginLinkToken(token: string | undefined, now = Date.now(), c: Creds = env(), list?: string): Promise<string | null> {
  if (!token || !isAdminConfigured(c)) return null;
  const [exp, mail, sig] = token.split(".");
  if (!exp || !mail || !sig || !/^\d+$/.test(exp) || Number(exp) <= now) return null;
  const email = fromB64url(mail);
  if (!email || !safeEqual(sig, await sign(`link:${exp}:${email}`, c))) return null;
  return isStaffEmail(email, list) ? email : null;
}
