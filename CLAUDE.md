# Midway Mover — Working Rules

Private, dedicated small/mid-load transportation platform (packages, 1–4 pallets,
equipment) run in minivans, pickups, cargo vans, and sprinter-class vans. Value
prop: **Private. Dedicated. Direct. Secure. Confidential.**

Full build instructions (security baseline, phase order, acceptance criteria,
stop conditions) live in the original CLAUDE MASTER BUILD INSTRUCTIONS given by
the project owner — treat every rule in that document as still in force. This
file is the quick-reference; `docs/PHASE-0-SPECIFICATION.md` is the source of
truth for product/architecture decisions.

## Non-negotiables (see docs/PHASE-0-SPECIFICATION.md for detail)
- Work phase-by-phase (Phase 0 → 18, see spec §Q). Do not skip ahead for
  visual impact. One logical feature per change.
- Zero-assumption rule: every authorization check, ownership check, and
  state transition is verified **server-side**, never trusted from the client.
- Fail closed: unclear authorization, unverifiable payment, unverifiable
  webhook signature, unverifiable delivery/pickup identity → deny/hold, never
  guess yes.
- No placeholder completion: a feature is done only when the full vertical
  slice (DB + server authz + API + UI + error/loading states + tests) works.
- Before coding: state what exists, what changes, files touched, DB impact,
  security impact, regression risk, test strategy. After coding: report files
  changed, controls added, tests run and their actual results (typecheck/
  lint/build/tests). Never claim an unexecuted test passed — say `NOT VERIFIED`.
- Stop and surface the problem (don't work around it) on: failing build/
  typecheck, unsafe migration, unclear auth/authz requirements, a test that
  exposes a real security flaw, or a missing required credential.

## Stack (see spec §A, §K, §L, §M for rationale)
Next.js + React + TypeScript (strict) · Node/TS service layer ·
PostgreSQL via Prisma 7 + `@prisma/adapter-pg` (`packages/db`) ·
Auth.js/NextAuth · Stripe (payments) · Google Maps/Mapbox · S3-compatible
private object storage with signed URLs · reputable SMS/email providers.
Maps/SMS/email/storage providers are still candidates, not locked — confirm
with the project owner before wiring credentials (spec §M).

## Current phase
**Phase 3 — Authentication & authorization — core done.** Phase 1 (DB
schema) and Phase 3 are complete; Phase 2 (design system) was skipped for
now (no UI screens exist yet to need it) and can slot in before Phase 4.

Auth: Auth.js v5 (beta — the only version supporting the App Router
natively) with database sessions (server-revocable). CUSTOMER/
CUSTOMER_MANAGER sign in via magic link (`apps/web/src/auth.ts`); DRIVER/
DISPATCHER/BILLING/ADMIN/SUPER_ADMIN via password
(`apps/web/src/lib/staff-auth.ts`), with mandatory TOTP MFA for the latter
four roles (`apps/web/src/lib/mfa-enrollment.ts`). `packages/core` holds
the reusable password/MFA/rate-limit primitives and the central
authorization policy (`policy.ts`) every API route should call into.
`apps/web/src/lib/actor.ts`'s `getActor()` is the one authoritative way to
get the current caller's identity server-side — never trust a
client-supplied id.

Real HTTP round-trip tested against a running dev server (not just
typechecked): staff login with/without MFA, MFA enrollment, rate limiting
(confirmed blocking after the configured attempt count), server-side
session revocation (deleting the DB row instantly invalidates a live
cookie), disabled-account rejection, and the full magic-link flow
(auto-creates a CUSTOMER-role user, single-use token, session issued).

See `docs/PHASE-0-SPECIFICATION.md` and `docs/DEV-SETUP.md`. Phase 4
(customer booking) is next.
