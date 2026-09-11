// One-time PIN codes for pickup/delivery verification (docs/PHASE-0-
// SPECIFICATION.md § Pickup / § Delivery — "short-lived, single-use,
// rate-limited, hashed/stored securely... never logged"). Reuses the
// existing Argon2id primitives from password.ts rather than adding a
// second hashing scheme — the raw code is never stored, only its hash,
// same as a password.
import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./password.ts";

export function generateNumericCode(digits = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return String(randomInt(min, max + 1));
}

export async function hashVerificationCode(code: string): Promise<string> {
  return hashPassword(code);
}

export async function verifyVerificationCode(
  codeHash: string,
  candidate: string,
): Promise<boolean> {
  return verifyPassword(codeHash, candidate);
}
