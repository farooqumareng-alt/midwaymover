// Centralized authorization policy (docs/PHASE-0-SPECIFICATION.md §C).
// Every API route calls into this module rather than re-implementing its
// own role/ownership check — the whole point of "centralize... permissions"
// (master build instructions § Code Quality).
//
// These are pure functions over an already-authenticated `Actor` and
// already-loaded resource data. They never accept a client-supplied
// organizationId/customerId/driverId as authoritative — the caller is
// responsible for deriving `Actor` from the server-side session (Phase 3's
// auth.ts) and loading the resource from the database before calling in
// here. This module only decides "is this combination allowed," never
// "trust what the request claims."
//
// NOTE — scope of this module as of Phase 3: only the two ownership
// predicates that are actually load-bearing right now (Shipment ownership,
// driver assignment) are implemented. §C describes several more
// resource/action pairs (Vehicle management, Pricing rules, Audit Log,
// Refunds, ...); those get their policy functions added alongside the API
// routes that need them (Phase 4+), not speculatively built now with no
// caller to verify them against.
import type { UserRole } from "@midwaymover/db";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not permitted.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/// Roles that MUST complete TOTP MFA before a session is treated as fully
/// authenticated for any authorization decision (§K). DRIVER is
/// deliberately excluded — see docs/PHASE-0-SPECIFICATION.md §K.
export const MFA_REQUIRED_ROLES: readonly UserRole[] = [
  "DISPATCHER",
  "BILLING",
  "ADMIN",
  "SUPER_ADMIN",
];

/// Roles that sign in via passwordless magic link (apps/web/src/auth.ts).
/// Every other role uses password + (for MFA_REQUIRED_ROLES) TOTP via
/// apps/web/src/app/api/auth/staff-login.
export const MAGIC_LINK_ROLES: readonly UserRole[] = [
  "CUSTOMER",
  "CUSTOMER_MANAGER",
];

/// The complement of MAGIC_LINK_ROLES — kept as an explicit list (not
/// computed) so both lists are equally easy to audit at a glance.
export const PASSWORD_AUTH_ROLES: readonly UserRole[] = [
  "DRIVER",
  "DISPATCHER",
  "BILLING",
  "ADMIN",
  "SUPER_ADMIN",
];

/// The server-derived identity for the current request. Constructed once
/// per request from the authenticated session (never from request body/
/// query/path) in apps/web's auth integration.
export interface Actor {
  userId: string;
  role: UserRole;
  organizationId: string | null;
  customerProfileId: string | null;
  driverProfileId: string | null;
  /// True only if this specific session already completed a TOTP
  /// challenge. A user having `mfaEnabled` on their account is not enough
  /// by itself — the session must have actually verified a code.
  mfaVerified: boolean;
  disabled: boolean;
}

/// Fail closed: no actor, or a disabled account, is never authorized for
/// anything, regardless of what role it claims.
export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw new UnauthorizedError();
  if (actor.disabled) throw new ForbiddenError("Account disabled.");
  return actor;
}

export function requireMfaIfNeeded(actor: Actor): void {
  if (MFA_REQUIRED_ROLES.includes(actor.role) && !actor.mfaVerified) {
    throw new ForbiddenError("MFA verification required for this role.");
  }
}

export function requireRole(actor: Actor, allowed: readonly UserRole[]): void {
  if (!allowed.includes(actor.role)) {
    throw new ForbiddenError(
      `Role ${actor.role} is not permitted to perform this action.`,
    );
  }
}

/// §C: "Shipment | View | Customer | shipment.organizationId ==
/// user.organizationId (or customerId == user.id for individual accounts)".
export function ownsShipment(
  actor: Actor,
  shipment: { organizationId: string | null; customerId: string | null },
): boolean {
  if (actor.organizationId && shipment.organizationId === actor.organizationId) {
    return true;
  }
  if (
    actor.customerProfileId &&
    shipment.customerId === actor.customerProfileId
  ) {
    return true;
  }
  return false;
}

/// §C: "Shipment | View/Update status | Driver |
/// shipment.assignedDriverId == user.driverId". Our schema models
/// assignment as a row (ShipmentAssignment), not a column on Shipment, so
/// "currently assigned" means an assignment row for this driver with
/// unassignedAt still null.
export function isAssignedDriver(
  actor: Actor,
  assignment: { driverId: string; unassignedAt: Date | null },
): boolean {
  return (
    actor.driverProfileId !== null &&
    assignment.driverId === actor.driverProfileId &&
    assignment.unassignedAt === null
  );
}
