import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getActor } from "../../../../lib/actor.ts";
import { getJobDetail } from "../../../../lib/driver.ts";
import { DriverJobWorkflow } from "../../../../components/driver/DriverJobWorkflow.tsx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job — Midway Mover",
  robots: { index: false, follow: false },
};

export default async function DriverJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor || actor.role !== "DRIVER") {
    redirect("/staff/login");
  }

  const { id } = await params;
  const job = await getJobDetail(id, actor);
  if (!job) {
    notFound();
  }

  return <DriverJobWorkflow job={job} />;
}
