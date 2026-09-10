// Server-side vehicle matching (docs/PHASE-0-SPECIFICATION.md §H —
// "Customer generally should NOT manually select vehicles" /
// "Never exceed manufacturer or fleet-defined vehicle payload/capability
// rules" / "If uncertain: SPECIAL REVIEW REQUIRED. Fail safely.").
//
// Pure function — no DB access here. Callers load the fleet's
// VehicleCapability rows (only the ones with needsReview: false are
// eligible to confirm a live booking, per §O/§G's placeholder-fleet-data
// gate — see booking.ts for where that's enforced) and pass them in.
import type { VehicleClass } from "@midwaymover/db";

export interface CargoRequirements {
  approxWeightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  palletCount: number | null;
}

export interface VehicleCandidate {
  vehicleClass: VehicleClass;
  payloadKg: number;
  interiorLengthCm: number;
  interiorWidthCm: number;
  interiorHeightCm: number;
  maxPalletCount: number;
  needsReview: boolean;
}

export type VehicleMatchResult =
  | { status: "matched"; vehicleClass: VehicleClass; needsReview: boolean }
  | { status: "specialReviewRequired"; reason: string };

/// Picks the smallest (by payload) vehicle that can actually carry the
/// cargo. No rotation logic — a cargo item longer than a candidate's
/// interior length is rejected even if it would fit diagonally or on its
/// side; that's a deliberate simplification for MVP (flagged, not
/// silently assumed away) that only ever makes matching MORE conservative,
/// never less — it can reject a vehicle that would actually work, but
/// never accepts one that won't.
export function matchVehicle(
  cargo: CargoRequirements,
  candidates: readonly VehicleCandidate[],
): VehicleMatchResult {
  if (cargo.approxWeightKg <= 0) {
    return { status: "specialReviewRequired", reason: "Invalid weight." };
  }

  const eligible = candidates.filter((v) => {
    if (v.payloadKg < cargo.approxWeightKg) return false;
    if (cargo.palletCount !== null && v.maxPalletCount < cargo.palletCount) {
      return false;
    }
    if (cargo.lengthCm !== null && v.interiorLengthCm < cargo.lengthCm) {
      return false;
    }
    if (cargo.widthCm !== null && v.interiorWidthCm < cargo.widthCm) {
      return false;
    }
    if (cargo.heightCm !== null && v.interiorHeightCm < cargo.heightCm) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return {
      status: "specialReviewRequired",
      reason: "No fleet vehicle meets the cargo requirements.",
    };
  }

  eligible.sort((a, b) => a.payloadKg - b.payloadKg);
  const best = eligible[0]!;

  return {
    status: "matched",
    vehicleClass: best.vehicleClass,
    needsReview: best.needsReview,
  };
}
