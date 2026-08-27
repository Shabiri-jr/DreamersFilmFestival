# Phase 3 Payment Submission Specification

**Status:** Approved by explicit user request

## Problem

Customers can create protected, awaiting-payment orders and see bank-transfer instructions, but cannot yet submit transfer evidence or return to a durable status view. Phase 3 adds secure evidence capture without treating customer claims as verified payment.

## Goals

- Allow the browser holding the signed order-access token to submit payment details and one private receipt.
- Preserve every submission as an auditable record and move the order only to `submitted`.
- Show accurate awaiting, submitted, verified, rejected, and cancelled customer states.
- Keep price, referral, commission, ticket, and verification authority server/database controlled.

## Out of Scope

- Admin approval/rejection and receipt review UI.
- Ticket/QR issuance, check-in, payouts, analytics, exports, or messaging.
- Order expiry or inventory reservation, which do not yet exist.

## P1 User Stories

### Submit transfer evidence

As a customer with access to an awaiting or rejected order, I can enter sender name, bank, amount, reference, date, optional time, and a mandatory receipt.

1. WHEN valid evidence is submitted THEN the system SHALL store the receipt privately under a server-generated order UUID/random UUID path.
2. WHEN submission completes THEN the system SHALL create one active payment-submission record and transition only `awaiting_payment|rejected -> submitted`.
3. WHEN entered amount differs from the stored order total THEN the system SHALL preserve both values, flag the mismatch, and never auto-verify.
4. WHEN a reference normalizes to one already submitted for another order THEN the system SHALL flag potential duplication without rejecting it.
5. WHEN the button is clicked repeatedly THEN the browser SHALL disable it while pending and the database SHALL collapse duplicates.

### Validate receipt safely

1. WHEN a JPG/JPEG, PNG, WEBP, or PDF under or equal to 5 MiB has matching extension, declared MIME, and magic bytes THEN it SHALL be accepted.
2. WHEN the file is missing, empty, oversized, unsupported, or mismatched THEN it SHALL be rejected with a human-readable error.
3. WHEN the original filename is path-like or unusual THEN it SHALL never be used in the storage object path.

### Return to order status

1. WHEN the same signed browser opens `/order/[orderNumber]` THEN it SHALL see a privacy-scoped order summary.
2. WHEN status is awaiting, submitted, verified, rejected, or cancelled THEN the page SHALL show accurate non-misleading copy and valid next actions.
3. WHEN status is submitted THEN it SHALL say payment is under verification and SHALL NOT show a fresh submission form.

## Security and State Acceptance

- Anonymous and gate-staff users cannot read `payment_submissions` or receipt objects.
- Customer input cannot set expected total, verification fields, commission amount/status, or ticket state.
- The submission RPC is service-role only, transactional, locked per order, audited, and idempotent.
- `submitted` creates no tickets and no earned commission; the existing referred-order commission may be `pending` only.
- Existing valid orders may submit after sales close; cancelled/verified/submitted orders cannot create another active submission.
- Receipt URLs, internal notes, promoter finances, admin identities, audit logs, and QR secrets are never exposed to customer pages.

## Success Criteria

- All repository checks pass.
- Browser coverage exercises the actual customer journey and mobile upload UI.
- Hosted migration applies cleanly and storage remains private.

