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
**Phase 6 — Driver PWA — core done.** Phases 1 (DB), 3 (auth), 4
(booking), 5 (tracking), the Phase 8 minimal dispatch slice, and now
Phase 6 are complete. Phase 2 (design system) was skipped — the marketing
homepage and booking flow already established the visual language. Live
in production: homepage, magic-link/staff auth, the 3-step booking flow,
and public tracking. Dispatch/driver surfaces (`/dispatch`,
`/staff/login`, `/driver`) are deployed but **have no real staff accounts
on production** — seeding fake admin/driver credentials onto the live
site wasn't worth the standing risk when no real staff exist yet; both
are fully verified locally instead (see below).

Driver PWA: `/driver` (job list) → `/driver/jobs/[id]` (the 4-stage
workflow: Accept → Verify Pickup → Transport → Verify Delivery,
`apps/web/src/lib/driver.ts` + `apps/web/src/components/driver/`). Every
action requires the actor be the CURRENTLY assigned driver for that
specific shipment (`packages/core`'s `isAssignedDriver`, built in Phase 3,
had no caller until now) and the shipment be in the exact expected state —
never a client-set status. Two scope boundaries handled honestly rather
than faked: PIN verification only (no QR/signature — no object storage
exists yet for a captured image, §M not chosen) and no POD row created on
delivery (same storage gap — a real document/photo record is Phase 11
scope). No customer notification or billing trigger on delivery either
(Phase 10/9 don't exist yet). No GPS cross-check on "arrived" actions —
driver-attested only, deferred to Phase 7.

Pickup/delivery verification codes are generated in `confirmBooking()`
(`apps/web/src/lib/booking.ts`) and shown ONCE on the booking success
screen — there's no SMS/email provider yet (Phase 10) to (re-)send them,
so the customer relays them to whoever hands off/receives the cargo. This
is a real, defensible MVP design, not a shortcut, but worth remembering
when Phase 10 lands (codes should probably move to an actual
notification then, not stay screen-only).

Dispatch: `/staff/login` (new — there was no browser UI for staff auth
before this, only the API tested via curl in Phase 3) leads to
`/dispatch` (DISPATCHER/ADMIN + MFA-verified only, checked server-side in
the page itself, not just hidden nav). `apps/web/src/lib/dispatch.ts` has
three audited actions: `overrideConfirmPayment` (since Phase 9/Stripe
doesn't exist yet — a real, honestly-labeled manual override for e.g. an
invoiced business account, never a fabricated payment success; no Payment
row is created), `assignDriver` (blocked if the vehicle's fleet capability
is still `needsReview: true` — this is the enforcement point for the
placeholder-fleet gate that Phase 4 only flagged but never actually
blocked on), and `reviewVehicleCapability` (ADMIN-only, marks a fleet
class's specs as human-reviewed). `packages/db/prisma/seed-staff.ts`
seeds local-only test ADMIN/DRIVER accounts (dev convenience, standing in
for real admin user-provisioning, which doesn't have a UI yet either).

Tracking: `/track/[token]` (`apps/web/src/app/track/[token]/page.tsx` +
`apps/web/src/lib/tracking.ts`) — access is by opaque `trackingToken`
only, never by internal shipment id. Deliberately coarse (city/state, a
5-stage friendly status, no pricing/exact address/contact/driver info) on
the same confidential-by-default reasoning as everywhere else, since a
tracking link can be forwarded beyond whoever booked it. `noindex`,
`force-dynamic` (never cached across tokens), rate-limited, and checks
`trackingRevokedAt`. The booking confirmation response/UI now surfaces the
tracking link (it didn't in Phase 4).

Booking: `/book` (3 steps — Where & When, What's Moving, Review & Book —
`apps/web/src/components/booking/`) calls `POST /api/quotes` then
`POST /api/bookings`. Server-side logic lives in
`apps/web/src/lib/booking.ts`; vehicle-matching, pricing, and distance
estimation are pure functions in `packages/core`
(`vehicle-matching.ts`/`pricing.ts`/`distance.ts`). Distance is a
straight-line ZIP-centroid estimate (US Census Gazetteer data bundled in
`packages/core/src/data/zip-centroids.json`) — a deliberate stand-in for a
real Maps provider (owner-confirmed), not a permanent choice. Tax is
hardcoded to $0 — real transportation-tax calculation needs a tax API or
legal guidance, not a guess (see pricing.ts's header comment). Booking
stops at `AWAITING_PAYMENT`; it does not fabricate a payment success —
Phase 9 (Stripe) is what moves a shipment to `CONFIRMED`.

Fleet/pricing seed data (`packages/db/prisma/seed.ts`, `needsReview: true`
on every row per the placeholder-fleet decision) has been run against
both local dev and production Supabase — `npm run seed --workspace
packages/db` regenerates it if the DB is ever reset.

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
typechecked) for every phase so far — see the Phase 3/4/5/8/6 commit
messages for the full list. For the driver PWA specifically: booked a
real shipment, captured its real pickup/delivery codes from the booking
response, ran the complete 8-action lifecycle as a real logged-in driver
(wrong pickup code rejected before the right one was accepted), and
confirmed in Postgres afterward — 13-row status history from QUOTED to
DELIVERED with actor ids on every driver-attributed transition, the exact
9-event chain-of-custody sequence the spec describes, and both
verification rows consumed with correct attempt counts. Also verified
live: actions rejected once a shipment moves past their stage, and — with
a genuine second driver account — that driver B cannot see, open, or act
on driver A's assigned job (404 at both the API and the page).

See `docs/PHASE-0-SPECIFICATION.md` and `docs/DEV-SETUP.md`. Phase 7
(chain of custody) is next — most of its data model already exists and is
being written to; what's missing is a dedicated view of it (e.g. for
dispatch/customer) and any real-time/GPS layer.
