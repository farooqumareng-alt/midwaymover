/// Best-effort client IP for rate-limit bucketing. `x-forwarded-for` is
/// client-suppliable in principle, but on Vercel (the confirmed hosting
/// target) it's set by the platform's edge proxy, not passthrough from the
/// client — trustworthy there. Falls back to a constant bucket key if
/// absent (e.g. local dev), which just means local requests share one
/// rate-limit bucket, which is fine for dev.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}
