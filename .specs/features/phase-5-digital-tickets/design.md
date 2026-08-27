# Phase 5 Digital Tickets Design

**Spec:** `.specs/features/phase-5-digital-tickets/spec.md`
**Status:** Approved

## Architecture

```text
verify_customer_payment (existing transaction)
  -> server issuance attempt (separate transaction)
     -> issue_order_tickets RPC locks order
        -> one row per product unit
        -> order issuance status + audit

order access cookie -> order page -> secure pass links
public pass token -> hash lookup -> digital pass / PNG
QR credential -> hash lookup -> minimal validation page (read-only)
```

## Reuse

- Reuse the existing single-product `orders.quantity` model; do not add `order_items`.
- Extend the existing `tickets` table and ticket status enum.
- Reuse `APP_ORIGIN`, event settings, order-access cookie, admin auth/RBAC, audit logs, festival tokens, and phone normalization.
- Keep Phase 4 payment and commission RPCs unchanged.

## Data Decisions

- `orders.ticket_issuance_status`: `not_issued | issued | failed`, independent of payment state.
- `tickets.unit_index` plus unique `(order_id, unit_index)` is the durable idempotency key.
- `ticket_type_name_snapshot` and `admission_count` preserve issued facts.
- `public_access_token` and `qr_token` are independent 256-bit random secrets. SHA-256 hashes support public lookups; raw values remain service-role-only because they are required to recreate links and QR images.
- QR payloads are rendered dynamically from the current canonical origin, so credentials remain stable without permanently embedding localhost.

## Authorization

- Finance admins may issue/retry from an order they can already review.
- Super Admin owns cross-order ticket search/detail.
- Gate Staff receives no order/customer/finance RPC access in Phase 5.
- Public routes query by token hash through server-only code and never expose table access.

## Failure Handling

- Issuance RPC succeeds atomically or inserts nothing.
- A separate role-checked RPC records a failed issuance attempt without changing payment or commission state.
- Customer copy remains calm; admin sees retry controls.

## UI Direction

- Editorial-luxury festival pass using burnt orange, deep green, warm cream, charcoal, restrained geometric/film-strip motifs, large high-contrast QR, and one-column mobile layout at 375/390/430px.
- Core information and controls work without motion; focus, contrast, touch targets, reduced motion, and no horizontal overflow are mandatory.
