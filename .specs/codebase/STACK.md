# Tech Stack

**Analyzed:** 2026-08-26

## Core

- Framework: Next.js 16.3.3 App Router
- Language: TypeScript 6.0.3 in strict mode
- Runtime: Node.js 20.9 or newer
- Package manager: npm

## Frontend

- UI: React 19.2.8 server and client components
- Styling: Tailwind CSS 4.3.3 plus CSS custom properties
- State/forms: no application state or form library exists yet

## Backend and Data

- API style: planned Next.js server actions/route handlers; none exist yet
- Database: hosted Supabase PostgreSQL with handwritten SQL migrations
- Authentication: Supabase Auth clients are configured; no admin login flow exists
- Storage: private Supabase Storage bucket for payment receipts

## Testing

- SQL structure: `pgsql-parser` plus repository invariant checks
- Unit/integration/E2E: not present before this feature

## Development Tools

- ESLint 9.39.5 with `eslint-config-next`
- Next.js production build and TypeScript no-emit checks

