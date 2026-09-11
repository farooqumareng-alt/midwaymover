// Seeds test staff accounts for local/dev use only — this is standing in
// for the real admin user-provisioning flow (Phase 8/dispatch tooling
// doesn't have a "create staff account" UI yet; that's real, deferred
// scope, not a shortcut around anything security-relevant here). Prints
// the generated password once; never logs it anywhere else.
//
// Usage: npm run seed:staff --workspace packages/db
import { randomBytes } from "node:crypto";
import { db } from "../src/client.ts";
import { hashPassword } from "../../core/src/password.ts";

interface StaffSeed {
  email: string;
  role: "ADMIN" | "DISPATCHER" | "DRIVER";
  name: string;
  licenseNumber?: string;
}

const STAFF: StaffSeed[] = [
  { email: "admin@midwaymover.internal", role: "ADMIN", name: "Test Admin" },
  { email: "driver1@midwaymover.internal", role: "DRIVER", name: "Test Driver", licenseNumber: "SEED-DL-0001" },
];

async function main() {
  for (const s of STAFF) {
    const existing = await db.user.findUnique({ where: { email: s.email } });
    if (existing) {
      console.log(`${s.email} already exists, skipping`);
      continue;
    }

    const password = randomBytes(9).toString("base64url");
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: { email: s.email, name: s.name, role: s.role, passwordHash },
    });

    if (s.role === "DRIVER") {
      await db.driverProfile.create({
        data: { userId: user.id, licenseNumber: s.licenseNumber ?? "UNKNOWN" },
      });
    }

    console.log(`created ${s.role} ${s.email} — password: ${password}`);
    if (s.role === "ADMIN" || s.role === "DISPATCHER") {
      console.log(`  (MFA required on first login — the sign-in page will walk through enrollment)`);
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
