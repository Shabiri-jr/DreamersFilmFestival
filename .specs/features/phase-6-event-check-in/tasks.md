# Phase 6 Event Check-In Tasks

**Design:** `.specs/features/phase-6-event-check-in/design.md`  
**Status:** Complete — physical phone-camera acceptance remains an explicit production check

## Tasks

- [x] T1 — Add the additive check-in migration: snapshots/source, rate windows, bounded RPCs, atomic redemption, history, grants/RLS hardening, indexes, and SQL invariants.
- [x] T2 — Extend TypeScript database/domain contracts and add credential/search/result normalization tests.
- [x] T3 — Add Gate Staff authorization, role-aware login redirect, check-in data services, and Server Actions.
- [x] T4 — Build the phone-first scanner interaction island with camera states, debounce, cleanup, connection feedback, confirmation, and haptics.
- [x] T5 — Build `/check-in` event context, metrics, scanner/manual workflows, loading/error boundaries, and responsive operational styling.
- [x] T6 — Add Super Admin `/admin/check-ins` history/filter UI and navigation.
- [x] T7 — Update public/customer pass checked-in state and add practical public-validation throttling.
- [x] T8 — Add unit, live database concurrency/RLS, Playwright camera-mock/responsive/workflow, performance, and security regression tests.
- [x] T9 — Run the full audit, apply migrations, clean disposable data, update project memory/docs, and document physical-phone checks.

## Done When

- Every Phase 6 acceptance criterion has direct automated evidence or is explicitly identified as a physical-device test.
- No check-in path trusts client ticket facts, no offline path reports success, and no role gains unrelated financial access.
