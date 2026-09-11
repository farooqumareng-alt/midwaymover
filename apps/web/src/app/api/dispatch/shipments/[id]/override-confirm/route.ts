import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, UnauthorizedError } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { overrideConfirmPayment } from "../../../../../../lib/dispatch.ts";

const bodySchema = z.object({ reason: z.string().trim().min(1).max(500) });

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
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  const { id } = await params;
  const actor = await getActor();

  try {
    const result = await overrideConfirmPayment(id, parsed.data.reason, actor);
    switch (result.status) {
      case "success":
        return NextResponse.json({ status: "success" });
      case "notFound":
        return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
      case "invalidState":
        return NextResponse.json(
          { error: "Shipment is not awaiting payment." },
          { status: 409 },
        );
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
