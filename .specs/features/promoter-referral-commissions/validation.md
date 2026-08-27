# Promoter Referral Commission Foundation Validation

**Date:** 2026-08-26
**Overall:** Database/domain increment ready; customer/admin integration remains deferred to its missing parent workflows.

## Results

| Area | Result |
| --- | --- |
| Existing architecture preserved | PASS — additive migration; no `order_items`; no UI/QR/payment files changed |
| Referral code/link/manual fallback contracts | PASS — normalization, link creation, secure-attribution preservation, active DB lookup |
| 30-day attribution integrity | PASS — HMAC token round-trip, expiry, and tamper tests |
| Five requested rates and quantities | PASS — seed invariants plus unit calculations |
| Historical accuracy | PASS — database-owned price/rate snapshots are immutable |
| Submitted/verified/rejected/cancelled behavior | PASS — parsed state trigger and transition invariants |
| Duplicate verification | PASS — unchanged-status short circuit plus unique `order_id` and upsert |
| Payout/reversal | PASS — super-admin-only, idempotent payout, explicit audited reversal |
| Gate/promoter isolation | PASS — no gate/promoter finance RLS path; authenticated ledger is read-only |
| Lint | PASS |
| TypeScript | PASS |
| Unit tests | PASS — 8/8 |
| SQL parser/invariants | PASS — 2 migrations + seed, 39/39 invariants |
| Production build | PASS |
| Dependency audit | PASS — 0 vulnerabilities |

## Not Yet Proven

- Migrations and RLS/RPC behavior were not executed against live PostgreSQL because Docker and Supabase credentials are unavailable.
- `/tickets`, checkout, admin auth/routes, payment verification, ticket issuance, and check-in do not exist. Their UI and end-to-end referral/commission tests cannot truthfully pass yet.
- No promoter login/dashboard was added. There is deliberately no policy allowing a promoter to read any promoter or customer record.

## Required Live Verification

After applying migrations to Supabase, test active/inactive attribution inserts, submitted → verified/rejected transitions, double verification, rate changes, payout/reversal RPCs under each role, and RLS reads under super-admin/payment-admin/gate-staff JWTs.

