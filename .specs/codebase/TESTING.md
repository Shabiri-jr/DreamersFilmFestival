# Testing Infrastructure

## Existing Frameworks

- SQL parsing/invariants: Node.js script using `pgsql-parser`
- Type safety: `tsc --noEmit`
- Static quality: ESLint with zero warnings
- Compile verification: Next.js production build
- Unit tests: Node test runner with TypeScript through `tsx`
- Live database tests: disposable hosted-Supabase scenarios with cleanup in `finally`
- Browser testing: visible Playwright journeys against disposable fixtures
- QR/PNG verification: generated 1200×1920 PNG decoded back to the exact validation URL

## Organization

- `scripts/verify-migration.mjs` parses all migrations and asserts security/schema invariants.
- `tests/phase5.test.ts` covers credential uniqueness/separation, ticket quantities/admissions, WhatsApp copy, and PNG QR decoding.
- `scripts/verify-phase5-live.mjs` covers verified-only issuance, concurrency/idempotency, roles, cancellation, failure/retry, and commission regression.

## Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test:sql`
- `npm run build`
- `npm run check` runs the complete existing suite.

## Limitations

Visible Playwright is currently an operator-run verification rather than a committed CI suite. Hosted live tests require the configured private service-role environment and deliberately create then remove isolated test records.
