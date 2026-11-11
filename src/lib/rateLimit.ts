/**
 * Best-effort in-memory sliding-window rate limiter (spec §3.4).
 * Per serverless instance only; it protects the AI budget from casual abuse.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 10, windowMs = 10 * 60 * 1000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // memory guard
  return true;
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}
