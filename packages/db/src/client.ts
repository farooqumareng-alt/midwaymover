// Configured Prisma client singleton, using the `pg` driver adapter that
// Prisma 7 requires explicitly (no more implicit connection from
// DATABASE_URL alone). This is the one place a PrismaClient gets
// constructed — every consumer imports `db` from here rather than calling
// `new PrismaClient()` itself, so there's exactly one connection pool and
// one place to change adapter/connection config later (e.g. Neon's pooled
// connection string in production).
//
// The globalThis-cache pattern below avoids exhausting the connection pool
// under Next.js dev-mode hot reload, which would otherwise construct a new
// PrismaClient (and a new pool) on every file save.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy packages/db/.env.example to packages/db/.env " +
      "(see docs/DEV-SETUP.md) or set it in the deployment environment.",
  );
}

const adapter = new PrismaPg({ connectionString });

declare global {
  // eslint-disable-next-line no-var
  var __midwaymoverPrisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.__midwaymoverPrisma ?? new PrismaClient({ adapter });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__midwaymoverPrisma = db;
}
