# Phase 3 Payment Submission Validation

**Date:** 2026-08-26  
**Overall:** Ready for Phase 4

## Automated Evidence

- `npm run check`: PASS — ESLint, strict TypeScript, 27 unit tests, 55 SQL invariants, production build.
- Hosted Supabase migration `202608260004`: applied successfully.
- Playwright actual-app journey: PASS against `http://localhost:3000` backed by the hosted Supabase project.
- Viewports: 375, 390, 430, 768, and 1440 px; no horizontal overflow.

## Live Workflow Evidence

- PNG and PDF submissions created one private evidence row per order and changed only to `submitted`.
- Expected amount snapshots stayed ₦3,000; browser-supplied status/expected fields were not accepted.
- Referral link attribution remained on the order; commission status was `pending`, with no `earned_at` or `paid_at`.
- Direct order had no promoter or commission.
- Zero ticket rows were created.
- Replaying the submission RPC with the same idempotency key kept one row.
- Anonymous evidence-table reads, receipt downloads, and direct `verified` updates were denied.
- Bucket was confirmed private, 5 MiB, and allowed JPEG/PNG/WEBP/PDF.
- Test orders, receipt objects, ledger records, audit records, commission rows, and test promoter were removed after verification.

## User Story Results

| Criterion | Result |
| --- | --- |
| I HAVE PAID opens a working form | PASS |
| Required fields and receipt | PASS |
| File extension, MIME, magic bytes, and 5 MiB | PASS |
| Random order-ID/object-ID storage path | PASS |
| Under/overpayment preserved for review | PASS |
| Future date blocked | PASS |
| Double submission collapsed | PASS |
| Submitted confirmation and refresh | PASS |
| Signed order privacy | PASS |
| No verification, ticket, or earned commission | PASS |
| Responsive form/status views | PASS |

## Problems Found and Fixed

1. React reset uncontrolled payment fields after a server validation response. The form now controls and preserves all six text/date/amount fields.
2. A replaced valid receipt initially retained the old unsupported-file message. Editing or replacing evidence now clears stale error presentation.
3. The Playwright port helper did not detect the Windows Next process; the confirmed `localhost:3000` endpoint was used directly.
4. One final browser retry received a transient Supabase `JWT issued at future` response. A direct hosted query and the immediate full browser retry both passed; monitor if it recurs.

## Not Built

Admin review, acceptance/rejection transitions, signed staff receipt downloads, ticket issuance, and earned commissions remain Phase 4 work.
