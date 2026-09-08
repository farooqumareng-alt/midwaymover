# Midvan Movers — Working Rules

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
PostgreSQL · Stripe (payments) · Google Maps/Mapbox · S3-compatible private
object storage with signed URLs · reputable SMS/email providers.
Confirm exact providers with the project owner before wiring credentials —
see spec §O (Open Questions).

## Current phase
**Phase 0 — Product Specification.** No application code has been written yet.
See `docs/PHASE-0-SPECIFICATION.md`.
