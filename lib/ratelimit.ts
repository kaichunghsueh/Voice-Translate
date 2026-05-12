/**
 * Simple in-memory IP rate limiter.
 * Production NOTE: replace with Azure Cache for Redis when running >1 replica.
 * Container App is currently min=1/max=5 → not safe across scale-out.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, resetAt };
  }
  if (b.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { allowed: true, remaining: MAX_PER_WINDOW - b.count, resetAt: b.resetAt };
}

// Periodic GC so the map doesn't grow unbounded.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, WINDOW_MS).unref?.();
}
