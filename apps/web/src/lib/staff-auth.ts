// Password + TOTP MFA sign-in for DRIVER/DISPATCHER/BILLING/ADMIN/
// SUPER_ADMIN (docs/PHASE-0-SPECIFICATION.md §K). Deliberately NOT built on
// Auth.js's Credentials provider — Auth.js's own source
// (packages/core/src/lib/actions/callback/index.ts) only wires Credentials
// sign-in to JWT sessions, never to adapter.createSession(), even when
// session.strategy is "database" and other providers are present. Since a
// server-revocable database session is a hard requirement here (§
// Authentication), this creates the Session row directly via
// src/lib/session.ts using the exact cookie auth.ts also uses, instead of
// relying on a code path that silently wouldn't produce one.
import { db } from "@midwaymover/db";
import {
  verifyPassword,
  decryptMfaSecret,
  verifyTotpCode,
  checkRateLimit,
  PASSWORD_AUTH_ROLES,
  MFA_REQUIRED_ROLES,
} from "@midwaymover/core";
import { createServerSession } from "./session.ts";

export type StaffLoginResult =
  | { status: "success" }
  | { status: "mfaSetupRequired" }
  | { status: "mfaCodeRequired" }
  | { status: "invalidCredentials" }
  | { status: "rateLimited"; resetsInSeconds: number };

// Precomputed Argon2id hash of a fixed dummy password. Verified against on
// every "no such user" / wrong-role / disabled-account path so that path
// takes roughly the same time as a real wrong-password check — otherwise
// the *absence* of an Argon2 computation would let a caller distinguish
// "no such account" from "account exists, wrong password" purely by
// response latency (a username-enumeration side channel).
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$WoIJpa/+FescnTn94ctV8A$QLD2dth7trT04NcsQ2DuU81T92oX0EVTkhyWqV7pneI";

export async function staffLogin({
  email,
  password,
  totpCode,
  ip,
}: {
  email: string;
  password: string;
  totpCode?: string;
  ip: string;
}): Promise<StaffLoginResult> {
  // Normalized for lookup; see note in the schema about normalizing at
  // account-creation time once Phase 8 admin user-provisioning exists.
  const normalizedEmail = email.trim().toLowerCase();

  const emailBucket = await checkRateLimit(`staff-login:${normalizedEmail}`, {
    limit: 10,
    windowSeconds: 15 * 60,
  });
  const ipBucket = await checkRateLimit(`staff-login-ip:${ip}`, {
    limit: 30,
    windowSeconds: 15 * 60,
  });
  if (!emailBucket.allowed || !ipBucket.allowed) {
    return {
      status: "rateLimited",
      resetsInSeconds: Math.max(emailBucket.resetsInSeconds, ipBucket.resetsInSeconds),
    };
  }

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (
    !user ||
    !user.passwordHash ||
    !PASSWORD_AUTH_ROLES.includes(user.role) ||
    user.disabledAt
  ) {
    await verifyPassword(DUMMY_HASH, password); // timing-safety padding, see DUMMY_HASH comment
    return { status: "invalidCredentials" };
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);
  if (!passwordOk) {
    return { status: "invalidCredentials" };
  }

  const mfaRequired = MFA_REQUIRED_ROLES.includes(user.role);
  if (!mfaRequired) {
    await createServerSession(user.id, { mfaVerified: false });
    return { status: "success" };
  }

  if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
    // Password is correct, but this MFA-required role hasn't enrolled yet.
    // No session is issued — the enrollment endpoints (mfa/enroll,
    // mfa/confirm) independently re-verify the password before doing
    // anything, so this response alone grants no access.
    return { status: "mfaSetupRequired" };
  }

  if (!totpCode) {
    return { status: "mfaCodeRequired" };
  }

  const mfaBucket = await checkRateLimit(`staff-mfa:${user.id}`, {
    limit: 5,
    windowSeconds: 5 * 60,
  });
  if (!mfaBucket.allowed) {
    return { status: "rateLimited", resetsInSeconds: mfaBucket.resetsInSeconds };
  }

  const secret = decryptMfaSecret(user.mfaSecretEncrypted);
  if (!verifyTotpCode(secret, totpCode)) {
    return { status: "invalidCredentials" };
  }

  await createServerSession(user.id, { mfaVerified: true });
  return { status: "success" };
}
