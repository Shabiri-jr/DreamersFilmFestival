# Phase 1 Foundation Specification

## Problem Statement

Dreamers Pass needs a secure, maintainable foundation before customer, admin, ticketing, or check-in behavior is built. The foundation must encode the order-versus-ticket distinction, privilege boundaries, and festival identity without presenting later-phase behavior as complete.

## Goals

- [x] Create a locally runnable Next.js TypeScript application with Tailwind and a basic branded shell.
- [x] Define a Supabase-ready schema with correct relationships, constraints, indexes, RLS posture, and private receipt storage.
- [x] Document environment variables, local setup, architecture boundaries, security risks, and remaining manual steps.

## Out of Scope

- Customer purchasing, payment submission, admin workflows, QR generation/scanning, analytics, exports, and deployment.
- Live Supabase provisioning without user-provided project credentials.

---

## User Stories

### P1: Maintainable application base

**User Story:** As a product engineer, I want a strict, conventional project foundation so later phases can add vertical slices without architectural rewrites.

**Acceptance Criteria:**

1. WHEN dependencies are installed THEN the system SHALL start in development mode.
2. WHEN the repository is checked THEN TypeScript, lint, and production build SHALL pass.
3. WHEN the base route is opened THEN the system SHALL render an honest Phase 1 shell and SHALL NOT imply later workflows are functional.
4. WHEN the shell is viewed at 375px, 768px, and desktop widths THEN it SHALL avoid horizontal overflow and preserve readable hierarchy.

**Independent Test:** Run the quality scripts and open `/` at the required viewports.

### P1: Secure Supabase boundary

**User Story:** As an engineer, I want browser, authenticated server, and privileged server clients separated so service credentials cannot enter client bundles.

**Acceptance Criteria:**

1. WHEN source boundaries are inspected THEN service-role access SHALL exist only in a `server-only` module.
2. WHEN environment configuration is inspected THEN public and private variables SHALL be explicitly separated and documented.
3. WHEN credentials are absent THEN environment access SHALL fail with a clear server-side configuration error only when a client is instantiated.

**Independent Test:** Run static security checks and import/type validation without a real `.env.local`.

### P1: Correct relational domain model

**User Story:** As a festival operator, I want orders and tickets modeled separately so a multi-person purchase can issue independent admissions.

**Acceptance Criteria:**

1. WHEN a ticket product admits multiple people THEN the schema SHALL retain its per-unit admission count.
2. WHEN tickets are later issued THEN each ticket row SHALL have its own unique code and cryptographically random token.
3. WHEN tables are inspected THEN foreign keys, state enums, checks, uniqueness constraints, and operational indexes SHALL be present.
4. WHEN RLS is inspected THEN all private tables and the receipts bucket SHALL deny unplanned direct access by default.

**Independent Test:** Parse the migration, run repository SQL assertions, and apply it to a local or hosted Supabase project when credentials become available.

## Edge Cases

- WHEN quantity or money values are negative or zero where disallowed THEN database constraints SHALL reject the row.
- WHEN an order claims more issued tickets than purchased admissions THEN a later server transaction SHALL be required to enforce generation; Phase 1 SHALL document this invariant.
- WHEN two gate operators try to check in one ticket THEN a later atomic database function SHALL own the transition; it is designed but not implemented in Phase 1.
- WHEN receipt access is attempted directly THEN no public storage policy SHALL grant it.

## Success Criteria

- [x] App start, lint, typecheck, and production build succeed.
- [x] Automated SQL parse and structure assertions pass.
- [x] Dependency audit has no unresolved high/critical production vulnerability.
- [x] Browser checks pass at mobile, tablet, and desktop widths with no console error or horizontal overflow.
