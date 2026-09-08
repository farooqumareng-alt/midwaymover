// DB-backed rate limiting (docs/PHASE-0-SPECIFICATION.md § Rate Limiting —
// login, password reset, OTP verification, and other brute-forceable
// endpoints). Deliberately not in-memory: Vercel's serverless model gives
// no guarantee two requests share a process, so an in-memory counter would
// silently do nothing under real traffic.
//
// Fixed-window counter. Simpler than sliding-window/token-bucket and
// correct under concurrency (the upsert's increment is one atomic
// Postgres statement, serialized by the bucketKey+windowStart unique
// constraint — two simultaneous requests both get counted, neither is
// lost). Its known limitation is a burst allowance at the window boundary;
// acceptable for MVP, revisit in Phase 12 if it proves too permissive.
import { db } from "@midwaymover/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /// Seconds until the current window resets.
  resetsInSeconds: number;
}

export interface RateLimitOptions {
  /// Max allowed attempts within the window.
  limit: number;
  windowSeconds: number;
}

/// `bucketKey` should be action-scoped, e.g. `login:${email}` or
/// `login-ip:${ip}` — callers typically check BOTH a per-account and a
/// per-IP bucket so neither a distributed attack on one account nor a
/// single source hammering many accounts slips through.
export async function checkRateLimit(
  bucketKey: string,
  { limit, windowSeconds }: RateLimitOptions,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
  const windowStart = new Date(windowStartMs);

  const bucket = await db.rateLimitBucket.upsert({
    where: { bucketKey_windowStart: { bucketKey, windowStart } },
    create: { bucketKey, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  const resetsInSeconds = Math.ceil(
    (windowStartMs + windowSeconds * 1000 - now) / 1000,
  );

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetsInSeconds,
  };
}
