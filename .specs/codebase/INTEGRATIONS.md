# External Integrations

## Supabase

**Purpose:** PostgreSQL data, Supabase Auth identities, and private receipt storage.

**Implementation:** `src/lib/supabase` contains browser, request-scoped server, and service-role clients. `supabase/migrations` defines schema/RLS; `supabase/seed.sql` defines festival data.

**Configuration:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`.

**Authentication:** Supabase Auth user IDs are linked to `admin_profiles`; authorization is based on active admin roles.

## QR, image, and messaging support

`qrcode` renders validation QR images and `sharp` composes full-resolution ticket PNGs on demand. WhatsApp remains a manual `wa.me` handoff with a prefilled message and secure pass link; the app truthfully tells staff/customers that downloaded images must be attached separately. No WhatsApp API, webhook, queue, payment gateway, or background job exists.
