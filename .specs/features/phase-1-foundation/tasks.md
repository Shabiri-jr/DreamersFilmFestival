# Phase 1 Foundation Tasks

**Design:** `.specs/features/phase-1-foundation/design.md`
**Status:** Done

## Execution Plan

`T1 → T2 → T3 → T4 → T5 → T6 → T7`

## Task Breakdown

### T1: Create project specification set

**What:** Persist product vision, roadmap, state, Phase 1 spec, design, and tasks.
**Where:** `.specs/`
**Depends on:** None
**Tools:** `apply_patch`; `tlc-spec-driven`

**Done when:**

- [x] Scope, boundaries, architecture, acceptance criteria, and decisions are explicit.
- [x] Later phases remain planned, not implemented.

### T2: Configure the Next.js foundation

**What:** Create package/configuration files for strict TypeScript, Tailwind, linting, and repeatable quality scripts.
**Where:** Project root
**Depends on:** T1
**Tools:** `apply_patch`, npm; `javascript-typescript`, `coding-guidelines`, `tailwindcss`, `best-practices`

**Done when:**

- [x] Dependencies install with a lockfile.
- [x] `npm run typecheck`, `npm run lint`, and `npm run build` pass.

### T3: Create the branded application shell

**What:** Add the root layout, brand tokens, accessible foundation status page, and local reference poster.
**Where:** `src/app/`, `public/brand/`
**Depends on:** T2
**Tools:** `apply_patch`, `Copy-Item`; design, responsive, interaction, animation, and performance skills

**Done when:**

- [x] `/` identifies Dreamers Pass and Phase 1 without fake functional controls.
- [x] The shell matches the supplied festival palette and motifs.
- [x] Mobile, tablet, and desktop layouts have no overflow.

### T4: Define shared domain and database types

**What:** Encode roles, states, table rows, and the Supabase database interface.
**Where:** `src/types/`
**Depends on:** T2
**Tools:** `apply_patch`; `javascript-typescript`

**Done when:**

- [x] Order and ticket types remain distinct.
- [x] TypeScript passes with strict checking.

### T5: Implement Supabase environment and client boundaries

**What:** Add public, request-scoped server, and service-role clients with explicit server-only guards.
**Where:** `src/lib/env/`, `src/lib/supabase/`, `.env.example`
**Depends on:** T2, T4
**Tools:** `apply_patch`; security and Next.js best-practice guidance

**Done when:**

- [x] No service-role variable has a `NEXT_PUBLIC_` prefix.
- [x] Privileged client module imports `server-only`.
- [x] Build succeeds without real credentials when no data client is invoked.

### T6: Create migration and seed structure

**What:** Define extensions, enums, tables, relationships, constraints, indexes, timestamps, RLS, private storage, and festival seed records.
**Where:** `supabase/`
**Depends on:** T4
**Tools:** `apply_patch`; security guidance

**Done when:**

- [x] Automated SQL parse and structure assertions pass.
- [x] All private tables have RLS enabled.
- [x] Network and Afatakpa products encode five and two admissions per unit.

### T7: Document and verify Phase 1

**What:** Add setup/architecture/security notes, run static and browser checks, record validation, and update project state.
**Where:** `README.md`, `.specs/`, verification artifacts outside source
**Depends on:** T2-T6
**Tools:** npm, Playwright, audit/verify skill

**Done when:**

- [x] App start, lint, typecheck, build, dependency audit, SQL assertions, and responsive browser checks are reported honestly.
- [x] Live Supabase steps that require credentials are clearly listed as manual.

## Task Granularity Check

Each task owns one cohesive deliverable category. Implementation remains sequential because this is a greenfield foundation and later steps depend on the contracts established by earlier ones.
