// Customer booking service layer (docs/PHASE-0-SPECIFICATION.md §H).
// Route handlers stay thin — they validate input shape (zod) and call in
// here; all pricing/matching/ownership/state-machine logic lives in this
// one place.
//
// Scope boundary, stated plainly rather than faked: Phase 9 (payments)
// hasn't been built yet, so confirmBooking() takes a shipment to
// AWAITING_PAYMENT and stops there — it does not fabricate a payment
// success. CONFIRMED (and everything after it in the state machine) only
// happens once a real Stripe payment succeeds.
import { db, type CargoType, type VehicleClass } from "@midwaymover/db";
import {
  matchVehicle,
  calculatePrice,
  estimateDistanceMiles,
  generateNumericCode,
  hashVerificationCode,
  type PriceBreakdown,
} from "@midwaymover/core";
import type { Actor } from "@midwaymover/core";

// Verification codes are valid for the whole shipment lifecycle, not
// literally minutes — pickup can be scheduled days out. Generous but
// bounded, per § Pickup: "short-lived, single-use" (single-use is the
// load-bearing property; "short-lived" here means "doesn't outlive a
// reasonable shipment window," not "expires in 10 minutes").
const VERIFICATION_CODE_TTL_DAYS = 14;

const QUOTE_TTL_MINUTES = 30;

export interface AddressInput {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface CreateQuoteInput {
  pickup: AddressInput;
  delivery: AddressInput;
  scheduledFor: Date | null;
  cargoType: CargoType;
  palletCount: number | null;
  approxWeightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  pickupForkliftAvailable: boolean;
  pickupDockAvailable: boolean;
  pickupCustomerLoading: boolean;
  pickupDriverAssistNeeded: boolean;
  deliveryForkliftAvailable: boolean;
  deliveryDockAvailable: boolean;
  deliveryReceiverUnloading: boolean;
  deliveryDriverAssistNeeded: boolean;
}

export type CreateQuoteResult =
  | {
      status: "quoted";
      shipmentId: string;
      quoteId: string;
      expiresAt: Date;
      vehicleClass: VehicleClass;
      specialReviewRequired: boolean;
      price: PriceBreakdown;
    }
  | { status: "specialReviewRequired"; shipmentId: string; reason: string };

/// Resolves the owning organizationId/customerId for a new shipment from
/// the (possibly null — guest) actor. Never trusts a client-supplied id;
/// derives everything from the server-side session. Lazily creates a
/// CustomerProfile for an authenticated customer who doesn't have one yet
/// (e.g. a brand-new magic-link signup, which only creates a User row —
/// see apps/web/src/auth.ts).
async function resolveOwnership(
  actor: Actor | null,
): Promise<{ organizationId: string | null; customerId: string | null }> {
  if (!actor || (actor.role !== "CUSTOMER" && actor.role !== "CUSTOMER_MANAGER")) {
    return { organizationId: null, customerId: null };
  }
  if (actor.customerProfileId) {
    return { organizationId: actor.organizationId, customerId: actor.customerProfileId };
  }
  const profile = await db.customerProfile.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId },
    update: {},
  });
  return { organizationId: profile.organizationId, customerId: profile.id };
}

export async function createQuote(
  input: CreateQuoteInput,
  actor: Actor | null,
): Promise<CreateQuoteResult> {
  const { organizationId, customerId } = await resolveOwnership(actor);

  const [pickupAddress, deliveryAddress] = await Promise.all([
    db.address.create({
      data: { ...input.pickup, organizationId, customerId },
    }),
    db.address.create({
      data: { ...input.delivery, organizationId, customerId },
    }),
  ]);

  const capabilities = await db.vehicleCapability.findMany();
  const matchResult = matchVehicle(
    {
      approxWeightKg: input.approxWeightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      palletCount: input.palletCount,
    },
    capabilities.map((c) => ({
      vehicleClass: c.vehicleClass,
      payloadKg: c.payloadKg,
      interiorLengthCm: c.interiorLengthCm,
      interiorWidthCm: c.interiorWidthCm,
      interiorHeightCm: c.interiorHeightCm,
      maxPalletCount: c.maxPalletCount,
      needsReview: c.needsReview,
    })),
  );

  const distanceMiles =
    matchResult.status === "matched"
      ? estimateDistanceMiles(input.pickup.postalCode, input.delivery.postalCode)
      : null;

  // Fail safe: no fleet vehicle fits, or we can't price the distance
  // (unrecognized ZIP) — route to manual review rather than guess
  // (§ Failure-Safe Principle: "If vehicle compatibility cannot be
  // determined safely: REQUIRE MANUAL REVIEW").
  if (matchResult.status === "specialReviewRequired" || distanceMiles === null) {
    const shipment = await db.shipment.create({
      data: {
        organizationId,
        customerId,
        cargoType: input.cargoType,
        palletCount: input.palletCount,
        approxWeightKg: input.approxWeightKg,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        pickupForkliftAvailable: input.pickupForkliftAvailable,
        pickupDockAvailable: input.pickupDockAvailable,
        pickupCustomerLoading: input.pickupCustomerLoading,
        pickupDriverAssistNeeded: input.pickupDriverAssistNeeded,
        deliveryForkliftAvailable: input.deliveryForkliftAvailable,
        deliveryDockAvailable: input.deliveryDockAvailable,
        deliveryReceiverUnloading: input.deliveryReceiverUnloading,
        deliveryDriverAssistNeeded: input.deliveryDriverAssistNeeded,
        scheduledFor: input.scheduledFor,
        specialReviewRequired: true,
        stops: {
          create: [
            {
              stopType: "PICKUP",
              addressId: pickupAddress.id,
              contactName: "",
              contactPhone: "",
            },
            {
              stopType: "DELIVERY",
              addressId: deliveryAddress.id,
              contactName: "",
              contactPhone: "",
            },
          ],
        },
      },
    });
    return {
      status: "specialReviewRequired",
      shipmentId: shipment.id,
      reason:
        matchResult.status === "specialReviewRequired"
          ? matchResult.reason
          : "Could not determine distance for this route.",
    };
  }

  const pricingRule = await db.pricingRule.findFirst({
    where: { vehicleClass: matchResult.vehicleClass, isActive: true },
  });
  if (!pricingRule) {
    // No active pricing for a vehicle class we just matched against is a
    // data-integrity problem, not a customer input problem — still fail
    // safe rather than 500.
    const shipment = await db.shipment.create({
      data: {
        organizationId,
        customerId,
        cargoType: input.cargoType,
        palletCount: input.palletCount,
        approxWeightKg: input.approxWeightKg,
        lengthCm: input.lengthCm,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        pickupForkliftAvailable: input.pickupForkliftAvailable,
        pickupDockAvailable: input.pickupDockAvailable,
        pickupCustomerLoading: input.pickupCustomerLoading,
        pickupDriverAssistNeeded: input.pickupDriverAssistNeeded,
        deliveryForkliftAvailable: input.deliveryForkliftAvailable,
        deliveryDockAvailable: input.deliveryDockAvailable,
        deliveryReceiverUnloading: input.deliveryReceiverUnloading,
        deliveryDriverAssistNeeded: input.deliveryDriverAssistNeeded,
        scheduledFor: input.scheduledFor,
        specialReviewRequired: true,
      },
    });
    return {
      status: "specialReviewRequired",
      shipmentId: shipment.id,
      reason: "No active pricing configured for the required vehicle class.",
    };
  }

  const price = calculatePrice(pricingRule, {
    distanceMiles,
    weightKg: input.approxWeightKg,
  });
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000);

  const shipment = await db.shipment.create({
    data: {
      organizationId,
      customerId,
      cargoType: input.cargoType,
      palletCount: input.palletCount,
      approxWeightKg: input.approxWeightKg,
      lengthCm: input.lengthCm,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      pickupForkliftAvailable: input.pickupForkliftAvailable,
      pickupDockAvailable: input.pickupDockAvailable,
      pickupCustomerLoading: input.pickupCustomerLoading,
      pickupDriverAssistNeeded: input.pickupDriverAssistNeeded,
      deliveryForkliftAvailable: input.deliveryForkliftAvailable,
      deliveryDockAvailable: input.deliveryDockAvailable,
      deliveryReceiverUnloading: input.deliveryReceiverUnloading,
      deliveryDriverAssistNeeded: input.deliveryDriverAssistNeeded,
      scheduledFor: input.scheduledFor,
      status: "QUOTED",
      requiredVehicleClass: matchResult.vehicleClass,
      specialReviewRequired: matchResult.needsReview,
      stops: {
        create: [
          {
            stopType: "PICKUP",
            addressId: pickupAddress.id,
            contactName: "",
            contactPhone: "",
          },
          {
            stopType: "DELIVERY",
            addressId: deliveryAddress.id,
            contactName: "",
            contactPhone: "",
          },
        ],
      },
      statusEvents: {
        create: [{ toStatus: "QUOTED" }],
      },
    },
  });

  const quote = await db.quote.create({
    data: {
      shipmentId: shipment.id,
      priceCents: price.totalCents,
      pricingRuleId: pricingRule.id,
      taxJurisdiction: input.delivery.state,
      taxCents: price.taxCents,
      expiresAt,
    },
  });

  return {
    status: "quoted",
    shipmentId: shipment.id,
    quoteId: quote.id,
    expiresAt,
    vehicleClass: matchResult.vehicleClass,
    specialReviewRequired: matchResult.needsReview,
    price,
  };
}

export interface ConfirmBookingInput {
  quoteId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export type ConfirmBookingResult =
  | {
      status: "success";
      shipmentId: string;
      shipmentStatus: "AWAITING_PAYMENT";
      trackingToken: string;
      /// Shown ONCE, here, and never again — there is no SMS/email
      /// provider yet (spec §M) to (re-)send these, so the customer must
      /// relay them to whoever hands off/receives the cargo. Absent on
      /// an idempotent replay (see below) since they were already shown
      /// on the original confirming request.
      pickupCode: string;
      deliveryCode: string;
    }
  | { status: "alreadyConfirmed"; shipmentId: string; trackingToken: string }
  | { status: "expired" }
  | { status: "notFound" };

/// Idempotent: re-confirming the same quoteId (double-click, retry) never
/// creates a second booking — the atomic `updateMany` below only succeeds
/// once; every later call sees the quote already CONSUMED and returns the
/// existing shipment instead of erroring or duplicating (§ Idempotency).
export async function confirmBooking(
  input: ConfirmBookingInput,
  actor: Actor | null,
): Promise<ConfirmBookingResult> {
  const quote = await db.quote.findUnique({
    where: { id: input.quoteId },
    include: {
      shipment: { select: { id: true, customerId: true, trackingToken: true } },
    },
  });
  if (!quote) return { status: "notFound" };
  const shipment = quote.shipment;

  // Ownership check: if this quote belongs to a customer/org, only that
  // same actor may confirm it. A guest-owned quote (customerId null) can
  // be confirmed by anyone holding the quoteId, same as a guest checkout
  // link normally works.
  if (shipment.customerId && shipment.customerId !== actor?.customerProfileId) {
    return { status: "notFound" }; // don't leak existence to the wrong caller
  }

  if (quote.status === "CONSUMED") {
    return {
      status: "alreadyConfirmed",
      shipmentId: shipment.id,
      trackingToken: shipment.trackingToken,
    };
  }

  if (quote.status === "EXPIRED" || quote.expiresAt < new Date()) {
    if (quote.status !== "EXPIRED") {
      await db.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED" } });
    }
    return { status: "expired" };
  }

  // Atomic, race-safe consume: only one caller ever flips ACTIVE -> CONSUMED.
  const consumed = await db.quote.updateMany({
    where: { id: quote.id, status: "ACTIVE" },
    data: { status: "CONSUMED" },
  });
  if (consumed.count === 0) {
    // Lost the race to a concurrent request — that one already handled it.
    return {
      status: "alreadyConfirmed",
      shipmentId: shipment.id,
      trackingToken: shipment.trackingToken,
    };
  }

  const pickupCode = generateNumericCode(6);
  const deliveryCode = generateNumericCode(6);
  const [pickupCodeHash, deliveryCodeHash] = await Promise.all([
    hashVerificationCode(pickupCode),
    hashVerificationCode(deliveryCode),
  ]);
  const codeExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "AWAITING_PAYMENT",
        guestContactName: actor ? null : input.contactName,
        guestContactPhone: actor ? null : input.contactPhone,
        guestContactEmail: actor ? null : input.contactEmail,
      },
    }),
    db.shipmentStatusEvent.create({
      data: { shipmentId: shipment.id, fromStatus: "QUOTED", toStatus: "AWAITING_PAYMENT" },
    }),
    db.shipmentStop.updateMany({
      where: { shipmentId: shipment.id },
      data: { contactName: input.contactName, contactPhone: input.contactPhone },
    }),
    db.pickupVerification.create({
      data: {
        shipmentId: shipment.id,
        method: "PIN",
        codeHash: pickupCodeHash,
        expiresAt: codeExpiresAt,
      },
    }),
    db.deliveryVerification.create({
      data: {
        shipmentId: shipment.id,
        method: "PIN",
        codeHash: deliveryCodeHash,
        expiresAt: codeExpiresAt,
      },
    }),
  ]);

  return {
    status: "success",
    shipmentId: shipment.id,
    shipmentStatus: "AWAITING_PAYMENT",
    trackingToken: shipment.trackingToken,
    pickupCode,
    deliveryCode,
  };
}
