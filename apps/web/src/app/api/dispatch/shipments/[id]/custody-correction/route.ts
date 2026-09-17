import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, UnauthorizedError } from "@midwaymover/core";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { addCustodyCorrection } from "../../../../../../lib/dispatch.ts";

const bodySchema = z.object({
  note: z.string().trim().min(1).max(1000),
});

const ERROR_MESSAGES: Record<string, string> = {
  notFound: "Shipment not found.",
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
    return NextResponse.json({ error: "A note is required." }, { status: 400 });
  }

  const { id } = await params;
  const actor = await getActor();

  try {
    const result = await addCustodyCorrection(id, parsed.data.note, actor);
    if (result.status === "success") {
      return NextResponse.json({ status: "success" });
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.status] ?? "Could not add correction." },
      { status: 404 },
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
