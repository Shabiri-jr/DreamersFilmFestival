# Phase 2 Customer Purchase Flow Specification

## Goal

Customers can discover the festival, choose one active ticket product and quantity, submit contact details, create an `awaiting_payment` order with optional durable promoter attribution, and see configured bank-transfer instructions. Phase 2 stops before payment evidence, verification, commission earning, ticket generation, QR, or check-in.

## Architecture Constraints

- Preserve the existing one-ticket-type-per-order model.
- Read customer-visible ticket/event data from Supabase rather than component constants.
- Keep anonymous table access closed; all reads/writes are server-mediated.
- Never accept price, total, commission, payment status, or promoter ID from the browser as authoritative.
- Unpaid orders validate current availability but do not decrement/reserve inventory in Phase 2.

## P1 User Stories

### Festival discovery

1. WHEN a customer opens `/` THEN the page SHALL show the festival identity, dynamic event details, active ticket previews, focused CTAs, FAQ, and support contact.
2. WHEN no active tickets exist THEN the page SHALL render an intentional empty state.
3. WHEN Supabase is unavailable THEN the page SHALL fail safely without exposing technical errors.

### Ticket selection

1. WHEN a customer opens `/tickets` THEN only active ticket types SHALL be shown.
2. WHEN `sales_enabled` is false THEN checkout controls SHALL be unavailable.
3. WHEN stock is zero THEN that product SHALL be marked sold out and unselectable.
4. WHEN quantity changes THEN the displayed total SHALL update from server-provided catalogue data and respect stock/maximum limits.

### Referral attribution

1. WHEN `/` or `/tickets` receives a valid active `?ref=CODE` THEN the server SHALL store a signed, HTTP-only, 30-day first-touch attribution and redirect to a clean URL.
2. WHEN a captured referral already exists THEN later URL/manual codes SHALL NOT replace it.
3. WHEN checkout receives a valid manual code without prior attribution THEN it SHALL store `manual_code` attribution.
4. WHEN a code is invalid or inactive THEN checkout SHALL show a readable error and no attribution SHALL be stored.
5. WHEN an order is created THEN active attribution SHALL be revalidated and permanently copied to the order.

### Secure order creation

1. WHEN valid details are submitted THEN the server SHALL validate ticket, sales state, availability, quantity, name, phone, email, and referral.
2. WHEN an order is inserted THEN PostgreSQL SHALL calculate price snapshots, commission-rate snapshot, and total from current database values.
3. WHEN submit is repeated with the same idempotency key THEN the original order SHALL be returned instead of creating a duplicate.
4. WHEN creation succeeds THEN the order SHALL start `awaiting_payment` with a non-sequential `DFF-` identifier and no commission/ticket/check-in rows.

### Payment instructions

1. WHEN the creating browser opens `/payment/[orderNumber]` THEN signed access SHALL be required before customer/order data is queried.
2. WHEN configured bank details exist THEN the page SHALL show order summary, exact amount, account fields, copy controls, and transfer warnings.
3. WHEN bank details are incomplete THEN the page SHALL not invent values and SHALL direct the customer to support.
4. The `I HAVE PAID` control SHALL remain disabled with an explicit Phase 3 message.

## Validation and UX

- Forms use visible labels, field-level accessible errors, loading/disabled states, and 44px+ touch targets.
- Phone input accepts Nigerian local formats and international `+` formats, storing a normalized international value.
- Layout has no horizontal overflow at 375, 390, 430, 768, and 1280+ widths.
- Motion uses transform/opacity only and respects reduced motion.

## Explicitly Out of Scope

- Receipt upload, payment submission/status changes, admin verification/rejection, commission payout, ticket/QR generation, WhatsApp delivery, scanning, check-in, reporting, or analytics.

