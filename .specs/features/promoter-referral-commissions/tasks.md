# Promoter Referral Commissions Tasks

**Design:** `.specs/features/promoter-referral-commissions/design.md`
**Status:** Foundation Increment Done

## Tasks

### T1: Document brownfield and feature contract

- [x] Record current stack, boundaries, absent flows, scope, and acceptance criteria.

### T2: Add incremental database migration

- [x] Add promoter and commission models, snapshots, state triggers, admin RPCs, grants, RLS, and audit behavior.
- [x] Parse all SQL and verify schema/security/idempotency invariants.

### T3: Update seed and TypeScript contracts

- [x] Seed all five requested commission rates.
- [x] Mirror new enums, fields, tables, and functions in TypeScript.

### T4: Add referral/commission domain utilities

- [x] Normalize/validate codes, calculate commissions, build links, and sign/verify 30-day attribution tokens.
- [x] Keep secrets in a server-only environment contract.

### T5: Add tests and validate

- [x] Cover all requested product rates, quantities, invalid/inactive behavior model, state transitions, idempotency, history, payout, reversal, and access invariants supported by this increment.
- [x] Run lint, typecheck, unit tests, SQL tests, build, and dependency audit.


## Deferred Tasks (blocked by roadmap prerequisites)

- Customer `/tickets` and checkout integration (Phase 2)
- Receipt submission integration (Phase 3)
- Promoter management/reporting/payment verification UI (Phase 4)
- Ticket issuance integration and QR lifecycle (Phase 5)
- Promoter-authenticated dashboard (future, optional)
