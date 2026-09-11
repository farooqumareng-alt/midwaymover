// Dispatch service layer (docs/PHASE-0-SPECIFICATION.md §J, §C). Every
// exported function here requires a DISPATCHER/ADMIN actor (checked via
// packages/core's requireRole/requireMfaIfNeeded — both roles require MFA
// per §K, so an authenticated session here already implies MFA was
// verified at login) and every state-changing action creates an
// AuditEvent (§ Dispatch Actions: "Sensitive overrides require reason,
// actor, timestamp, audit event").
import { db, type VehicleClass } from "@midwaymover/db";
import { requireActor, requireRole, requireMfaIfNeeded, type Actor } from "@midwaymover/core";

const DISPATCH_ROLES = ["DISPATCHER", "ADMIN"] as const;

export interface AttentionShipment {
  id: string;
  status: string;
  cargoType: string;
  palletCount: number | null;
  approxWeightKg: number;
  requiredVehicleClass: VehicleClass | null;
  specialReviewRequired: boolean;
  scheduledFor: Date | null;
  pickup: { line1: string; city: string; state: string; postalCode: string } | null;
  delivery: { line1: string; city: string; state: string; postalCode: string } | null;
}

/// §C: "Shipment | View (ops fields only) | DISPATCHER | dispatcher
/// permission; billing fields excluded" — no pricing/Quote/Payment/Invoice
/// fields are selected here, by construction, not by filtering afterward.
export async function listShipmentsNeedingAttention(
  actor: Actor | null,
): Promise<AttentionShipment[]> {
  const a = requireActor(actor);
  requireRole(a, DISPATCH_ROLES);
  requireMfaIfNeeded(a);

  const shipments = await db.shipment.findMany({
    where: { status: { in: ["AWAITING_PAYMENT", "CONFIRMED", "AWAITING_ASSIGNMENT"] } },
    include: { stops: { include: { address: true } } },
    orderBy: { createdAt: "asc" },
  });

  return shipments.map((s) => {
    const pickupStop = s.stops.find((st) => st.stopType === "PICKUP");
    const deliveryStop = s.stops.find((st) => st.stopType === "DELIVERY");
    return {
      id: s.id,
      status: s.status,
      cargoType: s.cargoType,
      palletCount: s.palletCount,
      approxWeightKg: s.approxWeightKg,
      requiredVehicleClass: s.requiredVehicleClass,
      specialReviewRequired: s.specialReviewRequired,
      scheduledFor: s.scheduledFor,
      pickup: pickupStop?.address
        ? {
            line1: pickupStop.address.line1,
            city: pickupStop.address.city,
            state: pickupStop.address.state,
            postalCode: pickupStop.address.postalCode,
          }
        : null,
      delivery: deliveryStop?.address
        ? {
            line1: deliveryStop.address.line1,
            city: deliveryStop.address.city,
            state: deliveryStop.address.state,
            postalCode: deliveryStop.address.postalCode,
          }
        : null,
    };
  });
}

export interface AvailableDriver {
  driverId: string;
  name: string | null;
  email: string;
}

export async function listAvailableDrivers(actor: Actor | null): Promise<AvailableDriver[]> {
  const a = requireActor(actor);
  requireRole(a, DISPATCH_ROLES);
  requireMfaIfNeeded(a);

  const drivers = await db.driverProfile.findMany({
    where: { isActive: true, user: { disabledAt: null } },
    include: { user: { select: { name: true, email: true } } },
  });
  return drivers.map((d) => ({ driverId: d.id, name: d.user.name, email: d.user.email }));
}

export interface AvailableVehicle {
  vehicleId: string;
  vehicleClass: VehicleClass;
  plate: string;
  needsReview: boolean;
}

export async function listVehicles(actor: Actor | null): Promise<AvailableVehicle[]> {
  const a = requireActor(actor);
  requireRole(a, DISPATCH_ROLES);
  requireMfaIfNeeded(a);

  const vehicles = await db.vehicle.findMany({
    where: { isActive: true },
    include: { capability: true },
  });
  return vehicles.map((v) => ({
    vehicleId: v.id,
    vehicleClass: v.vehicleClass,
    plate: v.plate,
    needsReview: v.capability?.needsReview ?? true,
  }));
}

export type ReviewVehicleResult =
  | { status: "success" }
  | { status: "notFound" }
  | { status: "forbidden" };

/// ADMIN-only (fleet-spec review is a CRUD-level trust decision, §C:
/// "Vehicle / Fleet | Manage | ... ADMIN (CRUD)" — not the coarser
/// dispatcher "assign" permission). Marks a vehicle CLASS's capability
/// profile as human-reviewed — see packages/db/prisma/seed.ts and
/// docs/PHASE-0-SPECIFICATION.md §O: placeholder fleet data must not be
/// used to confirm a real assignment until someone actually reviews it.
export async function reviewVehicleCapability(
  vehicleClass: VehicleClass,
  actor: Actor | null,
): Promise<ReviewVehicleResult> {
  const a = requireActor(actor);
  if (a.role !== "ADMIN") return { status: "forbidden" };

  const capability = await db.vehicleCapability.findUnique({ where: { vehicleClass } });
  if (!capability) return { status: "notFound" };

  await db.$transaction([
    db.vehicleCapability.update({
      where: { vehicleClass },
      data: { needsReview: false, reviewedByUserId: a.userId, reviewedAt: new Date() },
    }),
    db.auditEvent.create({
      data: {
        actorUserId: a.userId,
        action: "vehicle_capability_reviewed",
        resourceType: "VehicleCapability",
        resourceId: capability.id,
        result: "success",
        metadata: { vehicleClass },
      },
    }),
  ]);

  return { status: "success" };
}

export type OverrideConfirmResult =
  | { status: "success" }
  | { status: "notFound" }
  | { status: "invalidState" };

/// Manual, audited alternative to a Stripe payment success (Phase 9 isn't
/// built yet). Never claims a payment happened — no Payment row is
/// created here; this is a distinct, honestly-labeled dispatcher action
/// (e.g. for an invoiced business account, §H Business Accounts), not a
/// simulated card charge.
export async function overrideConfirmPayment(
  shipmentId: string,
  reason: string,
  actor: Actor | null,
): Promise<OverrideConfirmResult> {
  const a = requireActor(actor);
  requireRole(a, DISPATCH_ROLES);
  requireMfaIfNeeded(a);

  const shipment = await db.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return { status: "notFound" };
  if (shipment.status !== "AWAITING_PAYMENT") return { status: "invalidState" };

  await db.$transaction([
    db.shipment.update({ where: { id: shipmentId }, data: { status: "AWAITING_ASSIGNMENT" } }),
    db.shipmentStatusEvent.create({
      data: {
        shipmentId,
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "CONFIRMED",
        actorUserId: a.userId,
        metadata: { reason },
      },
    }),
    db.shipmentStatusEvent.create({
      data: { shipmentId, fromStatus: "CONFIRMED", toStatus: "AWAITING_ASSIGNMENT" },
    }),
    db.auditEvent.create({
      data: {
        actorUserId: a.userId,
        action: "shipment_payment_override",
        resourceType: "Shipment",
        resourceId: shipmentId,
        result: "success",
        metadata: { reason },
      },
    }),
  ]);

  return { status: "success" };
}

export type AssignDriverResult =
  | { status: "success" }
  | { status: "notFound" }
  | { status: "invalidState" }
  | { status: "vehicleNotReviewed" }
  | { status: "vehicleClassMismatch" }
  | { status: "driverInactive" };

export async function assignDriver(
  input: { shipmentId: string; driverId: string; vehicleId: string; reason: string | null },
  actor: Actor | null,
): Promise<AssignDriverResult> {
  const a = requireActor(actor);
  requireRole(a, DISPATCH_ROLES);
  requireMfaIfNeeded(a);

  const shipment = await db.shipment.findUnique({ where: { id: input.shipmentId } });
  if (!shipment) return { status: "notFound" };
  if (shipment.status !== "AWAITING_ASSIGNMENT") return { status: "invalidState" };

  const vehicle = await db.vehicle.findUnique({
    where: { id: input.vehicleId },
    include: { capability: true },
  });
  if (!vehicle) return { status: "notFound" };
  // Fail closed: never assign a vehicle whose fleet spec hasn't been
  // human-reviewed (§O) — even though it was fine to quote/price against
  // it in Phase 4.
  if (!vehicle.capability || vehicle.capability.needsReview) {
    return { status: "vehicleNotReviewed" };
  }
  if (shipment.requiredVehicleClass && vehicle.vehicleClass !== shipment.requiredVehicleClass) {
    return { status: "vehicleClassMismatch" };
  }

  const driver = await db.driverProfile.findUnique({ where: { id: input.driverId } });
  if (!driver) return { status: "notFound" };
  if (!driver.isActive) return { status: "driverInactive" };

  await db.$transaction([
    db.shipmentAssignment.create({
      data: {
        shipmentId: input.shipmentId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        reason: input.reason,
      },
    }),
    db.chainOfCustodyEvent.create({
      data: {
        shipmentId: input.shipmentId,
        eventType: "DRIVER_ASSIGNED",
        actorUserId: a.userId,
      },
    }),
    db.shipment.update({ where: { id: input.shipmentId }, data: { status: "ASSIGNED" } }),
    db.shipmentStatusEvent.create({
      data: {
        shipmentId: input.shipmentId,
        fromStatus: "AWAITING_ASSIGNMENT",
        toStatus: "ASSIGNED",
        actorUserId: a.userId,
      },
    }),
    db.auditEvent.create({
      data: {
        actorUserId: a.userId,
        action: "shipment_driver_assigned",
        resourceType: "Shipment",
        resourceId: input.shipmentId,
        result: "success",
        metadata: { driverId: input.driverId, vehicleId: input.vehicleId, reason: input.reason },
      },
    }),
  ]);

  return { status: "success" };
}
