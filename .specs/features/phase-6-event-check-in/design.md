# Phase 6 Event Check-In Design

**Spec:** `.specs/features/phase-6-event-check-in/spec.md`  
**Status:** Approved by the supplied Phase 6 brief

## Architecture

```text
phone camera/manual search
        ↓
small client interaction island
        ↓ validated Server Actions + active role check
PostgreSQL security-definer RPCs + per-staff rate window
        ↓
ticket row lock → state transition → check-in row → audit row
```

The anonymous Phase 5 `/validate/[qrCredential]` route stays read-only. `/check-in` is a separate authenticated workspace and never accepts ticket facts from the client.

## Existing Code Reused

| Existing boundary | Reuse |
| --- | --- |
| `admin_profiles` and Supabase Auth | Active role identity and staff display name |
| `tickets` states and QR hash | Server-authoritative credential lookup |
| `check_ins.ticket_id UNIQUE` | Second database guarantee against duplicate redemption |
| `assertTrustedOrigin` | Explicit origin check for state-changing Server Actions |
| Festival settings and presentation helpers | Event/date/venue copy |
| Admin shell and status language | Super Admin history presentation |
| Phase 5 public pass | Customer checked-in state after reload |

## Database Design

- Add `check_in_source` enum: `qr`, `manual`.
- Add `check_ins.admission_count` snapshot and `check_ins.source`.
- Add small internal staff/public request-window tables with no browser table grants.
- Revoke authenticated direct ticket/check-in table reads and ticket updates; all Gate Staff access moves through bounded RPCs.
- `validate_gate_ticket` hashes the QR token inside PostgreSQL and returns one safe operational result.
- `search_gate_tickets` requires 4–120 normalized characters and returns at most 20 safe rows.
- `redeem_gate_ticket` authorizes, rate-limits, locks one ticket, verifies its order, performs one conditional transition, inserts the unique check-in row, and audits success.
- `get_gate_dashboard` returns safe event and attendance aggregates only.
- `search_check_in_history` is Super Admin-only and bounded by query/date filters.
- `record_public_validation_request` is service-role-only and backs practical public validation throttling with a keyed, non-PII identifier.

## Authorization

| Capability | Gate Staff | Payment Admin | Super Admin | Anonymous |
| --- | ---: | ---: | ---: | ---: |
| Open `/check-in` | Yes | No | Yes | No |
| Validate/search/redeem | Yes | No | Yes | No |
| Attendance metrics | Yes | No | Yes | No |
| Check-in history page | No | No | Yes | No |
| Public QR status | Minimal read-only | Minimal read-only | Minimal read-only | Minimal read-only |
| Finance/promoter data | No | Existing access | Existing access | No |

## Camera Component

- Dynamically import `qr-scanner` only after the operator taps Scan Pass.
- Prefer `environment`, cap scanning frequency, and never navigate to scanned content.
- Validate only the decoded text through the Server Action.
- Use a synchronous lock ref before awaiting stop/validation so repeated frames cannot create request storms.
- Call `stop()` after a result and `destroy()` on unmount; unregister online/offline listeners.
- Preserve manual search for denied/no-camera/error states.
- Use optional vibration as progressive enhancement; visual text/icons remain authoritative.

## UI Direction

Industrial event console: charcoal base, warm paper work surface, green success, red denial, amber warning, large condensed headings, tabular counters, 48px controls, no marketing imagery, and almost no decorative motion. Mobile is one column; tablet/desktop place scanner and operational context side-by-side.

## Error Handling

| Scenario | Result |
| --- | --- |
| Permission denied | Friendly denied state and manual-search action |
| No camera | No-camera state and manual-search action |
| Backend/network failure | Connection-required state; no local success |
| Unknown/malformed token | Invalid pass with no token details |
| Checked-in ticket | Already used with timestamp and no action |
| Cancelled/ineligible ticket | Explicit denial and no override |
| Simultaneous redemption | First success; later caller receives already used after row lock |

## Known Limitation

Network and Afatakpa groups must enter together. The row snapshot makes a future `admissions_used/admissions_remaining` extension possible, but Phase 6 does not partially redeem a credential.

