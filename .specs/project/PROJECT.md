# Dreamers Pass

**Vision:** Dreamers Pass is the official direct-transfer ticketing and event-entry system for The Dreamers Film Festival. It gives customers a simple mobile purchase path while giving festival staff secure payment verification and product-unit QR admission controls.
**For:** Festival customers, promoters, payment administrators, gate staff, and festival super administrators.
**Solves:** Direct bank payments need a trustworthy operational layer for evidence review, ticket issuance, WhatsApp handoff, and duplicate-proof check-in.

## Goals

- Let a customer complete the future purchase and payment-evidence flow without creating an account.
- Generate one independent, cryptographically random QR credential for every purchased product unit after payment verification, carrying the unit's admission count.
- Let authorized staff validate and atomically check in a ticket while preventing duplicate admission.
- Keep receipts, bank information, revenue, phone numbers, and administrative operations available only to appropriate roles.
- Keep the customer experience fast and usable from WhatsApp on a 375px-wide mobile device.
- Attribute referred orders durably and pay promoters only for verified ticket-product sales.

## Tech Stack

**Core:**

- Framework: Next.js 16 App Router
- Language: TypeScript with strict checking
- Styling: Tailwind CSS 4
- Database/Auth/Storage: Supabase PostgreSQL, Auth, and private Storage
- Hosting target: Vercel-compatible (deployment is out of scope until explicitly approved)

**Key dependencies:** React 19, `@supabase/supabase-js`, `@supabase/ssr`, ESLint, Playwright for journey verification.

## Scope

**MVP includes:**

- Customer ticket selection, order creation, direct-transfer instructions, receipt submission, and order tracking.
- Role-based payment review, one-ticket-per-product-unit issuance, digital tickets, WhatsApp handoff, and check-in.
- Operational settings, reporting, exports, and audit history after the core journey is proven.
- Promoter management, referral attribution, verified-sale commissions, payout tracking, and later promoter self-service.

**Phase 1 includes only:**

- Project, application shell, environment contract, Supabase client boundaries, database schema/migrations, RLS baseline, shared domain types, seed structure, and setup documentation.

**Promoter foundation increment includes:**

- Additive promoter/commission schema, order attribution and financial snapshots, database-controlled commission transitions, RLS, audit entries, signed attribution primitives, and automated static/unit verification.

**Explicitly out of scope:**

- Customer accounts, payment gateways, automated WhatsApp Cloud API delivery, camera-based QR scanning, analytics, vendor dashboards, marketplace features, crypto/Web3, microservices, and deployment.
- Any Phase 2-8 feature before the user approves the preceding phase.

## Constraints

- Mobile-first and resilient on slower mobile networks.
- Customer-facing surfaces must use the festival's cinematic African identity; admin surfaces will be calmer and operational.
- Financial and personal data must be server-mediated and protected by least-privilege access.
- Every purchased product unit receives one ticket and QR token. The ticket snapshots `admissions_per_unit`, so Network admits five and Afatakpa admits two with one group/couple credential each.
