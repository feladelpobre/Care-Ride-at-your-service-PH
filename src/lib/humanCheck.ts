/**
 * "I am human" check at the booking step (AC28). Edge-safe (used by middleware and API routes).
 *
 * Same pattern as common apps (Cloudflare Turnstile, Google reCAPTCHA, hCaptcha): the visitor ticks a
 * checkbox widget, the widget gives a one-time token, and OUR SERVER confirms that token with the
 * provider. Only then do we set an HttpOnly cookie "<expiry>.<HMAC-SHA256 signature>", valid 24 hours,
 * so people aren't asked again on every page.
 *
 * We use Cloudflare Turnstile: free, no picture puzzles, no advertising cookies.
 * - NEXT_PUBLIC_TURNSTILE_SITE_KEY: public site key shown in the page (not a secret).
 * - TURNSTILE_SECRET_KEY: secret, server only. Also used to sign the cookie, so rotating it asks everyone again.
 * Without both keys the check is switched off (the app opens normally) so a missing setup never locks customers out.
 */
export const HUMAN_COOKIE = "cr_human";
export const HUMAN_HOURS = 24;
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Keys = { siteKey?: string; secret?: string };
const env = (): Keys => ({ siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, secret: process.env.TURNSTILE_SECRET_KEY });

export function isHumanCheckEnabled(k: Keys = env()): boolean {
  return Boolean(k.siteKey && k.secret);
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(`care-ride-human:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Constant-time string compare. */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function createHumanToken(now = Date.now(), k: Keys = env()): Promise<string> {
  const exp = String(now + HUMAN_HOURS * 3_600_000);
  return `${exp}.${await sign(exp, k.secret ?? "")}`;
}

export async function verifyHumanToken(token: string | undefined, now = Date.now(), k: Keys = env()): Promise<boolean> {
  if (!token || !k.secret) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  return safeEqual(sig, await sign(exp, k.secret));
}

/** Asks Cloudflare whether the widget token is genuine (tokens last 5 minutes and work once). */
export async function verifyTurnstile(
  token: string,
  remoteIp: string | null,
  k: Keys = env(),
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!k.secret || !token) return false;
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: k.secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: unknown; "error-codes"?: unknown };
    if (data?.success === true) return true;
    // Log only Cloudflare's error codes (never the token or secret)
    console.error("human-check: rejected", JSON.stringify(data?.["error-codes"] ?? []).slice(0, 200));
    return false;
  } catch (err) {
    console.error("human-check: verify failed", err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 200) : "unknown");
    return false;
  }
}
