// Server-side pricing (docs/PHASE-0-SPECIFICATION.md § Quote Security —
// "the server calculates price... never accept price from the frontend as
// authoritative"). Pure function — no DB access; the caller loads the
// active PricingRule for the matched vehicle class.
//
// KNOWN GAP, flagged rather than guessed: tax is hardcoded to zero here.
// Real transportation-service sales tax varies by state (some don't tax
// it at all) and needs either a tax-calculation API (e.g. Stripe Tax,
// TaxJar) or actual legal/accounting guidance on rates and taxability —
// not something to fabricate. The Quote/Invoice schema already has
// taxCents/taxJurisdiction fields ready for this to be filled in
// properly; until then every quote is subtotal-only and that must stay
// visible to the customer, not silently absorbed into "the price."
export interface PricingRuleInput {
  baseFeeCents: number;
  perKmCents: number;
  perKgCents: number;
}

export interface PriceBreakdown {
  baseFeeCents: number;
  distanceFeeCents: number;
  weightFeeCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

const MILES_TO_KM = 1.60934;
// Straight-line distance undercounts actual road distance — applied here
// so the quote isn't systematically low relative to what a driver
// actually drives. A round number, not a precisely researched constant;
// revisit once real routing distance (a Maps provider) replaces the
// straight-line estimate in distance.ts.
const ROAD_DISTANCE_MULTIPLIER = 1.3;

export function calculatePrice(
  rule: PricingRuleInput,
  { distanceMiles, weightKg }: { distanceMiles: number; weightKg: number },
): PriceBreakdown {
  const roadKm = distanceMiles * MILES_TO_KM * ROAD_DISTANCE_MULTIPLIER;
  const distanceFeeCents = Math.round(roadKm * rule.perKmCents);
  const weightFeeCents = Math.round(weightKg * rule.perKgCents);
  const subtotalCents = rule.baseFeeCents + distanceFeeCents + weightFeeCents;
  const taxCents = 0; // see file header — not yet implemented, deliberately

  return {
    baseFeeCents: rule.baseFeeCents,
    distanceFeeCents,
    weightFeeCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
