import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { reviewVehicleCapability } from "../../../../../../lib/dispatch.ts";

const VALID_CLASSES = ["MINIVAN", "PICKUP_TRUCK", "CARGO_VAN", "SPRINTER_CLASS_VAN"] as const;
type VehicleClass = (typeof VALID_CLASSES)[number];

function isVehicleClass(value: string): value is VehicleClass {
  return (VALID_CLASSES as readonly string[]).includes(value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vehicleClass: string }> },
): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) {
    return NextResponse.json({ error: csrfError }, { status: 403 });
  }

  const { vehicleClass } = await params;
  if (!isVehicleClass(vehicleClass)) {
    return NextResponse.json({ error: "Invalid vehicle class." }, { status: 400 });
  }

  const actor = await getActor();

  try {
    const result = await reviewVehicleCapability(vehicleClass, actor);
    switch (result.status) {
      case "success":
        return NextResponse.json({ status: "success" });
      case "notFound":
        return NextResponse.json({ error: "No capability profile for that class." }, { status: 404 });
      case "forbidden":
        return NextResponse.json({ error: "Not permitted." }, { status: 403 });
    }
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
