import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "../../lib/actor.ts";
import { listMyJobs } from "../../lib/driver.ts";
import { DriverJobList } from "../../components/driver/DriverJobList.tsx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Jobs — Midway Mover",
  robots: { index: false, follow: false },
};

export default async function DriverHomePage() {
  const actor = await getActor();
  if (!actor || actor.role !== "DRIVER") {
    redirect("/staff/login");
  }

  const jobs = await listMyJobs(actor);
  return <DriverJobList jobs={jobs} />;
}
