# Phase 2 Customer Purchase Flow Tasks

**Design:** `.specs/features/phase-2-customer-purchase/design.md`
**Status:** Complete

## Foundation

### T1 — Phase 2 migration

- [x] Add order idempotency key and service-role-only transactional order RPC.
- [x] Verify price/status/referral/availability logic and no inventory decrement.

### T2 — Shared contracts and validation

- [x] Add customer-safe event/ticket/order DTOs and pure input normalization.
- [x] Add unit coverage for phone, email, quantity, order-number/access-token behavior.

### T3 — Referral persistence

- [x] Add signed cookie helpers, URL capture route, first-touch policy, and manual-code action.

## Customer UI

### T4 — Shared festival shell/components

- [x] Build navigation, mark, buttons, section heading, ticket card, empty/error/loading states, and footer.

### T5 — Homepage

- [x] Replace the Phase 1 shell with the focused dynamic festival landing page.

### T6 — Tickets

- [x] Build active catalogue, sold-out/sales-closed states, quantity controls, and totals.

### T7 — Checkout

- [x] Build accessible customer form, referral fallback, order summary, pending/error states, and server action.

### T8 — Payment instructions

- [x] Build signed-access payment route, configured/unconfigured bank state, copy controls, and disabled Phase 3 CTA.

## Verification

### T9 — Automated repository tests

- [x] Extend SQL invariants and unit tests; pass lint, typecheck, build, and audit.

### T10 — Playwright journey

- [x] Use the requested skill to test normal, quantity, group/couple, referral, invalid/inactive, tampering, double-submit, sales-closed, accessibility basics, and required viewports.

### T11 — Handoff

- [x] Update roadmap/state/README and publish the Phase 2 validation report without beginning Phase 3.
