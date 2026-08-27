# Phase 4 Admin Payment Review Design

**Spec:** `.specs/features/phase-4-admin-payment-review/spec.md`  
**Status:** Approved by implementation brief

## Architecture

Supabase Auth cookies identify staff. Server components and actions load the active `admin_profiles` row. Finance decisions call authenticated, security-definer PostgreSQL functions which re-check the database role, lock the order, update the payment submission and order, let the existing commission trigger activate the snapshot amount, and write audit records in one transaction.

## Reuse

| Existing asset | Reuse |
| --- | --- |
| `createClient()` | Request-scoped Supabase Auth and RLS queries |
| `createAdminClient()` | Receipt object retrieval only after staff authorization |
| `current_admin_role()` | Database-side active-role authority |
| `sync_order_commission()` | Existing order-unique pending/earned/cancelled lifecycle |
| `payment_submissions` | Immutable evidence history and active-submission constraint |
| order snapshots | Historical price and commission preview/calculation |
| `assertTrustedOrigin()` | Defense-in-depth for login/logout/review server actions |

## Components

- `lib/admin/auth.ts`: authenticated staff profile and role guards.
- `lib/admin/data.ts`: RLS-backed dashboard, queue, detail, and promoter reads.
- `lib/admin/actions.ts`: validated login/logout/verify/reject actions.
- `app/admin/(protected)/layout.tsx`: server route boundary and operations shell.
- `app/admin/api/receipts/[submissionId]/route.ts`: authorized no-store receipt proxy.
- Admin pages/components: dashboard, queue, review confirmation, promoter reports.

## Database

- Add rejection actor/time columns to `orders`.
- Remove direct authenticated order UPDATE permission/policy.
- Add locked `verify_customer_payment` and `reject_customer_payment` RPCs.
- Add authorized queue RPC and search indexes.
- Preserve unique `commissions.order_id` and the existing snapshot trigger.

## Error Handling

- Missing/invalid auth redirects to login; wrong role returns an unauthorized screen.
- Reviewed orders produce a stable already-reviewed message and no mutation.
- Receipt failures return generic 404/403 responses with no storage path.
- Any commission/audit failure rolls back the verification transaction.

## Decisions

- Receipt bytes are proxied through the application rather than exposing a durable object URL.
- Finance data is never shared-cached; protected pages and receipt routes are dynamic/no-store.
- Promoter payout writes remain deferred because the current audited RPC is stable and payout UI is not necessary for Phase 4 acceptance.
