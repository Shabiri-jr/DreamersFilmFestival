# Phase 3 Payment Submission Tasks

**Design:** `.specs/features/phase-3-payment-submission/design.md`
**Status:** Done

## T1 — Phase 3 contract

**Where:** Phase 3 spec/design/tasks files  
**Done when:** Requirements, reuse, boundaries, and acceptance tests are explicit.

## T2 — Additive database migration

**Where:** `supabase/migrations/202608260004_phase_3_payment_submission.sql`  
**Depends on:** T1  
**Done when:** Evidence history, RLS, indexes, private bucket metadata, transactional/idempotent RPC, order summary timestamps, and audit event are defined; no ticket or verified transition exists.

## T3 — Payment validation and server action

**Where:** `src/lib/payments/*`, database/domain types, order access  
**Depends on:** T2  
**Done when:** Origin/token/order checks, field/date/money validation, magic-byte receipt validation, random upload, cleanup, RPC call, and redirect are implemented.

## T4 — Customer payment UI

**Where:** payment page, payment form component, order-status route  
**Depends on:** T3  
**Done when:** I HAVE PAID works, mobile preview/remove/replace/loading/error behavior works, and five customer states are truthful and protected.

## T5 — Automated verification

**Where:** Phase 3 unit tests, SQL invariant script, Playwright coverage  
**Depends on:** T2–T4  
**Done when:** Valid/invalid files, dates, amounts, idempotency, privacy/state invariants, actual app journey, refresh, and target viewports pass.

## T6 — Release verification and memory

**Where:** hosted migration, README, state, validation report  
**Depends on:** T5  
**Done when:** Full check, hosted schema/storage verification, Playwright skill pass, and grade-5 evidence audit are complete.
