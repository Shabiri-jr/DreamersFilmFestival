# Phase 2 Validation

**Validated:** 2026-08-26  
**Result:** PASS  
**Boundary:** Customer purchase flow only; Phase 3 payment submission remains absent.

## Repository Checks

- `npm run check` — PASS
- ESLint with zero warnings — PASS
- Strict TypeScript — PASS
- Unit tests — 15/15 PASS
- PostgreSQL migration invariants — 46/46 PASS
- Next.js production build — PASS
- `npm audit --audit-level=high` — 0 vulnerabilities

## Browser Journey

Playwright ran the real Next.js application against a non-production Supabase-compatible local test double because no project credentials were present.

- Homepage → Dreamer selection → checkout → protected payment summary — PASS
- Dreamer quantity 3 totals ₦9,000 — PASS
- Network is ₦12,000 and admits five — PASS
- Afatakpa is ₦70,000 and admits two — PASS
- Active referral link persists and records `referral_link` — PASS
- Existing first-touch referral cannot be replaced by a second URL — PASS
- Manual active code records `manual_code` — PASS
- Invalid and inactive referrals remain unassigned with readable messages — PASS
- Browser-injected price, total, commission, and payment status are ignored — PASS
- Rapid double submission creates one order — PASS
- Sales-closed state prevents checkout — PASS
- Payment summary is unavailable from an unrelated browser context — PASS
- Every created order remained `awaiting_payment` — PASS
- Commission rows created — 0
- Ticket rows created — 0

## Responsive and Accessibility Smoke Checks

- Viewports: 375, 390, 430, 768, and 1280 pixels
- No horizontal overflow on landing or ticket routes
- Interactive controls had accessible names
- Visible semantic labels, form errors, focus treatments, touch targets, alt text, and reduced-motion CSS were exercised/inspected

## Manual Production Validation Still Required

- Apply all migrations to the target Supabase project.
- Configure production bank details and verify the seeded event/ticket data.
- Set the required server/public environment values.
- Repeat a short smoke purchase against the real project before opening sales.

