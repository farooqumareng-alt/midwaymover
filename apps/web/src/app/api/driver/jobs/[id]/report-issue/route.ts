import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { reportCargoIssue } from "../../../../../../lib/driver.ts";
import { mapDriverActionResult } from "../../../../../../lib/driver-response.ts";

const bodySchema = z.object({ description: z.string().trim().min(1).max(1000) });

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
    return NextResponse.json({ error: "Describe the issue." }, { status: 400 });
  }

  const { id } = await params;
  const actor = await getActor();
  return mapDriverActionResult(await reportCargoIssue(id, parsed.data.description, actor));
}
