# Phase 4 Admin Payment Review Specification

## Problem Statement

Customer payment evidence reaches `submitted`, but authorized staff do not yet have a secure workflow for reviewing it. Phase 4 adds staff authentication, payment decisions, private receipt access, commission activation, and promoter reporting without issuing tickets or QR codes.

## Goals

- Authorized finance staff can review, verify, or reject submitted payments.
- Verification and commission activation are atomic, idempotent, and audited.
- Gate staff, customers, and anonymous visitors cannot access financial data or actions.
- Rejected customers can use the existing resubmission flow without losing history.

## Out of Scope

- QR/ticket generation, ticket delivery, scanning, check-in, and attendance reporting.
- Mixed-product orders; the existing order is one ticket type with a quantity.
- New payout-management UI; the existing super-admin payout RPC remains available.

## User Stories

### P1: Secure staff access

WHEN an active Super Admin or Payment Admin signs in with Supabase Auth THEN the system SHALL provide server-protected finance routes. WHEN an anonymous, inactive, or Gate Staff user requests finance routes or receipt bytes THEN the system SHALL deny access without disclosing private data.

### P1: Review submitted payments

WHEN finance staff open the queue THEN the system SHALL prioritize submitted orders and support status filters plus safe search across order, customer, transfer, and promoter fields. WHEN an order is opened THEN the system SHALL show immutable price/commission snapshots, evidence, mismatches, duplicate warnings, and historical submissions.

### P1: Verify payment

WHEN authorized staff confirm a currently submitted payment THEN one database transaction SHALL accept the active submission, verify the order, record actor/time, earn at most one snapshot-based commission, and write audit entries. Repeated or concurrent requests SHALL NOT duplicate financial state, and SHALL NOT create tickets.

### P1: Reject and resubmit

WHEN authorized staff reject a submitted payment with a valid reason THEN one transaction SHALL reject the active submission, reject the order, cancel any pending commission, and audit the decision. WHEN the customer resubmits THEN the old evidence SHALL remain rejected and a new submitted row SHALL become active.

### P2: Operations reporting

WHEN finance staff open the dashboard THEN the system SHALL show payment/revenue/commission metrics without claiming ticket issuance. WHEN a Super Admin opens promoter pages THEN the system SHALL show verified sales and commission balances from the existing ledger.

## Edge Cases

- Direct sales verify with no commission record.
- Historically attributed inactive promoters retain the captured commission obligation.
- Under/overpayment and duplicate references warn but never auto-decide.
- Missing receipts fail closed; the private bucket remains private.
- Current catalogue changes do not change order price or commission snapshots.

## Success Criteria

- All 24 requested authorization, state, commission, privacy, history, and audit scenarios are covered by automated or live integration evidence.
- Existing Phase 1–3 checks remain green.
- No ticket rows are created by Phase 4.
