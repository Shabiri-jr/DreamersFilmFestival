# Promoter Referral Commissions Design

**Spec:** `.specs/features/promoter-referral-commissions/spec.md`
**Status:** Approved by explicit user implementation request, adapted to current Phase 1 architecture

## Architecture

The PostgreSQL layer owns attribution validation, snapshots, commission calculation, idempotency, role checks, and audit entries. TypeScript exposes pure normalization/calculation/link/token contracts for future routes without accepting monetary values from browsers.

## Reuse

| Existing asset | Use |
| --- | --- |
| `orders.ticket_type_id` and `quantity` | Preserve the one-product order model |
| `ticket_types.price` | Source the immutable unit-price snapshot |
| `orders.payment_status` | Drive pending/earned/cancelled commission transitions |
| `current_admin_role()` | Authorize payout/reversal RPCs and RLS |
| `audit_logs` | Record earned, paid, and cancelled financial events |
| service-role separation | Future server-side referral resolution/order creation |

## Data Model

- `promoters`: contact details, normalized unique code, active status.
- `ticket_types.commission_amount`: current rate for new orders only.
- `orders`: nullable all-or-none attribution tuple plus non-null unit price and commission snapshots.
- `commissions`: one row per referred order with pending/earned/paid/cancelled state and lifecycle timestamps.

No `order_items` table is added because mixed products are not supported.

## State Rules

```text
order awaiting_payment -> no commission row
order submitted        -> pending
order verified         -> earned (upsert by unique order_id)
earned                 -> paid (super admin RPC)
pending/earned/paid     -> cancelled (super admin RPC with reason)
rejected/cancelled      -> pending/earned auto-cancel; paid requires explicit reversal
```

## Security Decisions

- A before-insert trigger overwrites all financial snapshots from `ticket_types`.
- A before-insert/update trigger validates complete attribution and blocks later replacement.
- Commission rows deny direct inserts/updates/deletes to authenticated clients.
- Payment admins may read promoter context needed for review; only super admins manage promoters, payouts, and reversals; gate staff have no access.
- Referral links are derived from `APP_ORIGIN` and code rather than storing a domain-coupled URL.

