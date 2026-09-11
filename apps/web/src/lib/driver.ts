// Driver PWA service layer (docs/PHASE-0-SPECIFICATION.md §I — Accept →
// Verify Pickup → Transport → Verify Delivery). Every action here:
//   1. requires a DRIVER actor,
//   2. requires that actor to be the CURRENTLY assigned driver for this
//      specific shipment (never "any driver" — §B: "A driver may access a
//      shipment only when that driver is currently assigned to the
//      shipment"), checked via packages/core's isAssignedDriver, and
//   3. requires the shipment to be in the correct state for that action —
//      the client never sets status directly, it calls an intent-revealing
//      command exactly like this file's function names (§D).
//
// Scope boundaries for this phase, stated rather than hidden:
// - PIN verification only (no QR/signature) — no object storage exists yet
//   for a captured signature image (§M, not chosen).
// - No POD row is created on delivery — same storage gap; a real
//   document/photo record is Phase 11 scope, not faked with an empty
//   storageKey.
// - No customer notification or billing trigger on delivery — Phase 10
//   (SMS/email) and Phase 9 (payments) don't exist yet.
// - No GPS/location cross-check on "arrived" actions — driver-attested
//   only; live location verification is Phase 7 scope.
import { db, Prisma, type ShipmentStatus, type CustodyEventType } from "@midwaymover/db";
import {
  requireActor,
  requireRole,
  isAssignedDriver,
  checkRateLimit,
  verifyVerificationCode,
  type Actor,
} from "@midwaymover/core";

const MAX_VERIFICATION_ATTEMPTS = 5;

export interface DriverJobSummary {
  shipmentId: string;
  status: string;
  cargoType: string;
  palletCount: number | null;
  approxWeightKg: number;
  scheduledFor: Date | null;
  pickupCity: string | null;
  pickupState: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
}

const ACTIVE_STATUSES = [
  "ASSIGNED",
  "DRIVER_EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "PICKUP_VERIFICATION",
  "LOADED",
  "IN_TRANSIT",
  "ARRIVED_DELIVERY",
  "DELIVERY_VERIFICATION",
] as const;

export async function listMyJobs(actor: Actor | null): Promise<DriverJobSummary[]> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  if (!a.driverProfileId) return [];

  const assignments = await db.shipmentAssignment.findMany({
    where: {
      driverId: a.driverProfileId,
      unassignedAt: null,
      shipment: { status: { in: [...ACTIVE_STATUSES] } },
    },
    include: {
      shipment: { include: { stops: { include: { address: true } } } },
    },
    orderBy: { assignedAt: "asc" },
  });

  return assignments.map(({ shipment }) => {
    const pickup = shipment.stops.find((s) => s.stopType === "PICKUP")?.address;
    const delivery = shipment.stops.find((s) => s.stopType === "DELIVERY")?.address;
    return {
      shipmentId: shipment.id,
      status: shipment.status,
      cargoType: shipment.cargoType,
      palletCount: shipment.palletCount,
      approxWeightKg: shipment.approxWeightKg,
      scheduledFor: shipment.scheduledFor,
      pickupCity: pickup?.city ?? null,
      pickupState: pickup?.state ?? null,
      deliveryCity: delivery?.city ?? null,
      deliveryState: delivery?.state ?? null,
    };
  });
}

export interface DriverJobDetail extends DriverJobSummary {
  pickupLine1: string | null;
  pickupPostalCode: string | null;
  pickupContactName: string | null;
  pickupContactPhone: string | null;
  pickupForkliftAvailable: boolean;
  pickupDockAvailable: boolean;
  pickupCustomerLoading: boolean;
  pickupDriverAssistNeeded: boolean;
  deliveryLine1: string | null;
  deliveryPostalCode: string | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  deliveryForkliftAvailable: boolean;
  deliveryDockAvailable: boolean;
  deliveryReceiverUnloading: boolean;
  deliveryDriverAssistNeeded: boolean;
}

async function loadAssignedShipmentOrThrow(shipmentId: string, actor: Actor) {
  const assignment = await db.shipmentAssignment.findFirst({
    where: { shipmentId, driverId: actor.driverProfileId ?? "" },
    orderBy: { assignedAt: "desc" },
  });
  if (!assignment || !isAssignedDriver(actor, assignment)) {
    return null;
  }
  return db.shipment.findUnique({
    where: { id: shipmentId },
    include: { stops: { include: { address: true } } },
  });
}

export async function getJobDetail(
  shipmentId: string,
  actor: Actor | null,
): Promise<DriverJobDetail | null> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);

  const shipment = await loadAssignedShipmentOrThrow(shipmentId, a);
  if (!shipment) return null;

  const pickupStop = shipment.stops.find((s) => s.stopType === "PICKUP");
  const deliveryStop = shipment.stops.find((s) => s.stopType === "DELIVERY");

  return {
    shipmentId: shipment.id,
    status: shipment.status,
    cargoType: shipment.cargoType,
    palletCount: shipment.palletCount,
    approxWeightKg: shipment.approxWeightKg,
    scheduledFor: shipment.scheduledFor,
    pickupCity: pickupStop?.address?.city ?? null,
    pickupState: pickupStop?.address?.state ?? null,
    pickupLine1: pickupStop?.address?.line1 ?? null,
    pickupPostalCode: pickupStop?.address?.postalCode ?? null,
    pickupContactName: pickupStop?.contactName || null,
    pickupContactPhone: pickupStop?.contactPhone || null,
    pickupForkliftAvailable: shipment.pickupForkliftAvailable,
    pickupDockAvailable: shipment.pickupDockAvailable,
    pickupCustomerLoading: shipment.pickupCustomerLoading,
    pickupDriverAssistNeeded: shipment.pickupDriverAssistNeeded,
    deliveryCity: deliveryStop?.address?.city ?? null,
    deliveryState: deliveryStop?.address?.state ?? null,
    deliveryLine1: deliveryStop?.address?.line1 ?? null,
    deliveryPostalCode: deliveryStop?.address?.postalCode ?? null,
    deliveryContactName: deliveryStop?.contactName || null,
    deliveryContactPhone: deliveryStop?.contactPhone || null,
    deliveryForkliftAvailable: shipment.deliveryForkliftAvailable,
    deliveryDockAvailable: shipment.deliveryDockAvailable,
    deliveryReceiverUnloading: shipment.deliveryReceiverUnloading,
    deliveryDriverAssistNeeded: shipment.deliveryDriverAssistNeeded,
  };
}

export type DriverActionResult =
  | { status: "success" }
  | { status: "notFound" }
  | { status: "invalidState" }
  | { status: "invalidCode" }
  | { status: "tooManyAttempts" };

async function transition(
  shipmentId: string,
  actor: Actor,
  expectedStatus: ShipmentStatus,
  newStatus: ShipmentStatus,
  custodyEvent?: CustodyEventType,
): Promise<DriverActionResult> {
  const shipment = await loadAssignedShipmentOrThrow(shipmentId, actor);
  if (!shipment) return { status: "notFound" };
  if (shipment.status !== expectedStatus) return { status: "invalidState" };

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.shipment.update({ where: { id: shipmentId }, data: { status: newStatus } }),
    db.shipmentStatusEvent.create({
      data: {
        shipmentId,
        fromStatus: expectedStatus,
        toStatus: newStatus,
        actorUserId: actor.userId,
      },
    }),
  ];
  if (custodyEvent) {
    ops.push(
      db.chainOfCustodyEvent.create({
        data: { shipmentId, eventType: custodyEvent, actorUserId: actor.userId },
      }),
    );
  }
  await db.$transaction(ops);
  return { status: "success" };
}

export async function acceptJob(shipmentId: string, actor: Actor | null): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return transition(shipmentId, a, "ASSIGNED", "DRIVER_EN_ROUTE_PICKUP");
}

export async function markArrivedPickup(
  shipmentId: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return transition(shipmentId, a, "DRIVER_EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "ARRIVED_PICKUP");
}

async function verifyCode(
  shipmentId: string,
  code: string,
  actor: Actor,
  expectedStatus: ShipmentStatus,
  newStatus: ShipmentStatus,
  custodyEvent: CustodyEventType,
  verificationTable: "pickupVerification" | "deliveryVerification",
): Promise<DriverActionResult> {
  const shipment = await loadAssignedShipmentOrThrow(shipmentId, actor);
  if (!shipment) return { status: "notFound" };
  if (shipment.status !== expectedStatus) return { status: "invalidState" };

  const bucket = await checkRateLimit(`verify-code:${shipmentId}:${verificationTable}`, {
    limit: MAX_VERIFICATION_ATTEMPTS,
    windowSeconds: 30 * 60,
  });
  if (!bucket.allowed) return { status: "tooManyAttempts" };

  const verification =
    verificationTable === "pickupVerification"
      ? await db.pickupVerification.findUnique({ where: { shipmentId } })
      : await db.deliveryVerification.findUnique({ where: { shipmentId } });

  if (!verification || verification.consumedAt || verification.expiresAt < new Date()) {
    return { status: "invalidCode" };
  }

  const ok = await verifyVerificationCode(verification.codeHash, code);

  if (verificationTable === "pickupVerification") {
    await db.pickupVerification.update({
      where: { shipmentId },
      data: { attemptCount: { increment: 1 }, consumedAt: ok ? new Date() : undefined },
    });
  } else {
    await db.deliveryVerification.update({
      where: { shipmentId },
      data: { attemptCount: { increment: 1 }, consumedAt: ok ? new Date() : undefined },
    });
  }

  if (!ok) return { status: "invalidCode" };

  return transition(shipmentId, actor, expectedStatus, newStatus, custodyEvent);
}

export async function verifyPickup(
  shipmentId: string,
  code: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return verifyCode(
    shipmentId,
    code,
    a,
    "ARRIVED_PICKUP",
    "PICKUP_VERIFICATION",
    "PICKUP_IDENTITY_VERIFIED",
    "pickupVerification",
  );
}

export async function confirmCargoMatches(
  shipmentId: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  const first = await transition(shipmentId, a, "PICKUP_VERIFICATION", "LOADED", "CARGO_VERIFIED");
  if (first.status !== "success") return first;
  await db.chainOfCustodyEvent.create({
    data: { shipmentId, eventType: "LOADED", actorUserId: a.userId },
  });
  return first;
}

export async function reportCargoIssue(
  shipmentId: string,
  description: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);

  const shipment = await loadAssignedShipmentOrThrow(shipmentId, a);
  if (!shipment) return { status: "notFound" };
  if (shipment.status !== "PICKUP_VERIFICATION") return { status: "invalidState" };

  await db.$transaction([
    db.incident.create({
      data: { shipmentId, driverId: a.driverProfileId, description },
    }),
    db.shipment.update({ where: { id: shipmentId }, data: { status: "INCIDENT_REPORTED" } }),
    db.shipmentStatusEvent.create({
      data: {
        shipmentId,
        fromStatus: "PICKUP_VERIFICATION",
        toStatus: "INCIDENT_REPORTED",
        actorUserId: a.userId,
        metadata: { description },
      },
    }),
  ]);
  return { status: "success" };
}

export async function startTransit(shipmentId: string, actor: Actor | null): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return transition(shipmentId, a, "LOADED", "IN_TRANSIT", "DEPARTED");
}

export async function markArrivedDelivery(
  shipmentId: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return transition(shipmentId, a, "IN_TRANSIT", "ARRIVED_DELIVERY", "ARRIVED_DELIVERY");
}

export async function verifyDelivery(
  shipmentId: string,
  code: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return verifyCode(
    shipmentId,
    code,
    a,
    "ARRIVED_DELIVERY",
    "DELIVERY_VERIFICATION",
    "RECIPIENT_VERIFIED",
    "deliveryVerification",
  );
}

export async function completeDelivery(
  shipmentId: string,
  actor: Actor | null,
): Promise<DriverActionResult> {
  const a = requireActor(actor);
  requireRole(a, ["DRIVER"]);
  return transition(shipmentId, a, "DELIVERY_VERIFICATION", "DELIVERED", "DELIVERED");
}
