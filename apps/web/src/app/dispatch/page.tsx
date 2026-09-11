import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "../../lib/actor.ts";
import {
  listShipmentsNeedingAttention,
  listAvailableDrivers,
  listVehicles,
} from "../../lib/dispatch.ts";
import { DispatchBoard } from "../../components/dispatch/DispatchBoard.tsx";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dispatch — Midway Mover",
  robots: { index: false, follow: false },
};

const DISPATCH_ROLES = ["DISPATCHER", "ADMIN"];

export default async function DispatchPage() {
  const actor = await getActor();
  if (!actor || !DISPATCH_ROLES.includes(actor.role) || !actor.mfaVerified) {
    redirect("/staff/login");
  }

  const [shipments, drivers, vehicles] = await Promise.all([
    listShipmentsNeedingAttention(actor),
    listAvailableDrivers(actor),
    listVehicles(actor),
  ]);

  return (
    <DispatchBoard
      shipments={shipments}
      drivers={drivers}
      vehicles={vehicles}
      isAdmin={actor.role === "ADMIN"}
    />
  );
}
