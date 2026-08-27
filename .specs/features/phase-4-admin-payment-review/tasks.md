# Phase 4 Admin Payment Review Tasks

**Status:** Done

## Execution Plan

1. [x] T1 — Add the Phase 4 migrations and SQL invariants.
2. [x] T2 — Extend TypeScript contracts and pure review helpers.
3. [x] T3 — Add server authentication/authorization and auth actions.
4. [x] T4 — Add admin data reads and receipt proxy.
5. [x] T5 — Add dashboard, queue, review, and promoter screens.
6. [x] T6 — Update customer states and focused unit tests.
7. [x] T7 — Apply migrations and run lint, typecheck, unit, SQL, build, browser, and live financial tests.
8. [x] T8 — Run security/quality audit and update project state/docs.

## Done When

- T1: PostgreSQL parses; direct order writes are removed; review RPCs lock, authorize, audit, and do not issue tickets.
- T2: strict TypeScript models review state without client-supplied money or roles.
- T3: anonymous/inactive/gate users cannot enter finance routes or call finance actions.
- T4: queue/search is database-authorized and receipts remain private/no-store.
- T5: admin screens work at 390, 430, 768, and 1280px with keyboard-accessible confirmations.
- T6: verified copy says ticket preparation; rejected reasons and resubmission remain available.
- T7: all automated checks and live role/state-transition scenarios pass.
- T8: validation report records evidence, limitations, and manual Supabase steps.
