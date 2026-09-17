#!/usr/bin/env node
// Safe wrapper around `prisma migrate deploy`, run as part of the
// production build (root package.json's "build" script / Vercel).
//
// Why a wrapper instead of calling `prisma migrate deploy` directly: this
// same build script also runs for any Vercel preview deployment, and
// DATABASE_URL/DIRECT_DATABASE_URL are deliberately scoped to the
// Production environment only (see docs/DEV-SETUP.md) — a preview build
// has neither set. `prisma migrate deploy` with no configured datasource
// URL fails hard, which would break every preview build. So: skip
// (exit 0, loud log line) when neither var is set; otherwise run the real
// migration and fail the build if it fails — once a DB connection *is*
// configured (local dev, or Vercel Production), a failed migration should
// fail the build. Mirrors prisma7.config.ts's own
// `DIRECT_DATABASE_URL ?? DATABASE_URL` fallback exactly, so "would this
// run migrate deploy" and "which URL would the CLI use" never disagree.
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

console.log("[migrate-deploy-safe] DB connection configured — running `prisma migrate deploy`.");
const result = spawnSync("npx prisma migrate deploy", { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
