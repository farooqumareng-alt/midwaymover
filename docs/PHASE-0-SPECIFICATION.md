# Phase 0 — Product Specification

Status: DRAFT — core architecture decisions confirmed (see §O); remaining
open questions (region/compliance, fleet data, confidentiality tier, domain,
budget/timeline) still need owner input before Phase 1 fully locks.
Repository state at time of writing: empty (greenfield). No application code exists yet.

**Confirmed decisions (2026-09-08):**
- Brand/operating name: **Midway Movers** (previously drafted as "Midvan
  Movers" — corrected). Production domain: **midwaymover.com** (owner-owned).
- Business accounts (multi-user `Organization` + `CUSTOMER_MANAGER`) are
  **in scope for MVP**, not deferred — this changes §P from the earlier draft.
- Auth: **self-hosted Auth.js/NextAuth on our own Postgres**, custom TOTP MFA
  for staff/admin.
- Payments: **Stripe**.
- Hosting: **Vercel + managed Postgres (Neon)**.

---

## A. Product Architecture

Four surfaces, one backend, one database, one source of truth for authorization.

```
                        ┌─────────────────────────┐
                        │   PostgreSQL (primary)   │
                        │  + object storage (docs/ │
                        │    photos, private)      │
                        └─────────────▲─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │   Service / API layer      │
                        │  (server-side TS, owns all │
                        │   authz, pricing, state    │
                        │   machine, integrations)   │
                        └───┬───────┬───────┬───────┘
                            │       │       │
      ┌─────────────────┐  │       │       │  ┌──────────────────────┐
      │ Public Website   │◄─┘       │       └─►│ Dispatch / Admin      │
      │ (marketing, quote)│         │          │ Command Center        │
      └─────────────────┘          │          └──────────────────────┘
                            ┌───────┴────────┐
                  ┌─────────► Customer App    │      ┌────────────────┐
                  │         └────────────────┘      │ Driver PWA      │
                  │                                  │ (mobile-first)  │
                  └──────────────────────────────────┴────────────────┘
```

- Single Next.js monorepo (App Router) serving the public site + customer app;
  driver PWA and dispatch console are separate route groups or separate apps
  in the same monorepo, all calling the same internal service layer — never
  three parallel copies of booking/authz/pricing logic.
- The service layer is the only thing that touches the database and external
  providers. UI route handlers/Server Actions are thin — they authenticate the
  request, call a service function, return a shaped response.
- Realtime (dispatch live board, driver job push, customer tracking) rides on
  a single pub/sub mechanism (see §M), authenticated per-connection, not on
  unauthenticated broadcast channels.

## B. User Roles

| Role | Who | Notes |
|---|---|---|
| GUEST | Unauthenticated visitor | Can request a quote and book without an account (see §H). |
| CUSTOMER | Individual booking shipments | Owns shipments they created or that belong to their org. |
| CUSTOMER_MANAGER | Business-account user who manages other customer users | Can view/manage shipments for their `organization_id`; cannot see other orgs. |
| DRIVER | Contracted/employed driver | Sees only currently-assigned jobs; never another driver's jobs. |
| DISPATCHER | Operations staff | Assigns drivers/vehicles, views live ops; **not** automatically security/billing/super-admin. |
| BILLING | Finance staff | Invoices, payments, refunds; **not** automatically driver PII or security events. |
| ADMIN | Platform administrator | Manages users, pricing rules, vehicles, sees audit log (scoped). |
| SUPER_ADMIN | Platform owner/founder-level | Full access, MFA mandatory, short session TTL, reauth for destructive actions. Very small membership. |

Roles are necessary but not sufficient — every endpoint also enforces
resource-level (row) authorization (see §C). A role grants a *capability
class*; a condition grants access to a *specific resource instance*.

## C. Permission Matrix (representative — full matrix maintained alongside the
API layer as it's built, in `docs/authorization-matrix.md`)

| Resource | Action | Role | Condition |
|---|---|---|---|
| Quote | Create | GUEST, CUSTOMER | rate-limited by IP/session |
| Shipment | Create (book) | GUEST, CUSTOMER | valid, unexpired quote reference |
| Shipment | View | CUSTOMER | `shipment.organizationId == user.organizationId` (or `customerId == user.id` for individual accounts) |
| Shipment | View | DRIVER | `shipment.assignedDriverId == user.driverId` |
| Shipment | View (ops fields only) | DISPATCHER | `dispatcher` permission; billing fields excluded |
| Shipment | View (billing fields) | BILLING | `billing` permission |
| Shipment | Update status (pickup/transit/delivery commands) | DRIVER | assigned driver AND command is a valid transition from current state |
| Shipment | Assign/reassign driver | DISPATCHER, ADMIN | dispatcher permission; shipment in an assignable state |
| Shipment | Cancel | CUSTOMER | own shipment AND state ∈ {DRAFT, QUOTED, AWAITING_PAYMENT, CONFIRMED, AWAITING_ASSIGNMENT} |
| Shipment | Cancel/override | DISPATCHER, ADMIN | reason required; creates audit event |
| POD / Document | View | CUSTOMER | shipment owner, via signed short-lived URL |
| POD / Document | View | DRIVER | own delivery only, at time of delivery |
| POD / Document | View | ADMIN, BILLING(scoped) | scoped permission |
| Tracking (public link) | View | anyone with opaque token | token valid, not expired/revoked, matches shipment |
| Driver live location | View | DISPATCHER, ADMIN, assigned CUSTOMER (aggregated) | dispatcher/admin permission; customer view is coarse (ETA/progress), not raw coordinates |
| Pricing rule | Create/edit | ADMIN | admin permission |
| Vehicle / Fleet | Manage | DISPATCHER (assign), ADMIN (CRUD) | scoped permission |
| Refund | Issue | BILLING, ADMIN | billing permission; creates audit event |
| Audit Log | View | ADMIN | security/audit permission (not automatically all admins) |
| User role change | Perform | SUPER_ADMIN | MFA-fresh session; creates audit event |

Rule enforced everywhere: **`organizationId`, `driverId`, `customerId` are
derived from the authenticated server session, never accepted from the
request body/query/path as the authority.** A path parameter may *name* a
resource; the session determines whether the caller may touch it.

## D. Shipment State Machine

```
DRAFT → QUOTED → AWAITING_PAYMENT → CONFIRMED → AWAITING_ASSIGNMENT → ASSIGNED
  → DRIVER_EN_ROUTE_PICKUP → ARRIVED_PICKUP → PICKUP_VERIFICATION → LOADED
  → IN_TRANSIT → ARRIVED_DELIVERY → DELIVERY_VERIFICATION → DELIVERED → COMPLETED
```

Exception states, reachable from most in-flight states: `CANCELLED`,
`REJECTED`, `FAILED_PICKUP`, `FAILED_DELIVERY`, `ON_HOLD`, `INCIDENT_REPORTED`.

Enforcement rules:
- The client never sets `status` directly. It calls intent-revealing commands:
  `acceptJob()`, `startEnRouteToPickup()`, `confirmArrival()`,
  `verifyPickup(method, code|signature)`, `markLoaded()`, `startTransit()`,
  `confirmArrivalDelivery()`, `verifyDelivery(method, code|signature)`,
  `completeDelivery()`, `reportIncident()`, `cancelShipment(reason)`.
- Each command is a single transaction: load current state → verify actor
  identity & authorization → verify the transition is legal from the current
  state → verify required inputs (e.g. a valid, unexpired, unused PIN) →
  write new state + a `ShipmentStatusEvent` + relevant chain-of-custody event
  → commit. Any failure rolls back the whole write; no half-applied state.
- A transition table (allowed `fromState → toState` pairs, keyed by command)
  lives in one place in the service layer — not duplicated in UI code.
- Terminal/near-terminal states (`DELIVERED`, `COMPLETED`, `CANCELLED`) reject
  further status commands; corrections happen via an explicit incident/
  correction event, not by silently rewriting the shipment.

## E. Data Classification

| Class | Examples | Handling |
|---|---|---|
| PUBLIC | Marketing copy, service area descriptions, pricing *ranges* | CDN-cacheable, no auth |
| INTERNAL | Aggregate operational metrics, fleet utilization, non-identifying availability | Authenticated staff only, not customer/driver facing |
| CONFIDENTIAL | Shipment details, pickup/delivery addresses, customer contacts, itemized pricing, POD, invoices | Owner/assignee/staff-with-permission only; signed short-lived URLs for files; never public storage |
| HIGHLY SENSITIVE | Auth credentials/session tokens, OTP/verification codes, API keys & webhook secrets, precise live driver GPS, identity-verification artifacts, privileged admin/audit activity | Encrypted at rest where applicable, never logged, tightest role scope, shortest sane retention |

Retention defaults (confirm with owner, see §O): raw GPS trail — days, not
indefinite; POD photos/documents — years, per business/legal record-keeping
need; audit log — long retention, append-only; OTP/verification codes —
minutes, single-use, purged after use/expiry.

## F. Threat Model (STRIDE-flavored, mapped to mitigations)

| Threat | Mitigation |
|---|---|
| Account takeover / credential stuffing | Rate limiting + lockout on login, MFA for staff/admin, breach-aware password policy, session rotation on login/privilege change |
| Broken access control / IDOR / object enumeration | Server-derived identity for every ownership/assignment check; opaque high-entropy tracking tokens, not sequential IDs; negative authorization tests are mandatory (§13/N) |
| SQL injection | Parameterized queries via ORM only; no string-built SQL |
| XSS | No `dangerouslySetInnerHTML` without documented sanitization; output escaping by default (React) |
| CSRF | SameSite cookies + CSRF token/double-submit or equivalent framework protection on all state-changing routes |
| SSRF | No user-controlled URLs fetched server-side without an allowlist (e.g. webhook callback registration, if ever offered) |
| Malicious uploads | MIME + file-signature (magic byte) validation, size/dimension limits, re-encoded/stripped metadata, stored under generated names, served via signed URLs, never executable |
| Payment manipulation / fake success | Price computed server-side from a signed quote; payment status only trusted from verified provider webhook, never client redirect param |
| Quote / shipment-price manipulation | Quote is a server-generated, expiring, re-validated reference; client never supplies price |
| Fake pickup/delivery confirmation | OTP/QR/signature verification is server-validated, single-use, short-lived, rate-limited; driver identity from session, not client-claimed |
| Unauthorized GPS tracking / tracking-link sharing | Location access scoped to authorized roles + valid opaque token; customer view is coarse/aggregated; token expiry/revocation |
| Driver/customer impersonation | Strong session auth, device/session listing + revocation for drivers |
| Replayed verification codes | Single-use flag + expiry enforced server-side, invalidated immediately on success |
| Stolen driver devices | Session revocation, short driver session TTL relative to risk, ability for dispatch to force-logout a driver |
| Webhook forgery | Signature verification, timestamp/replay window, event-id idempotency table |
| API abuse / rate-limit bypass | Per-endpoint rate limits keyed by session/IP, stricter on auth/OTP/quote/booking/upload |
| Sensitive logging / leaked secrets | Structured logging with field redaction; secrets only in managed secret storage; `.env` never committed |
| Dependency compromise | Lockfiles committed, dependency vulnerability scanning in CI, deliberate dependency review before adding |
| Privilege escalation | Role changes are SUPER_ADMIN-only, audited, reauth-gated |
| Insecure password reset | Short-lived single-use tokens, rate-limited, account-existence not disclosed |
| Unauthorized admin changes | All dispatcher/admin overrides require reason + create an audit event |

## G. Proposed Database Entities

Core: `User`, `Organization`, `OrganizationMember`, `CustomerProfile`,
`DriverProfile`, `Vehicle`, `VehicleCapability`, `Address`, `Contact`.

Shipment domain: `Shipment`, `ShipmentItem`, `ShipmentStop`,
`ShipmentAssignment`, `ShipmentStatusEvent`, `Quote`, `PricingRule`.

Money: `Payment`, `Invoice`, `WebhookEvent` (external event dedupe).

Trust/verification: `PickupVerification`, `DeliveryVerification`,
`ChainOfCustodyEvent`, `Seal`, `POD`, `Document`, `Incident`.

Platform: `Notification`, `DriverLocation`, `AuditEvent`, `ApiKey`.

Each shipment-owning entity carries explicit ownership columns
(`organization_id`, `customer_id`, `shipment_id` as applicable) — no implicit
ownership inferred from joins alone. `ShipmentStatusEvent` and
`ChainOfCustodyEvent` and `AuditEvent` are append-only; corrections are new
rows, not updates. Full column-level schema is Phase 1 work (not authored
here) — this is the entity inventory that Phase 1 will formalize into
migrations.

## H. Customer Booking Workflow (target: ~3 steps)

1. **Where + When** — pickup address, delivery address (autocomplete,
   normalized + geocoded server-side), "Now" or scheduled date/time. Map
   provider key never reaches the browser as a secret (session-scoped token
   or server-proxied requests only).
2. **What are we moving?** — visual choice (Boxes/Packages, 1–4 pallets,
   Equipment/Machinery, Other), approximate weight, dimensions where needed,
   loading conditions at pickup and delivery (forklift/dock/who's loading/
   driver assistance). Backend computes the required vehicle class from
   dimensions + weight + pallet count + loading method against fleet
   capability rules — customer does not pick a vehicle. Anything the rules
   can't confidently resolve is flagged `SPECIAL_REVIEW_REQUIRED` and routed
   to a human rather than guessed.
3. **Review + Price + Book** — pickup/delivery/date/cargo/vehicle
   class/security level/price/ETA shown from the server-issued quote;
   contact info (name/phone/email) for guest checkout; **Book Delivery**.
   Account creation is offered *after* booking, not required before it.

Booking is idempotent (§ Idempotency below); price at booking time is
re-validated server-side against the quote record, not accepted from the client.

## I. Driver Workflow (target: ~4 operational stages)

1. **Accept / Start Job** — driver sees only necessary job info (job number,
   approximate route, pickup time, cargo quantity, required vehicle,
   instructions) — never customer billing details; confidential shipments
   show minimum necessary detail.
2. **Verify Pickup** — `ARRIVED` → server checks assigned driver + valid
   state → PIN/QR/signature verification (short-lived, single-use,
   rate-limited, never logged) → cargo confirmation (`MATCHES` /
   `REPORT ISSUE`, never forced past a real discrepancy) → `LOADED`.
3. **Transport** — `START DELIVERY` records actor/timestamp/state change;
   location reporting is authenticated and derives the driver from session,
   never a client-supplied `driverId`.
4. **Verify Delivery** — recipient verification (PIN/QR/signature, optional
   seal check) → `COMPLETE DELIVERY` in one transaction that validates
   assignment/state/verification and creates the delivery event, POD,
   audit event, customer notification, and billing trigger together.

Confidential-load mode throughout: no cargo description/photography beyond
what's required, no pricing shown, no internal notes — just
"CONFIDENTIAL SHIPMENT — do not photograph contents, do not open packaging,
verify recipient before release."

## J. Dispatch Workflow

Live board (active/unassigned shipments, drivers, vehicles, delayed
pickups/deliveries, incidents, exceptions) with map visualization. Dispatcher
actions (assign/reassign driver, assign vehicle, contact parties, adjust
operational details, authorized cancellation, manual shipment creation,
exception handling) are scoped to dispatcher permission and never silently
applied — every override records reason + actor + timestamp + audit event.
Realtime connections are authenticated per-connection and re-check resource
authorization; channel/topic names are not treated as an authorization boundary.

## K. Security Architecture

- **AuthN**: Auth.js/NextAuth on our own Postgres (confirmed, §O), custom
  TOTP MFA for DISPATCHER/BILLING/ADMIN/SUPER_ADMIN. Secure server sessions:
  `Secure`, `HttpOnly`, appropriate `SameSite`, rotated on login/privilege
  change. No sensitive session data in `localStorage`.
- **AuthZ**: centralized policy module in the service layer — role check +
  resource-condition check on every mutating and every sensitive-read
  endpoint; never a UI-only restriction.
- **Payments**: Stripe (or equivalent PCI-compliant provider), tokenized
  payment methods, no raw card data ever touches the app's servers.
- **Secrets**: managed secret storage per environment; `.env.example` with
  placeholders only committed; any leaked secret is rotated, not just deleted.
- **Headers**: HSTS, CSP (tuned, not disabled when something breaks),
  X-Content-Type-Options, Referrer-Policy, frame-ancestors, Permissions-Policy.
- **Uploads**: private object storage, signed short-lived URLs, MIME +
  signature validation, generated filenames, stripped metadata.
- **Audit**: append-only `AuditEvent` for every security-sensitive action
  (role change, driver assignment, overrides, refunds, POD access where
  applicable, admin config changes).
- **Fail-closed** everywhere: unclear authorization → deny; unverifiable
  vehicle fit → manual review; unverifiable payment → not marked paid;
  failed recipient verification → delivery not completed; bad webhook
  signature → not processed; permission-service failure → access denied.

## L. Recommended Repository / Module Structure

```
midwaymovers/
  apps/
    web/                 # Next.js: public site + customer app (+ dispatch route group, or split out later)
    driver-pwa/           # Next.js/React PWA, mobile-first, offline-tolerant shell
  packages/
    core/                 # domain logic: state machine, pricing, vehicle matching, permission policy
    db/                   # schema, migrations, generated client
    ui/                   # shared design system components
    config/                # shared TS/ESLint/Tailwind config
  docs/
    PHASE-0-SPECIFICATION.md   (this file)
    authorization-matrix.md
    threat-model.md             (expands §F as implementation proceeds)
    adr/                        # architecture decision records
  .env.example
  CLAUDE.md
```

Business rules (pricing, shipment transitions, vehicle matching, validation,
permission policy) live once in `packages/core`, imported by every app —
never re-implemented per surface.

## M. External Integrations (candidates — confirm in §O)

| Concern | Candidate | Notes |
|---|---|---|
| Payments | Stripe | Tokenized methods, webhooks, PCI SAQ-A scope |
| Maps/geocoding | Google Maps Platform or Mapbox | Server-proxied key usage where possible |
| SMS | Twilio (or similar) | Generic notification text only, no confidential detail |
| Transactional email | Postmark/SendGrid/SES | Booking/receipt/POD-link email |
| Object storage | S3-compatible (AWS S3 / Cloudflare R2) | Private buckets, signed URLs only |
| Auth | Auth.js/NextAuth + Postgres | Confirmed. Custom TOTP MFA for staff |
| Realtime | Postgres LISTEN/NOTIFY + WebSocket layer, or a managed realtime service | Authenticated per-connection |
| Hosting | Vercel (web) + Neon (managed Postgres) | Confirmed |
| Error tracking | Sentry (with PII scrubbing) | |

## N. Testing Strategy

- Unit tests: pricing, vehicle-matching, state-machine transition table,
  permission policy functions.
- Integration/API tests: real server authorization (not mocked) for every
  endpoint — see mandatory negative-authorization cases below.
- E2E: full booking → assignment → pickup → transit → delivery → POD, for
  both standard and confidential shipments, plus exception paths (rejection,
  cancellation, no driver available, discrepancy, seal mismatch, payment
  failure, duplicate submit).
- Concurrency tests: double-assignment race, double-accept race, double-click
  booking, duplicate webhook, double "Complete Delivery" tap, vehicle
  availability changing mid-booking — all resolved via DB constraints,
  transactions/locks, or idempotency keys, not client-side prevention alone.
- Mandatory negative-authorization suite (non-exhaustive minimum, from the
  master instructions): cross-customer shipment/POD access denied,
  cross-driver shipment access denied, unassigned-driver mutation denied,
  out-of-order state transition denied, client-supplied price rejected,
  expired quote rejected, expired/reused OTP rejected, duplicate webhook
  processed once, bad webhook signature rejected, unsigned/expired POD
  request rejected, guest→admin denied, dispatcher→super-admin denied,
  oversized upload rejected, invalid MIME/signature upload rejected.

## O. Open Questions / Assumptions (owner input needed before Phase 1 locks)

These are genuine unknowns, not decisions I'll silently make:

**Resolved:**
- ~~Auth provider~~ → **Auth.js/NextAuth + our own Postgres**, custom TOTP MFA
  for staff/admin.
- ~~Payment provider~~ → **Stripe**.
- ~~Hosting/infra preference~~ → **Vercel + managed Postgres (Neon)**.
- ~~Business accounts at MVP~~ → **required at MVP**: `Organization`,
  `OrganizationMember`, and `CUSTOMER_MANAGER` are in the Phase 1 schema and
  the MVP feature set from day one (see updated §P).
- ~~Business entity/brand name~~ → **Midway Movers**.
- ~~Domain name / production URL~~ → **midwaymover.com** (owner-owned).
  Note the domain is singular ("mover") while the confirmed brand is
  plural ("Movers") — intentional per owner; carry both forms consistently
  (brand text = "Midway Movers", URLs/email domain = midwaymover.com) rather
  than assuming a typo and "fixing" one to match the other.

**Still open** — need owner input before Phase 1 fully locks:

1. **Service area & regulatory scope** — which country/state(s)/province(s)?
   (Affects tax handling, driver eligibility rules, data residency.)
2. **Fleet size & vehicle data at launch** — how many vehicles/drivers
   on day one, and do we have real payload/interior-dimension specs per
   vehicle to seed `VehicleCapability`, or do we need placeholder defaults
   reviewed before go-live?
3. **Confidential-shipment tier** — is "confidential mode" a customer-
   selectable option on every booking, a paid tier, or default-on for all
   shipments given the brand promise ("Private. Dedicated. Confidential.")?
4. **Budget/timeline constraints** that should shape MVP scope (§P).

Until these are answered, Phase 1 (database design) proceeds using sensible
defaults where none is given, flagged in ADRs so they're easy to revisit.

## P. MVP Boundary

**In scope for MVP:**
- Guest + registered customer booking (3-step flow), **plus business
  accounts**: `Organization` / `OrganizationMember` / `CUSTOMER_MANAGER`,
  org-scoped shipment visibility, and inviting additional users to an org.
- Server-computed vehicle matching for the four vehicle classes.
- Stripe payment at booking, webhook-driven payment confirmation.
- Dispatcher manual assignment (no auto-assignment algorithm at MVP).
- Driver PWA: accept → verify pickup (PIN) → transport → verify delivery
  (PIN) → POD.
- Customer tracking via opaque token link with coarse live status.
- SMS + email notifications for the core status milestones.
- Confidential-shipment mode (display restrictions) — not a separate paid
  product yet.
- Core audit log for security-sensitive actions.
- Automated negative-authorization test suite (§N) — not optional, ships
  with MVP.

**Post-MVP:**
- Recurring/scheduled routes for business accounts.
- Auto-assignment/optimization of driver-to-job matching.
- Seal/tamper-evidence hardware integration.
- Incident-workflow automation beyond basic reporting.
- Advanced admin reporting/analytics.
- Recurring/scheduled routes, saved locations at scale.
- Passkey rollout beyond initial TOTP MFA for staff.

## Q. Phase-by-Phase Implementation Plan

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Requirements + threat model | **This document — draft, pending §O answers** |
| 1 | Database architecture + state machine (formal schema/migrations) | Not started |
| 2 | Design system | Not started |
| 3 | Authentication + authorization | Not started |
| 4 | Customer booking | Not started |
| 5 | Customer tracking | Not started |
| 6 | Driver workflow | Not started |
| 7 | Chain of custody | Not started |
| 8 | Dispatch | Not started |
| 9 | Payments | Not started |
| 10 | Notifications | Not started |
| 11 | POD/documents | Not started |
| 12 | Security hardening | Not started |
| 13 | Automated testing | Not started (test *requirements* defined in §N) |
| 14 | Responsive/accessibility QA | Not started |
| 15 | Performance | Not started |
| 16 | Database audit | Not started |
| 17 | Security audit | Not started |
| 18 | Staging + production deployment | Not started |

No phase after this one begins until §O's blocking questions have owner
answers (or explicit "proceed with the stated default") and this document is
confirmed internally consistent.
