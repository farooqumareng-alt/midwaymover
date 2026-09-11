import { assertSameOriginJsonRequest } from "../../../../../../lib/csrf.ts";
import { getActor } from "../../../../../../lib/actor.ts";
import { acceptJob } from "../../../../../../lib/driver.ts";
import { mapDriverActionResult } from "../../../../../../lib/driver-response.ts";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const csrfError = assertSameOriginJsonRequest(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const { id } = await params;
  const actor = await getActor();
  return mapDriverActionResult(await acceptJob(id, actor));
}
