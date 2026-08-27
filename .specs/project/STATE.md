# State

**Last Updated:** 2026-08-27
**Current Work:** Phase 6 event check-in complete — awaiting explicit approval for Phase 7 operations

---

## Recent Decisions (Last 60 days)

### AD-020: No offline redemption or routine reversal (2026-08-27)

**Decision:** Require a backend connection for every validation/redemption and omit Gate Staff reversal.
**Reason:** Multiple entrances make local-only acceptance and casual reversal replay-unsafe.
**Trade-off:** The festival needs a separately approved emergency procedure for an outage.
**Impact:** The UI fails closed, shows connection state, and never reports a local check-in as successful.

### AD-019: Gate access uses bounded RPCs instead of ticket-table grants (2026-08-27)

**Decision:** Revoke direct authenticated ticket/check-in table access and expose role-checked validation, search, redemption, metrics, and history functions.
**Reason:** Even column-limited table reads permit directory-style enumeration and split authorization across client queries.
**Trade-off:** Each new gate capability needs a purpose-built database function.
**Impact:** Gate Staff receive only operational fields and remain separated from payment, receipt, promoter, commission, and banking data.

### AD-018: One atomic group-pass redemption (2026-08-27)

**Decision:** Lock and redeem the one Phase 5 credential while snapshotting its full admission count into one check-in record.
**Reason:** Network and Afatakpa are one purchased product unit/QR admitting five and two, respectively.
**Trade-off:** Partial arrivals are not supported in the Phase 6 MVP.
**Impact:** Concurrent scans produce exactly one success; passes checked in and people admitted remain distinct metrics.

### AD-017: Ticket issuance is a retryable post-verification transaction (2026-08-27)

**Decision:** Keep payment verification and ticket issuance as separate idempotent transactions, then attempt issuance immediately after a successful verification and expose a protected retry action.
**Reason:** A QR-generation or credential-issuance failure must never roll back a valid payment decision or promoter commission.
**Trade-off:** A verified order can temporarily show `failed` or `not_issued` until an administrator retries it.
**Impact:** Finance state remains authoritative while ticket recovery is safe, visible, audited, and independent.

### AD-016: Public pass access and QR validation use separate credentials (2026-08-27)

**Decision:** Give every ticket independent 256-bit public-access and QR credentials, store lookup hashes, and keep raw credentials service-role-only for pass reconstruction.
**Reason:** Sharing the customer pass URL must not reveal or reuse the credential scanned by festival staff.
**Trade-off:** The server must mediate pass, download, and validation reads and must never cache those responses publicly.
**Impact:** One leaked link cannot be substituted for the other, authenticated table readers do not receive bearer secrets, and customer cross-ticket access requires possession of the exact public token.

### AD-015: One credential per purchased product unit (2026-08-27)

**Decision:** Issue exactly `order.quantity` ticket credentials and snapshot `admissions_per_unit` on each credential.
**Reason:** The approved Phase 5 business rule treats Network and Afatakpa as group/couple credentials, not collections of individual attendee tickets.
**Trade-off:** Phase 6 must check in the credential as one atomic group admission and show how many people it admits.
**Impact:** Network × 1 creates one QR admitting five; Afatakpa × 1 creates one QR admitting two. This supersedes AD-002's original per-attendee issuance assumption.

### AD-014: Finance decisions are authenticated RPC-only (2026-08-27)

**Decision:** Revoke direct authenticated order updates and perform verify/reject through locked, role-checked PostgreSQL functions.
**Reason:** Payment state, submission state, commission activation, actor metadata, and audit records must succeed or fail together.
**Trade-off:** All future finance mutations need purpose-built audited RPCs.
**Impact:** Concurrent or repeated review cannot create duplicate commission or partial financial state.

### AD-013: Private receipt proxy after RLS authorization (2026-08-27)

**Decision:** Serve receipt bytes from a same-origin no-store route after an active finance-role check instead of exposing storage URLs.
**Reason:** Customers and Gate Staff must not obtain another customer's evidence or permanent object access.
**Trade-off:** The application server carries receipt download bandwidth.
**Impact:** The bucket remains private and receipt paths stay server-side.

### AD-012: Phase 4 stops before ticket issuance (2026-08-27)

**Decision:** Verification changes payment and commission state only; `tickets` remains untouched.
**Reason:** QR credentials and delivery are the separate Phase 5 transaction boundary.
**Trade-off:** Verified customers see “ticket being prepared” until Phase 5.
**Impact:** Verified orders are now stable inputs for idempotent ticket generation.

### AD-011: Separate immutable payment evidence history (2026-08-26)

**Decision:** Store each customer evidence attempt in `payment_submissions` and keep the existing order payment fields as the current queue summary.
**Reason:** Rejection/resubmission needs history, while Phase 4 benefits from simple order-level queue fields.
**Trade-off:** Submission requires a private Storage upload followed by a database RPC; failed or redundant uploads need exact cleanup.
**Impact:** Awaiting/rejected orders can submit safely, one active row exists per order, and old evidence can later remain for audit.

### AD-009: Database-mediated, idempotent customer orders (2026-08-26)

**Decision:** Create customer orders only through a service-role RPC keyed by an immutable checkout UUID.
**Reason:** Price, commission, status, quantity, inventory checks, and duplicate collapse must remain outside browser control.
**Trade-off:** Customer checkout requires a functioning server environment and applied Supabase migration.
**Impact:** Repeated submission returns the same awaiting-payment order and cannot create tickets or earned commission.

### AD-010: First-touch referral and privacy-scoped payment summaries (2026-08-26)

**Decision:** Preserve active referrals for 30 days in signed HTTP-only cookies and grant payment-summary access with a separate order-bound signed cookie.
**Reason:** Referral URLs must survive navigation without allowing arbitrary replacement, while order numbers alone must not expose customer details.
**Trade-off:** Changing either HMAC secret invalidates the corresponding browser tokens.
**Impact:** Active referrals reach the immutable order tuple; unrelated browsers cannot open an order summary.

### AD-006: Preserve single-product orders for promoter commissions (2026-08-26)

**Decision:** Snapshot `unit_price` and `commission_rate` directly on the existing order rather than adding `order_items`.
**Reason:** The current model supports one ticket type per order; mixed carts do not exist.
**Trade-off:** A future mixed-cart feature will require an explicit `order_items` migration and per-line snapshots.
**Impact:** Commission remains `quantity × captured rate`, independent of admissions per unit.

### AD-007: Database owns commission lifecycle (2026-08-26)

**Decision:** Payment-status transitions activate an order-unique commission row in PostgreSQL; payout/reversal use super-admin-only RPCs.
**Reason:** Browser values and repeated verification must not create or alter financial amounts.
**Trade-off:** Live workflow tests require an applied Supabase database.
**Impact:** Submitted is pending, verified is earned, and duplicate verification is idempotent.

### AD-008: Defer promoter UI to its real parent workflows (2026-08-26)

**Decision:** Build the data/domain contracts now and integrate screens in Phases 2–4.
**Reason:** No checkout, admin auth/routes, payment review action, or ticket issuance service exists to extend safely.
**Trade-off:** Referral links and promoter screens are not yet user-operable.
**Impact:** Future routes have a defined secure contract and do not need a schema redesign.

### AD-001: Server-mediated public data access (2026-08-26)

**Decision:** Public customer journeys will use validated server actions or route handlers rather than direct table access from the browser.
**Reason:** Orders contain private customer, payment, and receipt data.
**Trade-off:** Slightly more server code than direct Supabase browser queries.
**Impact:** RLS starts closed; browser and privileged Supabase clients are physically separated.

### AD-002: Admission count belongs to ticket type (2026-08-26)

**Decision:** Add `admissions_per_unit` to `ticket_types`.
**Reason:** The supplied Network ticket admits five and the Afatakpa ticket admits two.
**Trade-off:** The admission count must be snapshotted when the credential is issued.
**Impact:** As clarified by AD-015, a product unit receives one credential carrying its group admission count; it is not expanded into one credential per person.

### AD-003: One settings row for the first MVP (2026-08-26)

**Decision:** Constrain `event_settings` to one row in the first MVP.
**Reason:** The brief describes one 2026 festival and does not yet require multi-event administration.
**Trade-off:** A future multi-event system will need a migration.
**Impact:** Configuration remains simple and avoids speculative multi-tenancy.

### AD-004: Reference palette overrides generated design defaults (2026-08-26)

**Decision:** Use burnt orange, charcoal, deep green, warm cream, and restrained red with grain and geometric motifs.
**Reason:** The supplied posters are the primary brand source.
**Trade-off:** Generic design-system color suggestions are intentionally discarded.
**Impact:** The base shell establishes a festival-specific token system for future customer pages.

### AD-005: Pin supported lint toolchain (2026-08-26)

**Decision:** Use TypeScript 6.0.3 and ESLint 9.39.5 with Next.js 16.3.3.
**Reason:** The installed Next lint stack rejects TypeScript 7 and its React plugin is not yet compatible with ESLint 10.
**Trade-off:** npm emits a non-blocking deprecation warning for the pinned ESLint 9 release.
**Impact:** Strict lint and type checks pass today; revisit the pins when `eslint-config-next` supports the newer majors.

## Active Blockers

- No Phase 6 code blocker. Real Gate Staff Supabase Auth users plus matching active `admin_profiles` rows are required before event operation.
- `APP_ORIGIN` must be changed to the deployed HTTPS origin before production ticket issuance so generated pass and QR links use the final domain.
- Physical Android/iPhone camera, poor-light, multi-gate, long-session, and network-handoff tests require the deployed HTTPS site and event phones.

## Lessons Learned

### L-001: A strict CSP must force nonce-aware rendering

**Context:** The first production browser test loaded a static route behind a nonce CSP.
**Problem:** Next framework scripts did not receive the per-request nonce and the browser blocked hydration.
**Solution:** The root layout now reads request headers, forcing dynamic rendering so Next attaches the nonce.
**Prevents:** A production page that compiles successfully but breaks under its own security policy.

### L-002: Client action state must not be imported from a server-only action module

**Context:** The first real checkout render used a constant exported beside a `"use server"` action.
**Problem:** The client received an undefined initial state even though typecheck and the production compiler passed.
**Solution:** Define typed initial action state in the client component and export only async actions from server modules.
**Prevents:** Checkout or referral forms crashing before the customer can enter details.

### L-003: React server actions reset uncontrolled payment fields

**Context:** Browser testing sent an intentionally unsupported receipt and received a server validation response.
**Problem:** The browser cleared uncontrolled sender, bank, and reference inputs after the action completed.
**Solution:** Payment fields are controlled client state, and stale errors clear when the customer edits or replaces evidence.
**Prevents:** Customers retyping transfer details after recoverable upload or network errors.

### L-004: Table grants can bypass an intended column-level read boundary

**Context:** The first live Phase 5 RLS test used an authenticated Gate Staff session to read `tickets`.
**Problem:** A pre-existing table-wide `SELECT` grant still exposed raw bearer credentials even though safe columns had been granted explicitly.
**Solution:** Revoke table-wide authenticated privileges first, then regrant only the safe ticket columns and narrowly allowed status columns; keep RLS as the row boundary.
**Prevents:** Gate or other authenticated roles reading `qr_token` or `public_access_token` through PostgREST.

### L-005: Live database races catch errors static SQL parsing cannot

**Context:** The first simultaneous Phase 6 redemption ran against hosted PostgreSQL.
**Problem:** A table-returning PL/pgSQL function made one unqualified `checked_in_at` reference ambiguous.
**Solution:** Add a forward migration qualifying the locked update target, then rerun two concurrent staff clients through the same RPC.
**Prevents:** Declaring concurrency safe from SQL shape alone when the live function cannot execute.

### L-006: Browser connection state needs a stable server snapshot

**Context:** A phone-sized offline mock hydrated the client check-in island.
**Problem:** Reading `navigator.onLine` during initial client render disagreed with server HTML.
**Solution:** Subscribe through `useSyncExternalStore` with a stable online server snapshot.
**Prevents:** Hydration replacement and misleading event-day connection state.

## Preferences

**Model Guidance Shown:** never
