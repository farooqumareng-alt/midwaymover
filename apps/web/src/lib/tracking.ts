// Public shipment tracking (docs/PHASE-0-SPECIFICATION.md §C — "Tracking
// (public link) | View | anyone with opaque token | token valid, not
// expired/revoked, matches shipment" and § Customer Tracking / § Live
// Location Privacy).
//
// Access is by opaque trackingToken ONLY — never by internal shipment id
// (§ Customer Tracking: "Never create URLs such as /track/10025"). The
// returned view is deliberately coarse, on the same reasoning as
// confidential-by-default everywhere else: a tracking link can be
// forwarded beyond whoever originally booked it, so it must never leak
// pricing, exact street address, guest contact details, driver identity,
// or internal notes — city/state and a friendly status stage only.
import { db, type ShipmentStatus } from "@midwaymover/db";
import { checkRateLimit } from "@midwaymover/core";

export type TrackingStage =
  | "booked"
  | "confirmed"
  | "pickup"
  | "in_transit"
  | "delivered"
  | "exception";

const STAGE_BY_STATUS: Record<ShipmentStatus, TrackingStage> = {
  DRAFT: "booked",
  QUOTED: "booked",
  AWAITING_PAYMENT: "booked",
  CONFIRMED: "confirmed",
  AWAITING_ASSIGNMENT: "confirmed",
  ASSIGNED: "confirmed",
  DRIVER_EN_ROUTE_PICKUP: "pickup",
  ARRIVED_PICKUP: "pickup",
  PICKUP_VERIFICATION: "pickup",
  LOADED: "pickup",
  IN_TRANSIT: "in_transit",
  ARRIVED_DELIVERY: "in_transit",
  DELIVERY_VERIFICATION: "in_transit",
  DELIVERED: "delivered",
  COMPLETED: "delivered",
  CANCELLED: "exception",
  REJECTED: "exception",
  FAILED_PICKUP: "exception",
  FAILED_DELIVERY: "exception",
  ON_HOLD: "exception",
  INCIDENT_REPORTED: "exception",
};

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  DRAFT: "Booking in progress",
  QUOTED: "Quote ready",
  AWAITING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  AWAITING_ASSIGNMENT: "Confirmed — assigning a driver",
  ASSIGNED: "Driver assigned",
  DRIVER_EN_ROUTE_PICKUP: "Driver en route to pickup",
  ARRIVED_PICKUP: "Driver at pickup",
  PICKUP_VERIFICATION: "Verifying pickup",
  LOADED: "Loaded, departing soon",
  IN_TRANSIT: "In transit",
  ARRIVED_DELIVERY: "Arrived at delivery",
  DELIVERY_VERIFICATION: "Verifying delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Cancelled",
  FAILED_PICKUP: "There's an update on your shipment — we'll be in touch",
  FAILED_DELIVERY: "There's an update on your shipment — we'll be in touch",
  ON_HOLD: "On hold — we'll be in touch",
  INCIDENT_REPORTED: "There's an update on your shipment — we'll be in touch",
};

const CARGO_LABELS: Record<string, string> = {
  BOXES_PACKAGES: "Boxes / Packages",
  PALLETS: "Pallets",
  EQUIPMENT_MACHINERY: "Equipment / Machinery",
  OTHER: "Other",
};

export interface TrackingView {
  statusLabel: string;
  stage: TrackingStage;
  cargoLabel: string;
  pickupCity: string | null;
  pickupState: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TrackingResult =
  | { status: "found"; view: TrackingView }
  | { status: "notFound" }
  | { status: "rateLimited"; resetsInSeconds: number };

export async function getTrackingView(
  token: string,
  ip: string,
): Promise<TrackingResult> {
  const bucket = await checkRateLimit(`tracking:${ip}`, {
    limit: 60,
    windowSeconds: 15 * 60,
  });
  if (!bucket.allowed) {
    return { status: "rateLimited", resetsInSeconds: bucket.resetsInSeconds };
  }

  const shipment = await db.shipment.findUnique({
    where: { trackingToken: token },
    include: {
      stops: { include: { address: true } },
    },
  });

  if (!shipment || shipment.trackingRevokedAt) {
    return { status: "notFound" };
  }

  const pickupStop = shipment.stops.find((s) => s.stopType === "PICKUP");
  const deliveryStop = shipment.stops.find((s) => s.stopType === "DELIVERY");

  return {
    status: "found",
    view: {
      statusLabel: STATUS_LABELS[shipment.status],
      stage: STAGE_BY_STATUS[shipment.status],
      cargoLabel: CARGO_LABELS[shipment.cargoType] ?? "Shipment",
      pickupCity: pickupStop?.address?.city ?? null,
      pickupState: pickupStop?.address?.state ?? null,
      deliveryCity: deliveryStop?.address?.city ?? null,
      deliveryState: deliveryStop?.address?.state ?? null,
      scheduledFor: shipment.scheduledFor,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    },
  };
}
