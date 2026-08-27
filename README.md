# Dreamers Pass

The official direct-transfer ticketing and event-entry system for The Dreamers Film Festival.

This repository contains the completed core journey through **Phase 6 event check-in**. Customers can purchase, submit private bank-transfer evidence, receive a verified digital pass, download its PNG, and share its secure link manually through WhatsApp. Authorized phone-based Gate Staff can scan or search passes, confirm group admission, and atomically redeem one credential while Super Admins inspect attendance history.

## Stack

- Next.js 16 App Router and React 19
- Strict TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, and private Storage
- Dynamically loaded `qr-scanner` camera island for modern Android/iPhone browsers
- Vercel-compatible architecture (not deployed)

## Local Setup

Requirements:

- Node.js 20.9 or newer
- npm
- A Supabase project, or Docker plus the Supabase CLI for a local stack

Install and run the application:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Customer routes read festival and ticket data from Supabase, so apply the migrations and seed before running the journey.

Run all repository checks:

```powershell
npm run check
```

## Environment Contract

Copy `.env.example` to `.env.local` and replace the examples:

| Variable | Browser-visible | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key; RLS remains the authorization boundary |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Privileged server operations only |
| `APP_ORIGIN` | No | Canonical origin for redirects, public pass URLs, downloads, and QR payloads; use the final HTTPS domain in production |
| `REFERRAL_ATTRIBUTION_SECRET` | No | HMAC secret for 30-day referral attribution tokens; use at least 32 random characters |
| `ORDER_ACCESS_SECRET` | No | Separate HMAC secret for privacy-scoped payment-summary access; use at least 32 random characters |

Never add the service-role value to a `NEXT_PUBLIC_*` variable. `.env*` files are ignored except `.env.example`.

## Supabase Setup

For a local Supabase stack:

```powershell
npx supabase start
npx supabase db reset
```

For a hosted project:

1. Create a Supabase project.
2. Copy its project URL, anon key, and service-role key into `.env.local`.
3. Link the CLI with `npx supabase link --project-ref YOUR_PROJECT_REF`.
4. Review the migration, then apply it with `npx supabase db push`.
5. Run `supabase/seed.sql` in the Supabase SQL editor after reviewing the festival values.
6. In Supabase Auth, keep public sign-up disabled. Create the first staff user manually.
7. Bootstrap the first super admin from the SQL editor/service-role context using that Auth user UUID:

```sql
insert into public.admin_profiles (user_id, name, email, role)
values ('AUTH-USER-UUID', 'Festival Administrator', 'admin@example.com', 'super_admin');
```

Replace every example value before running it. Later staff management will move into a protected super-admin workflow.

## Database Model

- `ticket_types` defines products, prices, stock controls, and `admissions_per_unit`.
- `promoters` stores contact details, normalized referral codes, and active state.
- `ticket_types.commission_amount` is the current rate used only for new order snapshots.
- `orders` records one customer purchase, transfer evidence/status, immutable referral attribution, unit-price snapshot, and commission-rate snapshot.
- `commissions` stores one idempotent pending/earned/paid/cancelled lifecycle record per referred order.
- `payment_submissions` preserves each evidence attempt, its expected/entered amount snapshots, review flags, and private receipt path.
- `tickets` stores one immutable credential per purchased product unit, with snapshotted product name and admission count plus independent public-access and QR secrets.
- `admin_profiles` maps Supabase Auth users to super-admin, payment-admin, or gate-staff roles.
- `check_ins` records the single accepted admission event for a ticket, including immutable admission-count and QR/manual-source snapshots.
- `audit_logs` records sensitive operational actions.
- `event_settings` stores the single-event MVP configuration.

A purchase unit is not always one admission. One Network unit admits five people and one Afatakpa unit admits two. Phase 5 issuance generates:

```text
ticket credential count = order.quantity
```

Each credential snapshots `admissions_per_unit`; therefore Network × 1 produces one QR admitting five, while Network × 2 produces two QRs admitting five each. Every ticket receives a human code and two independent 256-bit secrets: one for customer pass access and one for QR validation.

Promoter commission is per purchased product unit, not per admitted attendee:

```text
commission amount = order.quantity × order.commission_rate_snapshot
```

The database creates a pending row only after payment submission and earns it only when the order reaches `verified`. Repeating verification cannot create a duplicate because `commissions.order_id` is unique. Payout and explicit cancellation/reversal use super-admin-only audited RPCs.

## Security Foundation

- Browser, request-scoped server, and service-role Supabase clients live in separate modules.
- Privileged modules import `server-only`; service credentials cannot be imported into client code safely.
- RLS is enabled on every application table.
- Anonymous table access is explicitly revoked; future public writes are server-mediated.
- Gate Staff have no direct ticket/check-in table access. Bounded, role-checked RPCs expose only validation, search, atomic redemption, and safe attendance metrics; raw credentials and financial/customer-contact records remain unavailable.
- The `payment-receipts` bucket is private, limited to 5 MiB, and allowlists JPEG, PNG, WEBP, and PDF metadata. No direct browser object policy exists.
- UUID primary keys prevent trivial enumeration; human support codes remain separate.
- Security headers and a per-request CSP nonce are set at the Next.js boundary.
- Order price, commission rate, total, and referral attribution are captured/validated by database triggers and become immutable.
- Customer order creation is a service-role-only, idempotent database RPC with server-side sales, ticket, quantity, availability, price, and total validation.
- Payment submission validates fields, date, extension, MIME, size, and file signature on the server, stores a random private path, and uses an order-locked service-role RPC.
- Payment evidence can move an awaiting/rejected order only to `submitted`; repeated attempts collapse to one active row and are audited.
- Referral and payment-summary cookies are signed, HTTP-only, same-site tokens. Customer mutations enforce the configured request origin.
- Gate staff cannot read promoters or commissions. Payment admins may read verification context; only super admins can manage promoters, mark payouts, or reverse commissions.
- Supabase Auth sessions are refreshed at the request boundary. Every `/admin` data function and financial action rechecks the active role server-side.
- Staff cannot update order payment state directly. Locked `verify_customer_payment` and `reject_customer_payment` RPCs own review transitions, actor/time fields, submission state, commission trigger execution, and audit records in one transaction.
- Receipt bytes are served only through a finance-role-protected, same-origin, no-store route; private paths and permanent object URLs are never exposed.
- Payment-queue contains-search is bounded and backed by trigram GIN indexes.
- Ticket issuance accepts verified orders only, locks per order, derives count and snapshots on the server/database, and is idempotent under repeat or concurrent requests.
- Payment verification and issuance are separate transactions: an issuance failure never reverts a verified payment or earned commission and can be retried safely.
- Public pass access and QR validation use different bearer credentials looked up by SHA-256 hash. Pass, validation, and PNG responses are private/no-store and never expose another ticket.
- Public QR validation remains read-only. Only authenticated Gate Staff or Super Admins can invoke the row-locking `valid → checked_in` RPC.
- QR/manual check-in uses one transaction that rechecks verified payment, issued state, valid ticket status, and null check-in time; it then writes ticket state, the admission snapshot, and an audit event. Concurrent/repeated redemption produces exactly one success.
- Public validation and staff gate actions have separate database-backed rate windows. Scanned URLs are never followed and must match the canonical validation origin/path.
- Check-in requires backend connectivity. The phone UI disables redemption offline and never reports a local success.

## Project Memory

- Product scope: `.specs/project/PROJECT.md`
- Roadmap: `.specs/project/ROADMAP.md`
- Decisions and blockers: `.specs/project/STATE.md`
- Phase 1 spec/design/tasks: `.specs/features/phase-1-foundation/`
- Promoter commission spec/design/tasks/validation: `.specs/features/promoter-referral-commissions/`
- Phase 2 customer purchase spec/design/tasks: `.specs/features/phase-2-customer-purchase/`
- Phase 3 payment submission spec/design/tasks/validation: `.specs/features/phase-3-payment-submission/`
- Phase 4 admin review spec/design/tasks/validation: `.specs/features/phase-4-admin-payment-review/`
- Phase 5 digital tickets spec/design/tasks/validation: `.specs/features/phase-5-digital-tickets/`
- Phase 6 event check-in spec/design/tasks/validation: `.specs/features/phase-6-event-check-in/`
- Persistent visual rules: `design-system/MASTER.md`

## Current Boundary

Phase 6 is complete. `/check-in` is a mobile-first, online-only operational route for Gate Staff and Super Admins. It prefers the rear camera, pauses after one decode, validates server-side, requires final confirmation, uses the same atomic RPC for QR and manual lookup, distinguishes invalid/cancelled/already-used states, refreshes pass/people metrics, and updates the customer pass to `checked_in`. Network remains one credential admitting five and Afatakpa one admitting two; Phase 6 expects each group to enter together.

The Phase 6 migrations have been applied to the linked hosted Supabase project. Before production, set `APP_ORIGIN` to the final HTTPS domain, create real active Gate Staff profiles, and complete the Android/iPhone hardware checklist in `.specs/features/phase-6-event-check-in/validation.md`.

Unpaid orders still validate inventory at creation time but do **not** reserve or decrement it. Phase 7 is intentionally not started; its recommended scope is operational analytics/exports, event controls, promoter payout administration, emergency procedures, and final production readiness.
