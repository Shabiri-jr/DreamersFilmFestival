# Promoter Referral Commissions Specification

## Problem Statement

Promoters need durable credit for ticket orders they refer, and commissions must become earned only through successful payment verification. Financial history must remain correct if ticket prices or commission rates change later.

## Goals

- [ ] Store active promoters and immutable order attribution safely.
- [ ] Snapshot ticket price and commission rate per current single-product order.
- [ ] Maintain one idempotent commission record per referred order.
- [ ] Restrict promoter finance and payout operations to appropriate admin roles.
- [ ] Define reusable referral contracts for the future checkout/admin flows.

## Current Increment Boundary

The repository has no checkout, payment verification action, admin UI/auth flow, ticket issuing service, or promoter authentication. This increment implements the database/domain foundation those flows will call. It does not create placeholder screens or redesign orders into mixed-ticket carts.

## P1 User Stories

### Secure promoter attribution

As the system, I need to resolve only active referral codes and permanently snapshot attribution on an order.

1. WHEN a valid active code is supplied THEN the order SHALL store promoter ID, normalized code, and source.
2. WHEN a code is invalid or inactive THEN attribution SHALL be rejected.
3. WHEN attributed order fields are updated THEN the database SHALL reject replacement.
4. WHEN a promoter is later deactivated THEN existing attribution SHALL remain intact.

### Historically accurate commission

As an administrator, I need commission based on product quantity and the captured rate.

1. WHEN an order is inserted THEN price and commission rate SHALL be captured from its ticket type by the database.
2. WHEN payment is submitted THEN a referred commission SHALL be pending, not earned.
3. WHEN payment becomes verified THEN the commission SHALL be earned as `quantity × commission_rate_snapshot`.
4. WHEN verification repeats THEN no second commission row SHALL be created.
5. WHEN the ticket type rate changes THEN existing order and commission amounts SHALL not change.
6. WHEN payment is rejected/cancelled THEN no commission SHALL remain earned unless it was already paid and requires an explicit reversal.

### Protected promoter finance

1. WHEN a super admin marks an earned commission paid THEN status/timestamp and audit log SHALL update atomically.
2. WHEN a non-super-admin attempts payout or reversal THEN the database SHALL reject it.
3. WHEN gate staff query promoter or commission finance THEN RLS/grants SHALL deny access.
4. WHEN payment admins review an order THEN they MAY read its promoter attribution and commission, but SHALL NOT manage promoters or payouts.

## Deferred Integration Acceptance Criteria

- A future `/tickets?ref=CODE` flow will validate the code server-side and persist a signed 30-day attribution token.
- A future checkout will prefer an existing secure attribution and expose manual code only as fallback.
- Future admin screens will manage promoters, report sales, and call the protected payout/reversal operations.
- The future payment verification transaction will update the order; the commission trigger will activate idempotently in the same database transaction.

## Edge Cases

- Referral codes are trimmed, uppercased, and limited to letters, numbers, underscore, and hyphen.
- An order cannot contain a partial attribution tuple.
- Zero commission is valid for future products; negative values are rejected.
- A paid commission cannot be silently cancelled by changing order status; explicit audited reversal is required first.

