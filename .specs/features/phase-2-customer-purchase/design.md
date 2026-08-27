# Phase 2 Customer Purchase Flow Design

**Spec:** `.specs/features/phase-2-customer-purchase/spec.md`
**Status:** Approved by explicit user request

## Experience Direction

An editorial festival-poster system: burnt-orange atmosphere, charcoal ink, warm paper, restrained deep green, geometric/film-strip details, Barlow Condensed display type, and Manrope body copy. Desktop compositions are asymmetric; all conversion steps collapse to a strict one-column mobile flow. Motion is CSS-only and restrained.

## Routes

| Route | Rendering | Purpose |
| --- | --- | --- |
| `/` | Server Component | Landing, event/ticket preview, referral entry capture |
| `/tickets` | Server + client selection leaf | Active catalogue, stock/quantity, sales state |
| `/checkout` | Server + client form leaf | Customer details, manual referral, summary, order action |
| `/payment/[orderNumber]` | Server + copy-button leaves | Signed-access order summary and bank instructions |
| `/api/referrals/capture` | Route handler | Validate link code, preserve first touch, set HTTP-only token, clean redirect |

## Server Boundary

- `festival/catalog.ts`: service-role reads mapped to customer-safe DTOs; commission fields are never selected for customer pages.
- `orders/validation.ts`: pure name/phone/email/quantity/idempotency validation.
- `orders/actions.ts`: trusted-origin check, secure cookie attribution revalidation, RPC call, signed payment-access cookie, redirect.
- `orders/access-token.ts`: domain-separated HMAC token for `/payment/[orderNumber]`.
- `referrals/cookies.ts` and `referrals/actions.ts`: cookie read/write and manual-code application.

## Database

Migration 003 adds `orders.checkout_idempotency_key` and service-role-only `create_customer_order(...)`. The RPC locks/validates event and ticket rows, applies maximum/stock checks, generates a random human order number, inserts through the existing commercial/referral snapshot trigger, and writes `order.created` to the audit log. It does not decrement stock or create commission/ticket/check-in rows.

## Referral Sequence

```text
?ref=CODE -> capture route -> validate active promoter
          -> if no signed attribution: set 30-day HTTP-only token
          -> redirect to clean route

checkout -> optional manual apply only if no token
         -> order action verifies token and promoter still active
         -> RPC persists promoter_id/code/source on order
```

## Order Idempotency

The checkout client generates one UUID per mounted form and disables while pending. PostgreSQL also keeps a unique idempotency key and returns the existing order on repeated RPC calls. The browser never submits price, total, status, commission, or promoter ID.

## Operational Decision

`quantity_available` is treated as current sale availability, but unpaid Phase 2 orders do not reduce it. Overselling protection/reservation expiry must be defined before high-volume sales or payment verification.

