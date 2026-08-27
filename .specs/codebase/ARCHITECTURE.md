# Architecture

**Pattern:** Single Next.js application with Supabase as the data, auth, and storage platform.

## High-Level Structure

The repository is a single Phase 1–5 application. `src/app` contains customer, public pass, read-only validation, and role-protected admin routes. `src/lib` separates browser, request-scoped server, service-role, payment, referral, admin, and ticket modules. `supabase` owns the relational schema, locked RPCs, grants/RLS, and seed data. Handwritten database types mirror that schema.

## Identified Patterns

### Server-mediated public writes

**Location:** `.specs/project/STATE.md`, `src/lib/supabase/*`

Public customer flows use validated server actions or route handlers. The browser client does not receive service-role credentials, and anonymous direct table access is revoked.

### Database-enforced financial boundaries

**Location:** `supabase/migrations/`

PostgreSQL constraints, role helpers, grants, and RLS are the final authorization boundary. This is the correct layer for referral integrity, immutable financial snapshots, idempotent commission activation, and payout permissions.

### Single product per order

**Location:** `public.orders`

Each order references one `ticket_type_id` and a quantity. Group/couple admissions are represented by `ticket_types.admissions_per_unit`, not order items. Mixed-ticket orders are not supported.

## Existing Data Flows

### Purchase, payment, and ticketing

Order creation is service-mediated and idempotent. Receipt submission uses private Storage plus a locked RPC. Finance-role RPCs verify/reject payments and own commission transitions. A separate idempotent issuance RPC creates `order.quantity` credentials for verified orders; each snapshots the product name and admissions per unit. Customer public-pass, PNG, and QR-validation routes resolve independent hashed bearer credentials. Check-in mutation is not implemented.

### Security

The root response applies a nonce-based CSP. Supabase clients are separated by trust level. Admin roles are stored in `admin_profiles`; gate staff cannot read orders, payment information, promoter finances, or raw bearer credentials. Public pass surfaces are dynamic and no-store.

## Module Boundaries

- `src/app`: routes and presentation
- `src/lib/env`: public/server environment validation
- `src/lib/supabase`: trust-separated database clients
- `src/lib/tickets`: server-only credentials, issuance, reads, presentation, PNG, and WhatsApp helpers
- `src/types`: domain and database contracts
- `supabase/migrations`: schema, functions, constraints, grants, and RLS
- `scripts`: static migration verification
