# Phase 5 Digital Tickets Specification

**Status:** Approved by the supplied Phase 5 brief

## Goal

WHEN a verified order is issued THEN the system SHALL create exactly one secure Dreamers Pass per purchased product unit, expose it through a separate bearer access token, render a scannable QR credential, and support PNG download and honest WhatsApp sharing.

## P1 Requirements

1. WHEN an order is not verified THEN issuance SHALL be denied and create no tickets.
2. WHEN a verified order with quantity `N` is issued THEN exactly `N` tickets SHALL exist.
3. WHEN Network is issued THEN each ticket SHALL admit five; WHEN Afatakpa is issued THEN each SHALL admit two; all other products SHALL admit one.
4. WHEN issuance is repeated or concurrent THEN `(order_id, unit_index)` SHALL prevent duplicates.
5. WHEN a ticket is issued THEN its type name and admission count SHALL be immutable snapshots.
6. WHEN a customer opens a pass token THEN only the matching pass SHALL load.
7. WHEN a QR credential is opened THEN only minimal ticket state SHALL be shown and no check-in SHALL occur.
8. WHEN a ticket is downloaded THEN the PNG SHALL contain its QR, identity, holder, admission, code, and event details.
9. WHEN WhatsApp sharing is used THEN the message SHALL contain the secure pass URL and SHALL NOT claim a file was attached.
10. WHEN ticket data is listed for staff THEN raw public-access and QR credentials SHALL not be displayed or returned by public/authenticated table grants.

## Out of Scope

- Gate scanning, camera access, check-in mutations, duplicate-entry rejection, attendance analytics, guest assignment, transfers, PDF generation, and WhatsApp Cloud API delivery.

## Edge Cases

- Verified orders created before Phase 5 remain issuable.
- Payment stays verified if issuance fails; retry does not require reverification.
- Cancelled tickets render cancelled state.
- A production deployment refuses an invalid/non-HTTPS canonical origin when producing public URLs.

## Success Criteria

- All supplied Phase 5 product, quantity, security, responsive, PNG, QR, WhatsApp, role, and regression tests pass.
- Existing payment, commission, referral, receipt, and QR-free Phase 4 behavior remains intact until issuance runs.
