# Phase 6 Event Check-In Specification

**Status:** Approved by the supplied Phase 6 brief  
**Primary device:** Modern Android and iPhone browsers

## Problem Statement

Dreamers Pass has verified, issued credentials but no authenticated event-entry workflow. Gate Staff need a fast phone interface that validates server-authoritative ticket state, redeems a product-unit credential exactly once, and keeps finance and promoter data outside their role.

## Goals

- Provide a mobile-first `/check-in` workspace for active Gate Staff and Super Admins.
- Scan the static Phase 5 QR credential with the rear phone camera and stop the camera immediately after a result.
- Validate and redeem through locked, role-checked PostgreSQL functions.
- Keep passes checked in and people admitted as separate metrics.
- Provide bounded manual search and Super Admin check-in history.

## Out of Scope

- Offline/local-only redemption or background synchronization.
- Partial group redemption, per-person group records, or splitting one credential.
- Dynamic QR rotation, wallets, NFC, biometrics, check-in reversal, or gate hardware.
- Payment, commission, promoter payout, or ticket-replacement changes.

## User Stories

### P1: Secure phone check-in

**User Story:** As Gate Staff, I want to scan and confirm a pass on my phone so that entry is quick and duplicate use is prevented.

**Acceptance Criteria:**

1. WHEN an active Gate Staff or Super Admin opens `/check-in` THEN the system SHALL show event identity, mobile camera controls, manual search, connection state, and non-financial attendance metrics.
2. WHEN camera access is requested THEN the scanner SHALL prefer the rear camera, show explicit requesting/scanning/denied/no-camera/error states, and clean up streams on stop, result, or unmount.
3. WHEN one QR is detected repeatedly THEN the scanner SHALL pause after the first read and issue only one validation request until the operator chooses to scan again.
4. WHEN a QR payload is submitted THEN the server SHALL accept only the configured Dreamers validation URL or a well-formed Phase 5 token, hash it, and return database-derived operational fields without returning raw credentials or finance data.
5. WHEN a valid pass is confirmed THEN one locked database operation SHALL move it from `valid` to `checked_in`, write its actor/time, create one check-in row with admission snapshot/source, and write an audit event.
6. WHEN simultaneous redemption requests target one valid pass THEN exactly one SHALL succeed and every later request SHALL return already used.
7. WHEN the pass is checked in, cancelled, malformed, unknown, unpaid, or incompletely issued THEN the system SHALL distinguish the safe result and SHALL NOT offer redemption.
8. WHEN the backend cannot confirm a result THEN the client SHALL show connection required and SHALL NOT create a local check-in.

### P1: Group credential behavior

1. WHEN a Dreamer, D'Shift, or Solo credential is redeemed THEN it SHALL count as one pass and one person.
2. WHEN one Network credential is redeemed THEN it SHALL count as one pass and five people.
3. WHEN one Afatakpa credential is redeemed THEN it SHALL count as one pass and two people.
4. WHEN a multi-person pass is confirmed THEN it SHALL be redeemed as a whole; partial arrival is not supported.

### P1: Manual fallback

1. WHEN camera access is unavailable THEN Gate Staff SHALL be able to search by meaningful ticket code, order number, holder name, or normalized WhatsApp number.
2. WHEN a manual result is selected THEN it SHALL use the same confirmation UI and atomic redemption function as QR entry.
3. WHEN a query is blank, too short, or too broad THEN the server SHALL reject or bound it instead of returning a directory.

### P1: Attendance metrics

1. WHEN the dashboard loads or a check-in succeeds THEN it SHALL show issued valid passes, checked-in passes, remaining passes, people admitted, maximum potential attendance, and check-in percentage.
2. WHEN people admitted is calculated THEN it SHALL sum the check-in admission snapshots, not merely count rows.
3. WHEN venue capacity is configured and reached/exceeded THEN the UI SHALL warn but SHALL NOT independently override the redemption rule.

### P2: Super Admin history

1. WHEN a Super Admin opens `/admin/check-ins` THEN they SHALL see time, ticket, holder, pass, admissions, source, and staff without financial data.
2. WHEN history is filtered THEN ticket/holder/pass/staff text and date bounds SHALL be validated and bounded server-side.

## Edge Cases

- Anonymous, inactive staff, and Payment Admin redemption requests are denied.
- Browser-supplied status, holder, or admission counts are ignored.
- A customer screenshot remains usable only until the first successful server redemption.
- Customer/public pass reload reflects `checked_in` without exposing the staff identity.
- Public QR validation remains read-only and rate-limited separately from authenticated staff check-in.

## Success Criteria

- All supplied unit, SQL, live Supabase race/RLS, Playwright, responsive, camera-mock, cleanup, and regression checks pass.
- Real-device HTTPS camera permission, rear-camera selection, and physical QR recognition are listed as manual launch checks unless actually exercised on hardware.

