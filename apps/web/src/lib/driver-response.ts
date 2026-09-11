import { NextResponse } from "next/server";
import type { DriverActionResult } from "./driver.ts";

const MESSAGES: Record<string, { message: string; status: number }> = {
  notFound: { message: "Job not found or not assigned to you.", status: 404 },
  invalidState: { message: "This job isn't in the right state for that action.", status: 409 },
  invalidCode: { message: "Incorrect code.", status: 401 },
  tooManyAttempts: { message: "Too many attempts. Wait a while and try again.", status: 429 },
};

export function mapDriverActionResult(result: DriverActionResult): Response {
  if (result.status === "success") {
    return NextResponse.json({ status: "success" });
  }
  const mapped = MESSAGES[result.status] ?? { message: "Could not complete action.", status: 400 };
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}
