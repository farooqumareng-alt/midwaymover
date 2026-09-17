import { NextResponse } from "next/server";
import type { DriverActionResult } from "./driver.ts";

const MESSAGES: Record<string, { message: string; status: number }> = {
  notFound: { message: "Job not found or not assigned to you.", status: 404 },
  invalidState: { message: "This job isn't in the right state for that action.", status: 409 },
  invalidCode: { message: "Incorrect code.", status: 401 },
  tooManyAttempts: { message: "Too many attempts. Wait a while and try again.", status: 429 },
  sealMismatch: {
    message: "Seal number doesn't match. An incident has been raised — dispatch has been notified.",
    status: 409,
  },
};

export function mapDriverActionResult(result: DriverActionResult): Response {
  if (result.status === "success") {
    return NextResponse.json({ status: "success" });
  }
  // Distinct shape (not a generic error) so the client can react to it —
  // same pattern as the auth flow's mfaSetupRequired/mfaCodeRequired.
  if (result.status === "sealNumberRequired") {
    return NextResponse.json({ status: "sealNumberRequired" }, { status: 200 });
  }
  const mapped = MESSAGES[result.status] ?? { message: "Could not complete action.", status: 400 };
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}
