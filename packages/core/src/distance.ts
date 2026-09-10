// Straight-line (haversine) distance between two US ZIP codes, using
// centroid coordinates from the US Census Bureau's 2023 Gazetteer file
// (public domain, data/zip-centroids.json — ~33.8k ZCTAs).
//
// This is a deliberate placeholder for real routing distance from a Maps
// provider (docs/PHASE-0-SPECIFICATION.md §M lists Google Maps/Mapbox as a
// candidate, not locked yet — confirmed with the owner to ship plain
// address fields + this estimate first, real provider integration later,
// additive not a rearchitecture). Two known limitations, stated plainly
// rather than hidden:
//   1. Straight-line distance, not road distance — typically an
//      undercount; callers that turn this into a price should apply a
//      road-distance multiplier rather than charge straight-line miles.
//   2. Static dataset snapshot (2023) — new ZIP codes created since then
//      resolve as "unknown" (see below), not silently wrong.
// A ZIP absent from the dataset returns `null` — callers must treat that
// as "cannot price with confidence" (§ Failure-Safe Principle:
// SPECIAL_REVIEW_REQUIRED), never fall back to a guessed distance.
import zipCentroids from "./data/zip-centroids.json" with { type: "json" };

const CENTROIDS = zipCentroids as unknown as Record<string, [number, number]>;

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMiles(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/// Normalizes a postal code to the 5-digit ZIP the centroid dataset is
/// keyed by (strips a trailing ZIP+4 suffix, e.g. "94103-1234" -> "94103").
export function normalizeZip(postalCode: string): string {
  return postalCode.trim().slice(0, 5);
}

export function getZipCentroid(postalCode: string): [number, number] | null {
  return CENTROIDS[normalizeZip(postalCode)] ?? null;
}

/// Returns null (not a guessed number) when either ZIP is outside the
/// dataset — callers must fail safe on that, not substitute a default.
export function estimateDistanceMiles(
  pickupPostalCode: string,
  deliveryPostalCode: string,
): number | null {
  const from = getZipCentroid(pickupPostalCode);
  const to = getZipCentroid(deliveryPostalCode);
  if (!from || !to) return null;
  return haversineMiles(from, to);
}
