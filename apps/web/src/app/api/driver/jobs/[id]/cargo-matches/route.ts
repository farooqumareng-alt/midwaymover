import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { confirmCargoMatches } from "../../../../../../lib/driver.ts";
import { mapDriverActionResult } from "../../../../../../lib/driver-response.ts";

const bodySchema = z.object({
  sealNumber: z.string().trim().max(100).nullable().default(null),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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
  return mapDriverActionResult(await confirmCargoMatches(id, actor, parsed.data.sealNumber));
}
