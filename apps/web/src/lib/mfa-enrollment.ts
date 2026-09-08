// Self-service TOTP enrollment for DISPATCHER/BILLING/ADMIN/SUPER_ADMIN
// (docs/PHASE-0-SPECIFICATION.md §K). Scope of what's built here: only
// FIRST-TIME enrollment (mfaEnabled currently false). Replacing a lost MFA
// device for an account that already has MFA enabled is deliberately NOT
// self-service on password alone — that needs an admin-assisted reset
// (Phase 8 dispatch/admin tooling), so a stolen password alone can't be
// used to silently swap in an attacker's own authenticator and lock out
// the real user. Attempting to re-enroll an already-enrolled account is
// rejected here, not silently allowed.
import { db } from "@midwaymover/db";
import {
  verifyPassword,
  generateTotpSecret,
  buildEnrollmentUri,
  encryptMfaSecret,
  decryptMfaSecret,
  verifyTotpCode,
  checkRateLimit,
  MFA_REQUIRED_ROLES,
} from "@midwaymover/core";

async function verifyEligibleAccount(
  email: string,
  password: string,
): Promise<
  | { ok: true; userId: string; mfaEnabled: boolean; mfaSecretEncrypted: string | null }
  | { ok: false }
> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (
    !user ||
    !user.passwordHash ||
    user.disabledAt ||
    !MFA_REQUIRED_ROLES.includes(user.role)
  ) {
    return { ok: false };
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    return { ok: false };
  }
  return {
    ok: true,
    userId: user.id,
    mfaEnabled: user.mfaEnabled,
    mfaSecretEncrypted: user.mfaSecretEncrypted,
  };
}

export type EnrollResult =
  | { status: "success"; enrollmentUri: string }
  | { status: "alreadyEnrolled" }
  | { status: "invalidCredentials" }
  | { status: "rateLimited"; resetsInSeconds: number };

export async function beginMfaEnrollment({
  email,
  password,
  ip,
}: {
  email: string;
  password: string;
  ip: string;
}): Promise<EnrollResult> {
  const bucket = await checkRateLimit(`mfa-enroll:${email.trim().toLowerCase()}:${ip}`, {
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!bucket.allowed) {
    return { status: "rateLimited", resetsInSeconds: bucket.resetsInSeconds };
  }

  const account = await verifyEligibleAccount(email, password);
  if (!account.ok) return { status: "invalidCredentials" };
  if (account.mfaEnabled) return { status: "alreadyEnrolled" };

  const secret = generateTotpSecret();
  const enrollmentUri = buildEnrollmentUri(secret, email.trim().toLowerCase());

  // Persisted immediately but mfaEnabled stays false until `confirmMfaEnrollment`
  // proves the user can actually produce a valid code — see mfa.ts's
  // generateTotpSecret comment.
  await db.user.update({
    where: { id: account.userId },
    data: { mfaSecretEncrypted: encryptMfaSecret(secret.base32) },
  });

  return { status: "success", enrollmentUri };
}

export type ConfirmResult =
  | { status: "success" }
  | { status: "alreadyEnrolled" }
  | { status: "notEnrolling" }
  | { status: "invalidCredentials" }
  | { status: "rateLimited"; resetsInSeconds: number };

export async function confirmMfaEnrollment({
  email,
  password,
  totpCode,
  ip,
}: {
  email: string;
  password: string;
  totpCode: string;
  ip: string;
}): Promise<ConfirmResult> {
  const bucket = await checkRateLimit(`mfa-confirm:${email.trim().toLowerCase()}:${ip}`, {
    limit: 10,
    windowSeconds: 15 * 60,
  });
  if (!bucket.allowed) {
    return { status: "rateLimited", resetsInSeconds: bucket.resetsInSeconds };
  }

  const account = await verifyEligibleAccount(email, password);
  if (!account.ok) return { status: "invalidCredentials" };
  if (account.mfaEnabled) return { status: "alreadyEnrolled" };
  if (!account.mfaSecretEncrypted) return { status: "notEnrolling" };

  const secret = decryptMfaSecret(account.mfaSecretEncrypted);
  if (!verifyTotpCode(secret, totpCode)) {
    return { status: "invalidCredentials" };
  }

  await db.user.update({
    where: { id: account.userId },
    data: { mfaEnabled: true },
  });

  return { status: "success" };
}
