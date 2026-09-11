import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../lib/csrf.ts";
import { getClientIp } from "../../../lib/request-ip.ts";
import { getActor } from "../../../lib/actor.ts";
import { confirmBooking } from "../../../lib/booking.ts";

const bodySchema = z.object({
  quoteId: z.string().min(1),
  contactName: z.string().trim().min(1).max(200),
  contactPhone: z.string().trim().min(7).max(20),
  contactEmail: z.string().trim().email().max(320),
});

export async function POST(request: Request): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) {
    return NextResponse.json({ error: csrfError }, { status: 403 });
  }

  const ip = getClientIp(request);
  const bucket = await checkRateLimit(`booking-confirm-ip:${ip}`, {
    limit: 20,
    windowSeconds: 15 * 60,
  });
  if (!bucket.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.resetsInSeconds) } },
    );
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

  const actor = await getActor();
  const result = await confirmBooking(parsed.data, actor);

  switch (result.status) {
    case "success":
      return NextResponse.json({
        status: "success",
        shipmentId: result.shipmentId,
        trackingToken: result.trackingToken,
        pickupCode: result.pickupCode,
        deliveryCode: result.deliveryCode,
      });
    case "alreadyConfirmed":
      return NextResponse.json({
        status: "success",
        shipmentId: result.shipmentId,
        trackingToken: result.trackingToken,
      });
    case "expired":
      return NextResponse.json(
        { error: "This quote has expired. Please request a new price." },
        { status: 409 },
      );
    case "notFound":
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }
}
