# Local Development Setup

## Database

Phase 1 needed a real Postgres to verify migrations against (not just a
schema that parses). This machine already had two **pre-existing**
PostgreSQL services running (`postgresql-x64-16` on port 5432,
`postgresql-x64-17` on port 5433) — those belong to something else on this
machine and were **not touched, not read from, and not connected to.**

Instead, a dedicated, isolated PostgreSQL 17 cluster was created for this
project alone:

| Setting | Value |
|---|---|
| Data directory | `%LOCALAPPDATA%\midwaymover\pgdata` (i.e. `C:\Users\<you>\AppData\Local\midwaymover\pgdata`) |
| Port | `5439` (distinct from the pre-existing 5432/5433 instances) |
| Superuser role | `midwaymover` |
| Password | generated randomly at setup, stored only in `packages/db/.env` (git-ignored, never committed) |
| Dev database | `midwaymover_dev` |
| Log file | `%LOCALAPPDATA%\midwaymover\pg.log` |

This cluster is **not** registered as a Windows service — it does not
auto-start on boot or run in the background when you're not using it.
Start/stop it explicitly:

```powershell
# Start
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\midwaymover\pgdata" -l "$env:LOCALAPPDATA\midwaymover\pg.log" -o "-p 5439" start

# Stop
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\midwaymover\pgdata" stop

# Status
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\midwaymover\pgdata" status
```

`packages/db/.env` holds the `DATABASE_URL` Prisma uses; copy
`packages/db/.env.example` if you ever need to recreate it.

**This is a local convenience only.** Staging and production use Supabase
(confirmed hosting choice, see `docs/PHASE-0-SPECIFICATION.md` §K/§M) — this
local cluster is never a deployment target and its credentials are not
reused anywhere else.

## App

```
npm install              # from repo root — installs all workspaces
npm run db:generate       # regenerates the Prisma client (git-ignored)
npm run dev                # starts apps/web on http://localhost:3000
```

`packages/db/generated/prisma` (the Prisma client) is git-ignored — it's
regenerated from `packages/db/prisma/schema.prisma` by `npm run db:generate`,
which also runs automatically as part of `npm run db:migrate`.

### Environment files (all git-ignored, copy the matching `.env.example`)

| File | Needed for |
|---|---|
| `packages/db/.env` | `DATABASE_URL` — used by `prisma migrate`/`generate` |
| `packages/core/.env` | `MFA_ENCRYPTION_KEY` — only needed to run `packages/core` scripts directly |
| `apps/web/.env` | `DATABASE_URL`, `MFA_ENCRYPTION_KEY`, `AUTH_SECRET` — Next.js only auto-loads env files from its own app root, not sibling packages, so these are duplicated here even though `packages/db`/`packages/core` also have their own copies |

Generate `MFA_ENCRYPTION_KEY` and `AUTH_SECRET` with:
```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Magic-link sign-in has no real email provider wired yet (spec §M) — in
development the link is printed to the `npm run dev` console instead of
emailed; production refuses to start without a real provider configured.

## Database commands (from repo root)

```
npm run db:migrate    # apply pending migrations to your local DB (prisma migrate dev)
npm run db:generate    # regenerate the Prisma client from schema.prisma
npm run db:studio      # open Prisma Studio (a local DB browser) against your local DB
npm run seed --workspace packages/db          # seed placeholder Vehicle/VehicleCapability/PricingRule rows — needed before /book will quote anything
npm run seed:staff --workspace packages/db    # local-only test ADMIN + DRIVER accounts, prints their passwords once — needed to sign in at /staff/login
```

See `docs/PHASE-0-SPECIFICATION.md` §L for the intended repo layout as more
workspaces (packages/core, apps/driver-pwa, …) come online.

## Production deployment (Vercel + Supabase)

The app is deployed from this repo's `main` branch via Vercel (connected
to `github.com/farooqumareng-alt/midwaymover`), using Supabase for
production Postgres.

**Required Vercel environment variables** (Project Settings → Environment
Variables — set for Production, and Preview too if preview deployments
should also work):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **pooled** connection string (Database Settings → Connection string → "Connection pooling", port 6543). Used by the deployed app at runtime (`packages/db/src/client.ts`). |
| `DIRECT_DATABASE_URL` | Supabase **direct** connection string (port 5432). Used only by `prisma migrate deploy` — see `packages/db/prisma7.config.ts` for why the app and the CLI deliberately use different connections. |
| `AUTH_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Never reuse the local dev value. |
| `MFA_ENCRYPTION_KEY` | Same generation command. Never reuse the local dev value — rotating it would make every enrolled staff account's stored TOTP secret unrecoverable, so treat it as a real secret from day one. |

**Applying migrations to Supabase** — not run automatically on every
Vercel build (a deliberate choice; auto-running `migrate deploy` on every
deploy is a real option to revisit, but wasn't chosen silently). Run
manually when there's a new migration to ship:

```
DIRECT_DATABASE_URL="<supabase direct connection string>" npm run migrate:deploy --workspace packages/db
```

(`prisma migrate deploy`, not `migrate dev` — `dev` can generate a new
migration or prompt interactively, neither of which belongs in a
production deploy.)
