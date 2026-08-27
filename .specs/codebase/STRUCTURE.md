# Project Structure

**Root:** `C:/Users/sayoa/Documents/ChatGPT/Dreamers pass`

```text
.
|-- .specs/
|   |-- features/
|   `-- project/
|-- design-system/
|-- public/
|-- scripts/
|-- src/
|   |-- app/
|   |-- lib/
|   |-- types/
|   `-- proxy.ts
`-- supabase/
    |-- migrations/
    |-- config.toml
    `-- seed.sql
```

## Where Things Live

- UI/routes: `src/app`
- Digital ticket components: `src/components/digital-pass.tsx`, `src/components/issued-pass-list.tsx`
- Environment and data clients: `src/lib`
- Ticket credential, issuance, PNG, and sharing services: `src/lib/tickets`
- Shared contracts: `src/types`
- Database definition and authorization: `supabase/migrations`
- Local seed values: `supabase/seed.sql`
- Static database verification: `scripts/verify-migration.mjs`
- Live disposable Phase 5 verification: `scripts/verify-phase5-live.mjs`, `scripts/phase5-browser-fixture.mjs`
- Product decisions and validation reports: `.specs`
