// Prisma 7 removed schema-level `directUrl` entirely (confirmed against
// the CLI's own error message and https://pris.ly/d/config-datasource —
// "in favor of the `url` property", no replacement dual-URL mechanism).
//
// This datasource.url is used ONLY by the Prisma CLI (migrate, generate,
// studio) — never by the running app, which builds its own client from
// DATABASE_URL in src/client.ts, completely independently of this file.
// That split is deliberate and load-bearing for Supabase (or any
// PgBouncer-fronted Postgres): migrations need an UNPOOLED connection
// (session-level features `prisma migrate` relies on aren't available
// through a transaction-mode pooler), while the deployed app should use
// the POOLED connection to avoid exhausting Postgres connections under
// serverless concurrency. Hence two distinctly-named env vars:
//   - DIRECT_DATABASE_URL — used here, by the CLI only. Supabase's
//     "Direct connection" string (port 5432).
//   - DATABASE_URL — used by src/client.ts, i.e. the actual app.
//     Supabase's "Connection pooling" string (port 6543, pgbouncer).
// Locally there's no pooler, so both point at the same local Postgres.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
