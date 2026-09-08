import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginJsonRequest } from "../../../../../lib/csrf.ts";
import { getClientIp } from "../../../../../lib/request-ip.ts";
import { beginMfaEnrollment } from "../../../../../lib/mfa-enrollment.ts";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) {
    return NextResponse.json({ error: csrfError }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await beginMfaEnrollment({ ...parsed.data, ip: getClientIp(request) });

  switch (result.status) {
    case "success":
      return NextResponse.json({
        status: "success",
        enrollmentUri: result.enrollmentUri,
      });
    case "alreadyEnrolled":
      return NextResponse.json(
        {
          error:
            "MFA is already enabled on this account. Contact an administrator to reset it.",
        },
        { status: 409 },
      );
    case "invalidCredentials":
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    case "rateLimited":
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(result.resetsInSeconds) } },
      );
  }
}
