// CSRF guard for the custom auth routes (staff-login, MFA enroll/confirm)
// that live outside Auth.js's own CSRF-protected sign-in flow.
//
// The specific risk here is "login CSRF": since these routes set a session
// cookie on success, a forged cross-site request using the ATTACKER's own
// (valid) credentials could log a victim's browser into the attacker's
// account, letting the attacker later observe what the victim does under
// that account. SameSite=Lax cookies don't prevent this — SameSite governs
// whether *existing* cookies are attached to a cross-site request, not
// whether the forged request can be sent or receive a Set-Cookie back.
//
// Two independent checks, per OWASP's CSRF Cheat Sheet ("Verifying Origin
// with Standard Headers"):
//   1. Require `Content-Type: application/json` — a plain HTML `<form>`
//      cannot send this without JavaScript, and a cross-origin `fetch`
//      with a non-simple Content-Type triggers a CORS preflight that we
//      never approve (no Access-Control-Allow-Origin is set anywhere on
//      these routes), so the browser blocks the real request from firing.
//   2. Verify the `Origin` header (sent by all modern browsers on POST)
//      matches our own origin, when present.
export function assertSameOriginJsonRequest(request: Request): string | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return "Expected Content-Type: application/json.";
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const requestOrigin = new URL(request.url).origin;
    if (origin !== requestOrigin) {
      return "Cross-origin request rejected.";
    }
  }

  return null;
}
