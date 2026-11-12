/**
 * Admin login for the dispatcher board (AC24). Edge-safe (used by middleware).
 * HTTP Basic auth against DISPATCH_USER / DISPATCH_PASSWORD set in Vercel.
 * Fails closed: if either variable is missing, nobody gets in.
 */
export type AdminCheck = "ok" | "missing-credentials" | "not-configured";

/** Compares two strings in time independent of where they first differ. */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function checkAdmin(authorization: string | null, user?: string, password?: string): AdminCheck {
  if (!user || !password) return "not-configured";
  if (!authorization?.startsWith("Basic ")) return "missing-credentials";
  let decoded: string;
  try {
    decoded = atob(authorization.slice(6).trim());
  } catch {
    return "missing-credentials";
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return "missing-credentials";
  const okUser = safeEqual(decoded.slice(0, sep), user);
  const okPass = safeEqual(decoded.slice(sep + 1), password);
  return okUser && okPass ? "ok" : "missing-credentials";
}
