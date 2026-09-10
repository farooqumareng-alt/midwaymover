// Seeds one representative Vehicle + VehicleCapability per class (4 rows)
// and one active PricingRule per class. Real fleet management — multiple
// physical vehicles per class, individual plates/availability — is Phase 8
// (dispatch) scope; this seed exists only so the vehicle-matching and
// pricing engines have something to match/quote against at all.
//
// All figures below are PLACEHOLDERS (docs/PHASE-0-SPECIFICATION.md §O —
// "ship Phase 1 with placeholder VehicleCapability data, flagged
// needsReview, with a hard server-side gate preventing a live booking
// from confirming against an unreviewed vehicle row"). needsReview: true
// on every row here is that flag — booking.ts's confirmation path must
// check it, not just this seed script's comment.
import { db } from "../src/client.ts";

interface VehicleSeed {
  vehicleClass: "MINIVAN" | "PICKUP_TRUCK" | "CARGO_VAN" | "SPRINTER_CLASS_VAN";
  plate: string;
  payloadKg: number;
  interiorLengthCm: number;
  interiorWidthCm: number;
  interiorHeightCm: number;
  maxPalletCount: number;
  baseFeeCents: number;
  perKmCents: number;
  perKgCents: number;
}

const VEHICLES: VehicleSeed[] = [
  {
    vehicleClass: "MINIVAN",
    plate: "SEED-MINIVAN-1",
    payloadKg: 450,
    interiorLengthCm: 180,
    interiorWidthCm: 130,
    interiorHeightCm: 100,
    maxPalletCount: 0,
    baseFeeCents: 4000,
    perKmCents: 80,
    perKgCents: 5,
  },
  {
    vehicleClass: "PICKUP_TRUCK",
    plate: "SEED-PICKUP-1",
    payloadKg: 700,
    interiorLengthCm: 180,
    interiorWidthCm: 150,
    interiorHeightCm: 60,
    maxPalletCount: 1,
    baseFeeCents: 5000,
    perKmCents: 90,
    perKgCents: 6,
  },
  {
    vehicleClass: "CARGO_VAN",
    plate: "SEED-CARGOVAN-1",
    payloadKg: 1300,
    interiorLengthCm: 300,
    interiorWidthCm: 170,
    interiorHeightCm: 170,
    maxPalletCount: 2,
    baseFeeCents: 7000,
    perKmCents: 110,
    perKgCents: 8,
  },
  {
    vehicleClass: "SPRINTER_CLASS_VAN",
    plate: "SEED-SPRINTER-1",
    payloadKg: 1900,
    interiorLengthCm: 400,
    interiorWidthCm: 180,
    interiorHeightCm: 190,
    maxPalletCount: 4,
    baseFeeCents: 9000,
    perKmCents: 140,
    perKgCents: 10,
  },
];

async function main() {
  for (const v of VEHICLES) {
    const vehicle = await db.vehicle.upsert({
      where: { plate: v.plate },
      create: { plate: v.plate, vehicleClass: v.vehicleClass },
      update: { vehicleClass: v.vehicleClass },
    });

    await db.vehicleCapability.upsert({
      where: { vehicleClass: v.vehicleClass },
      create: {
        vehicleId: vehicle.id,
        vehicleClass: v.vehicleClass,
        payloadKg: v.payloadKg,
        interiorLengthCm: v.interiorLengthCm,
        interiorWidthCm: v.interiorWidthCm,
        interiorHeightCm: v.interiorHeightCm,
        maxPalletCount: v.maxPalletCount,
        needsReview: true,
        notes: "Placeholder fleet spec seeded at Phase 4 — review before go-live (§O).",
      },
      update: {
        payloadKg: v.payloadKg,
        interiorLengthCm: v.interiorLengthCm,
        interiorWidthCm: v.interiorWidthCm,
        interiorHeightCm: v.interiorHeightCm,
        maxPalletCount: v.maxPalletCount,
      },
    });

    const existingRule = await db.pricingRule.findFirst({
      where: { vehicleClass: v.vehicleClass, isActive: true },
    });
    if (!existingRule) {
      await db.pricingRule.create({
        data: {
          vehicleClass: v.vehicleClass,
          baseFeeCents: v.baseFeeCents,
          perKmCents: v.perKmCents,
          perKgCents: v.perKgCents,
          isActive: true,
        },
      });
    }

    console.log(`seeded ${v.vehicleClass}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
