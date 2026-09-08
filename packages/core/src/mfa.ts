// TOTP-based MFA, mandatory for DISPATCHER/BILLING/ADMIN/SUPER_ADMIN
// (docs/PHASE-0-SPECIFICATION.md §K). The TOTP secret is never stored in
// plaintext (§E — HIGHLY SENSITIVE): it's AES-256-GCM-encrypted with a key
// that lives only in the environment (MFA_ENCRYPTION_KEY), never in the
// database — so a DB dump alone can't recover a usable secret.
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { Secret, TOTP } from "otpauth";

const ISSUER = "Midway Mover";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const keyB64 = process.env["MFA_ENCRYPTION_KEY"];
  if (!keyB64) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is not set. Generate one with " +
        "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` " +
        "and set it in the environment — never commit it.",
    );
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

/// Generates a new random TOTP secret. Callers must show the resulting
/// enrollment URI to the user (as a QR code) and require one successful
/// `verifyTotpCode` before persisting `mfaEnabled: true` — never enable MFA
/// on the strength of "the secret was generated," only on proof the user
/// can actually produce a valid code with it.
export function generateTotpSecret(): Secret {
  return new Secret({ size: 20 });
}

export function buildEnrollmentUri(secret: Secret, accountEmail: string): string {
  const totp = new TOTP({
    issuer: ISSUER,
    label: accountEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return totp.toString();
}

export function verifyTotpCode(secretBase32: string, token: string): boolean {
  const delta = TOTP.validate({
    token,
    secret: Secret.fromBase32(secretBase32),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    window: 1, // tolerate ±1 step (±30s) of clock drift
  });
  return delta !== null;
}

export function encryptMfaSecret(secretBase32: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(secretBase32, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptMfaSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted MFA secret.");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
