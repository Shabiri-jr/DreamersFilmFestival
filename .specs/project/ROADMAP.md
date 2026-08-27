# Roadmap

**Current Milestone:** Phase 6 — Event Check-In
**Status:** Complete — awaiting explicit approval to begin Phase 7

---

## Phase 1 — Foundation

**Goal:** A locally runnable, typed, documented, secure-by-default base that later phases can extend without changing the core domain model.
**Target:** All Phase 1 acceptance checks pass.

### Features

**Specification and architecture** — COMPLETE

- Persistent product scope, architecture, decisions, tasks, and acceptance criteria

**Application foundation** — COMPLETE

- Next.js App Router, TypeScript, Tailwind, linting, and branded base shell
- Server/client Supabase separation and environment contract

**Data foundation** — COMPLETE

- Relational schema, constraints, indexes, RLS baseline, private receipts bucket, and seed data

**Verification and handoff** — COMPLETE

- Build, type, lint, dependency, SQL, responsive browser, and documentation checks

---

## Phase 2 — Customer Purchase Flow

**Goal:** Customers can browse ticket types, enter details, receive an order number, and see bank-transfer instructions.

**Festival landing and ticket selection** — COMPLETE
**Checkout and order creation** — COMPLETE
**Responsive bank-transfer page** — COMPLETE

Promoter integration: capture `/tickets?ref=CODE`, preserve a signed 30-day attribution, expose manual code only as fallback, and write the immutable attribution tuple during server-mediated order creation.

Validation: 15 unit tests, 46 SQL invariants, production build, zero-vulnerability npm audit, and a 10-order Playwright journey across 375/390/430/768/1280 viewports — COMPLETE (2026-08-26)

## Phase 3 — Payment Submission

**Receipt upload and private storage** — COMPLETE
**Payment evidence and order status** — COMPLETE

## Phase 4 — Admin Payment System

**Admin authentication and roles** — COMPLETE
**Payment review, decisions, and audit trail** — COMPLETE

Promoter integration: create/edit/activation management, performance/detail reporting, and verification-time attribution/commission display — COMPLETE. The existing super-admin payout/reversal RPCs remain; payout UI is deferred.

## Phase 5 — Ticketing

**Per-product-unit, idempotent ticket generation** — COMPLETE
**Independent secure access/QR credentials and premium digital pass** — COMPLETE
**PNG download and honest manual WhatsApp handoff** — COMPLETE

Validation: 39 unit tests, 69 SQL invariants, live Supabase issuance/role/concurrency checks, production build, PNG QR decode, and visible Playwright journeys at 375/390/430px — COMPLETE (2026-08-27)

## Phase 6 — Event Check-In

**Phone camera and manual lookup** — COMPLETE
**Atomic check-in and duplicate protection** — COMPLETE
**Role-separated metrics, history, audit, and public pass state** — COMPLETE

Validation: 45 unit tests, 79 SQL invariants, hosted Supabase concurrency/RLS/role checks, customer-to-gate Playwright workflow, mocked permission/offline states, production build, and responsive checks at 375/390/430/768/1280px — COMPLETE (2026-08-27). Final Android/iPhone camera acceptance requires the deployed HTTPS origin.

## Phase 7 — Operations

**Analytics, CSV export, settings, and capacity controls** — PLANNED

## Phase 8 — Final QA

**Full customer-to-gate journey and concurrency verification** — PLANNED

## Future Considerations

- Automated WhatsApp Cloud API delivery after manual handoff is proven.
- Additional festival editions only after the single-event MVP is stable.
- A promoter-authenticated dashboard only after admin-side tracking is proven; it must expose only the promoter's own aggregates and referred orders.

## Completed Increment — Promoter Commission Foundation

- Additive schema, seed rates, immutable snapshots/attribution, idempotent commission lifecycle, payout/reversal RPCs, RLS/audit protections, referral utilities, and automated checks — COMPLETE (2026-08-26)
