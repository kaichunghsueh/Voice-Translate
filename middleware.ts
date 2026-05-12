import { NextRequest, NextResponse } from 'next/server';

// Lightweight in-memory protection for /api/tts and /api/ab/vote.
// Production-grade abuse protection should use a real KV/Redis backend,
// but this stops opportunistic bots and accidental fork-and-spam.

const APP_TOKEN = process.env.APP_ACCESS_TOKEN || '';

// Per-IP token bucket. Resets when the process restarts (acceptable; ACA scales to few replicas).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 20; // 20 req / IP / minute on protected endpoints
const HARD_DAILY_CAP = 500; // belt-and-suspenders per IP per ~rolling day
const dayBuckets = new Map<string, Bucket>();
const DAY_MS = 24 * 60 * 60_000;

function take(map: Map<string, Bucket>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = map.get(key);
  if (!b || b.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api/tts') && !pathname.startsWith('/api/ab/vote')) {
    return NextResponse.next();
  }

  // 1) App token gate (if configured). Same-origin browsers add it via fetch wrapper;
  //    bots scanning the public URL won't have it.
  if (APP_TOKEN) {
    const got = req.headers.get('x-app-token');
    if (got !== APP_TOKEN) {
      return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  // 2) Per-IP rate limit
  const ip = clientIp(req);
  if (!take(buckets, ip, MAX_PER_WINDOW, WINDOW_MS)) {
    return new NextResponse(JSON.stringify({ error: 'rate_limited', retryAfterSec: 60 }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '60' }
    });
  }
  if (!take(dayBuckets, ip, HARD_DAILY_CAP, DAY_MS)) {
    return new NextResponse(JSON.stringify({ error: 'daily_cap_exceeded' }), {
      status: 429,
      headers: { 'content-type': 'application/json' }
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/tts/:path*', '/api/ab/vote/:path*']
};
