import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../lib/csrf.ts";
import { getClientIp } from "../../../lib/request-ip.ts";
import { getActor } from "../../../lib/actor.ts";
import { createQuote } from "../../../lib/booking.ts";

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().default(null),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().length(2).toUpperCase(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Must be a 5-digit ZIP code."),
});

const bodySchema = z.object({
  pickup: addressSchema,
  delivery: addressSchema,
  scheduledFor: z.string().datetime().nullable().default(null),
  cargoType: z.enum(["BOXES_PACKAGES", "PALLETS", "EQUIPMENT_MACHINERY", "OTHER"]),
  palletCount: z.number().int().min(0).max(4).nullable().default(null),
  approxWeightKg: z.number().positive().max(20000),
  lengthCm: z.number().positive().max(2000).nullable().default(null),
  widthCm: z.number().positive().max(2000).nullable().default(null),
  heightCm: z.number().positive().max(2000).nullable().default(null),
  pickupForkliftAvailable: z.boolean().default(false),
  pickupDockAvailable: z.boolean().default(false),
  pickupCustomerLoading: z.boolean().default(false),
  pickupDriverAssistNeeded: z.boolean().default(false),
  deliveryForkliftAvailable: z.boolean().default(false),
  deliveryDockAvailable: z.boolean().default(false),
  deliveryReceiverUnloading: z.boolean().default(false),
  deliveryDriverAssistNeeded: z.boolean().default(false),
});

export async function POST(request: Request): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) {
    return NextResponse.json({ error: csrfError }, { status: 403 });
  }

  const ip = getClientIp(request);
  const bucket = await checkRateLimit(`quote-create-ip:${ip}`, {
    limit: 30,
    windowSeconds: 15 * 60,
  });
  if (!bucket.allowed) {
    return NextResponse.json(
      { error: "Too many quote requests. Try again later." },
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
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const actor = await getActor();
  const result = await createQuote(
    {
      ...parsed.data,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
    },
    actor,
  );

  if (result.status === "specialReviewRequired") {
    return NextResponse.json(
      {
        status: "specialReviewRequired",
        shipmentId: result.shipmentId,
        message:
          "We couldn't automatically price this shipment. Our team will review it and follow up shortly.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    status: "quoted",
    quoteId: result.quoteId,
    shipmentId: result.shipmentId,
    expiresAt: result.expiresAt.toISOString(),
    vehicleClass: result.vehicleClass,
    specialReviewRequired: result.specialReviewRequired,
    price: result.price,
  });
}
