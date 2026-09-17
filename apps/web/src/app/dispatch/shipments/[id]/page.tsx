import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getActor } from "../../../../lib/actor.ts";
import { getCustodyLog } from "../../../../lib/dispatch.ts";
import { CustodyLogView } from "../../../../components/dispatch/CustodyLogView.tsx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chain of custody — Midway Mover",
  robots: { index: false, follow: false },
};

const DISPATCH_ROLES = ["DISPATCHER", "ADMIN"];

export default async function CustodyLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor || !DISPATCH_ROLES.includes(actor.role) || !actor.mfaVerified) {
    redirect("/staff/login");
  }

  const { id } = await params;
  const log = await getCustodyLog(id, actor);
  if (!log) {
    notFound();
  }

  return <CustodyLogView log={log} />;
}
