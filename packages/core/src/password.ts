// Password hashing for the DRIVER/DISPATCHER/BILLING/ADMIN/SUPER_ADMIN
// credentials flow (docs/PHASE-0-SPECIFICATION.md §K — CUSTOMER/
// CUSTOMER_MANAGER use passwordless magic link and never call this).
//
// Argon2id via a prebuilt native binary (@node-rs/argon2 — napi-rs, no
// build toolchain required), per OWASP's current password-hashing
// recommendation. Never bcrypt/plain-SHA for new code.
import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2's `Algorithm` is a `const enum`, which TypeScript can't
// import under `isolatedModules` (needed for per-file transpilation, e.g.
// SWC/Next.js's compiler). `2` is Algorithm.Argon2id — the OWASP-
// recommended default, also this package's own default if omitted; passed
// explicitly here so the choice is visible in code, not implicit.
const ARGON2ID = 2;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // 19 MiB, OWASP-recommended minimum
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/// Returns false for any mismatch OR malformed hash — never throws for a
/// bad password (fail closed, not fail with a 500 that could leak timing
/// info about *why* it failed).
export async function verifyPassword(
  storedHash: string,
  candidate: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, candidate, OPTIONS);
  } catch {
    return false;
  }
}
