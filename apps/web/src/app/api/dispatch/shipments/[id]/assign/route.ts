import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, UnauthorizedError } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { assignDriver } from "../../../../../../lib/dispatch.ts";

const bodySchema = z.object({
  driverId: z.string().min(1),
  vehicleId: z.string().min(1),
  reason: z.string().trim().max(500).nullable().default(null),
});

const ERROR_MESSAGES: Record<string, string> = {
  notFound: "Shipment, driver, or vehicle not found.",
  invalidState: "Shipment is not awaiting assignment.",
  vehicleNotReviewed:
    "This vehicle's fleet specs haven't been reviewed yet. Review it before assigning.",
  vehicleClassMismatch: "That vehicle doesn't match the required vehicle class.",
  driverInactive: "That driver is not active.",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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

  const { id } = await params;
  const actor = await getActor();

  try {
    const result = await assignDriver(
      {
        shipmentId: id,
        driverId: parsed.data.driverId,
        vehicleId: parsed.data.vehicleId,
        reason: parsed.data.reason,
      },
      actor,
    );
    if (result.status === "success") {
      return NextResponse.json({ status: "success" });
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.status] ?? "Could not assign." },
      { status: result.status === "notFound" ? 404 : 409 },
    );
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "Not permitted." }, { status: 403 });
    }
    throw err;
  }
}
