# Phase 6 Event Check-In Validation

**Date:** 2026-08-27  
**Overall:** PASS for code, database, responsive workflows, and mocked camera states. Physical phone-camera acceptance remains a required production check.

## Automated Results

| Check | Result |
| --- | --- |
| ESLint | PASS — zero warnings |
| Strict TypeScript | PASS |
| Unit tests | PASS — 45 tests |
| SQL parser/invariants | PASS — 11 migrations, 79 invariants |
| Live hosted Supabase | PASS |
| npm audit | PASS — zero known vulnerabilities |
| Production build | PASS |

## Live Supabase Evidence

- Gate Staff and Super Admin can use bounded lookup/redemption RPCs; Payment Admin and anonymous sessions are rejected.
- QR lookup is hash-addressed and returns no raw credential, customer contact, payment, promoter, receipt, or banking data.
- Manual ticket-code and normalized Nigerian phone searches resolve the same safe result model.
- Two authenticated staff clients redeemed the same ticket concurrently: exactly one returned `checked_in`; the other returned `already_used`.
- One ticket row, one check-in row, and one audit event shared the same successful state transition and timestamp.
- Replays return `already_used` without a second check-in or attendance increment.
- Cancelled and unknown credentials cannot be redeemed.
- Direct authenticated ticket/check-in table reads and writes are rejected; gate operations are RPC-only.
- Network, Afatakpa, and Dreamer snapshots redeemed as 5, 2, and 1 admissions respectively.
- A mixed live run of 3 Dreamer + 1 Network + 1 Afatakpa produced 5 passes and 10 people. A second Network pass brought the verified delta to 6 passes and 15 people.
- Check-in history is Super Admin-only and contains the credential-safe ticket code, holder, type, admissions, source, staff, and time.
- Disposable users, orders, tickets, check-ins, rate windows, and audit fixtures were removed.

## Browser Evidence

- Gate login redirected to `/check-in`; the phone gate account had no admin-history link and `/admin` redirected to the unauthorized screen.
- Super Admin manual ticket search displayed Network as one pass admitting five, required final confirmation, redeemed it, and refreshed metrics from 0/0 to 1 pass/5 people.
- The customer QR validation page changed from valid to `checked_in` after redemption.
- Super Admin history displayed the same ticket, five admissions, manual source, staff, and timestamp.
- The gate route had no document-level horizontal overflow at 375, 390, 430, 768, and 1280 CSS-pixel viewport targets.
- Mocked no-camera and denied-permission states kept manual search available and showed safe explanations.
- Mocked offline state changed the indicator, disabled camera/search mutations, and displayed a connection-required warning.
- Final fresh-page console inspection reported zero browser errors; the only expected local warning was the scanner library reminding that production camera access requires HTTPS.

## Security Review

- The QR parser accepts only a raw 256-bit credential or the canonical `/validate/{credential}` URL; it never follows scanned URLs.
- The server hashes credentials before the database RPC. Raw secrets are not returned, rendered, stored in history, or logged by application code.
- Validation/search/redeem inputs are bounded and staff-rate-limited. Public validation uses a separate HMAC-keyed database rate window.
- Manual and QR entry call the same row-locking redemption function. The browser cannot supply ticket status, holder, admission count, or financial state.
- The transaction rechecks valid status, null check-in time, verified payment, and issued ticket state under a row lock.
- Gate Staff cannot enumerate tickets directly or reach orders, receipts, payment decisions, promoter data, commissions, or check-in history.
- No offline success path, Gate Staff reversal, partial group redemption, rotating QR, or invasive device fingerprinting was introduced.

## Problems Found and Corrected

- Live concurrency exposed an ambiguous PL/pgSQL `checked_in_at` reference. Forward migration `202608270011_phase_6_redeem_qualification.sql` qualifies the locked update; the same live race then passed.
- Browser testing exposed an online/offline hydration mismatch. Connection state now uses `useSyncExternalStore` with a stable server snapshot.
- The scanner library normalizes denied `getUserMedia` attempts to a generic camera error. The UI now also checks the browser Permissions API where supported.
- The existing admin shell expanded wider than a phone when history contained a wide table. The shell now constrains the navigation/content grid while the table scrolls internally.

## Physical Device Tests Required

These were not falsely represented as automated camera-hardware tests:

1. Deploy to the final HTTPS origin and scan an issued QR using at least one modern Android phone and one iPhone, confirming rear-camera preference.
2. Deny, then re-enable, camera permission in Chrome Android and Safari iOS settings.
3. Confirm the camera indicator stops after a scan, Stop Camera, route navigation, backgrounding, and sign-out.
4. Scan printed, dim, angled, cracked-screen, and screenshot QRs under actual gate lighting.
5. Run two physical phones at separate gates against the same QR and confirm only one entry succeeds.
6. Keep the scanner open through an event-length session and observe battery, heat, CPU, memory, network handoffs, and haptic behavior.
7. Test weak/failed mobile data and the festival's approved non-app emergency procedure; the app must never claim an offline check-in succeeded.

## Residual Operational Requirements

- `APP_ORIGIN` is still local and must become the deployed HTTPS origin before production issuance/scanning.
- Festival staff accounts must be created in Supabase Auth with matching active `admin_profiles` roles.
- Group credentials are all-or-nothing in Phase 6: Network members (5) and Afatakpa couple members (2) must enter together.
