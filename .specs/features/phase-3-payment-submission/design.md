# Phase 3 Payment Submission Design

**Spec:** `.specs/features/phase-3-payment-submission/spec.md`
**Status:** Approved by explicit user request

## Smallest Safe Architecture

Phase 3 extends the current single-product order model. A new `payment_submissions` table is the immutable evidence history, while the existing payment columns on `orders` remain a denormalized current-submission summary for the future Phase 4 queue. A service-role-only PostgreSQL RPC locks the order, collapses repeats, snapshots the expected total, inserts evidence metadata, updates the order to `submitted`, and writes `payment.submitted` in one transaction.

The Next.js server action verifies origin and the existing order-bound HTTP-only token, validates form/file content, uploads to the private bucket with a random path, and invokes the RPC. If the RPC fails or returns an already-existing submission, the action removes only the newly uploaded object.

```text
signed payment page -> server action -> validate fields + magic bytes
                    -> private Storage upload: order-id/random-id.ext
                    -> service-only submit_customer_payment RPC
                    -> payment_submissions + orders(submitted) + audit log
                    -> protected /order/[orderNumber]
```

## Existing Code Reuse

| Existing boundary | Phase 3 use |
| --- | --- |
| `orders/access-token.ts` | Authorize both payment and order-status routes; renew the token after submission. |
| `security/origin.ts` | Reject cross-origin server-action requests. |
| `supabase/admin.ts` | Server-only table, RPC, and private Storage operations. |
| `festival/data.ts` | Extend the customer-safe order DTO without selecting receipt paths or private references. |
| `orders.payment_*` fields | Current evidence summary for Phase 4; history lives separately. |
| Existing payment-status/commission triggers | Submitted remains pending, verified alone becomes earned. |

## Data Model

`payment_submissions` contains: UUID id, order FK, idempotency UUID, sender/bank, entered amount, expected amount snapshot, amount-mismatch flag, raw and normalized reference, potential-duplicate flag, date/time, private receipt path, status, and timestamps.

Constraints enforce safe sizes, dates, structured paths, nonnegative whole-Naira values, and one active `submitted` record per order. RLS exposes finance reads only to super/payment admins; no browser role receives insert/update/delete rights. Storage continues to have no customer object policy.

## Interface

- `/payment/[orderNumber]`: existing transfer instructions plus expandable submission form for awaiting/rejected orders, or current status for terminal/active states.
- `/order/[orderNumber]`: protected durable status page with order summary and truthful state copy.
- `submitPaymentAction`: server action; no public REST endpoint.

## UI Direction

Preserve the poster-derived burnt orange, charcoal, deep green, cream, Barlow Condensed, and Manrope system. Forms use visible labels, 44px+ targets, strong focus/error states, selected-file preview, busy copy, and a strict single column on phones. Motion is restrained and reduced-motion safe.

## Decisions

- Store whole Naira as database numeric and validate safe integers in the application; no floating-point calculations redefine order totals.
- Allow rejected-order resubmission in the data/service contract but do not build rejection controls.
- Do not check `sales_enabled` during submission: an already-created, non-cancelled order may complete payment.
- Do not add expiry because no expiry contract exists.

