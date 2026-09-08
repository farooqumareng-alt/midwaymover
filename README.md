# Midway Mover

Private, dedicated small/mid-load transportation platform — packages,
1–4 pallets, and equipment moved in a dedicated vehicle (minivan, pickup,
cargo van, or sprinter-class van). Private. Dedicated. Direct. Secure.
Confidential.

Phase 0 (product specification) and Phase 1 (database schema/migrations)
are done. Start here:

- [`docs/PHASE-0-SPECIFICATION.md`](docs/PHASE-0-SPECIFICATION.md) — product
  architecture, roles, permission matrix, shipment state machine, data
  classification, threat model, entities, workflows, security architecture,
  repo structure, integrations, testing strategy, and the phase-by-phase plan.
- [`docs/DEV-SETUP.md`](docs/DEV-SETUP.md) — how to run the app and the
  local database.
- [`CLAUDE.md`](CLAUDE.md) — working rules for anyone (human or AI) building
  this codebase.

## Layout

```
apps/web/       Next.js app (public site + customer app for now)
packages/db/     Prisma schema, migrations, and the DB client
```

## Getting started

```
npm install
npm run db:generate   # generates the Prisma client (git-ignored, regenerate after clone)
npm run dev            # http://localhost:3000
```

See `docs/DEV-SETUP.md` for the local database setup.
