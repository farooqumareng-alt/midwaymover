#!/usr/bin/env node
// Safe wrapper around `prisma migrate deploy`, run as part of the
// production build (root package.json's "build" script / Vercel).
//
// Behavior:
// - No DB URL configured -> skip (exit 0). Expected for preview builds
//   (DATABASE_URL/DIRECT_DATABASE_URL are scoped to Production only).
// - DB URL configured but the server is unreachable (Prisma P1001) ->
//   retry a few times (covers a database that is still waking up, e.g. a
//   just-resumed Supabase project), then skip with a loud warning and
//   exit 0. A site build must never die just because the database is
//   napping; pending migrations can be applied manually once it's back.
// - Any other migration failure -> fail the build (exit non-zero), as
//   before. Once a DB *is* reachable, a failed migration is a real
//   problem and should stay loud.
import "dotenv/config";
import { spawnSync } from "node:child_process";

const hasDb = Boolean(process.env["DIRECT_DATABASE_URL"] || process.env["DATABASE_URL"]);

if (!hasDb) {
  console.log(
    "[migrate-deploy-safe] Neither DIRECT_DATABASE_URL nor DATABASE_URL is set — " +
      "skipping `prisma migrate deploy` (expected for a build with no DB configured, " +
      "e.g. a Vercel preview deployment).",
  );
  process.exit(0);
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 20000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastOutput = "";
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(
    `[migrate-deploy-safe] DB connection configured — running \`prisma migrate deploy\` (attempt ${attempt}/${MAX_ATTEMPTS}).`,
  );
  const result = spawnSync("npx prisma migrate deploy", { shell: true, encoding: "utf8" });
  lastOutput = `${result.stdout || ""}${result.stderr || ""}`;
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if ((result.status ?? 1) === 0) {
    console.log("[migrate-deploy-safe] Migrations applied successfully.");
    process.exit(0);
  }
  if (!lastOutput.includes("P1001")) {
    console.error(
      "[migrate-deploy-safe] Migration failed for a reason other than an unreachable " +
        "database — failing the build so this stays visible.",
    );
    process.exit(result.status ?? 1);
  }
  if (attempt < MAX_ATTEMPTS) {
    console.log(
      `[migrate-deploy-safe] Database unreachable (P1001) — retrying in ${RETRY_DELAY_MS / 1000}s; it may still be waking up.`,
    );
    await sleep(RETRY_DELAY_MS);
  }
}

console.warn(
  "[migrate-deploy-safe] WARNING: database still unreachable after " +
    `${MAX_ATTEMPTS} attempts (P1001). Skipping migrations so the build can proceed. ` +
    "If you have pending schema migrations, apply them manually once the database is back: `npx prisma migrate deploy`.",
);
process.exit(0);
