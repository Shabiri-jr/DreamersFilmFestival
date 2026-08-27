import assert from "node:assert/strict";
import test from "node:test";

import {
  isCheckInSource,
  isTicketId,
  mapGateTicket,
  normalizeGateSearchQuery,
  parseQrCredentialPayload,
} from "../src/lib/check-in/domain";

const credential = "a".repeat(64);
const origin = "https://dreamers.example";

test("phone scanner accepts only raw credentials or the canonical validation URL", () => {
  assert.equal(parseQrCredentialPayload(credential, origin), credential);
  assert.equal(
    parseQrCredentialPayload(`${origin}/validate/${credential}`, origin),
    credential,
  );
  assert.equal(
    parseQrCredentialPayload(`${origin}/validate/${credential}/`, origin),
    credential,
  );
});

test("scanner never follows or accepts foreign, decorated, or malformed QR URLs", () => {
  assert.equal(parseQrCredentialPayload(`https://evil.example/validate/${credential}`, origin), null);
  assert.equal(parseQrCredentialPayload(`${origin}/validate/${credential}?next=https://evil.example`, origin), null);
  assert.equal(parseQrCredentialPayload(`${origin}/pass/${credential}`, origin), null);
  assert.equal(parseQrCredentialPayload("javascript:alert(1)", origin), null);
  assert.equal(parseQrCredentialPayload("not-a-ticket", origin), null);
});

test("manual gate searches are bounded and require meaningful input", () => {
  assert.equal(normalizeGateSearchQuery("  DFF-NW-1234  "), "DFF-NW-1234");
  assert.equal(normalizeGateSearchQuery(" Adebayo   Kunle "), "Adebayo Kunle");
  assert.equal(normalizeGateSearchQuery("abc"), null);
  assert.equal(normalizeGateSearchQuery("x".repeat(121)), null);
});

test("redemption inputs accept only strict ticket IDs and known sources", () => {
  assert.equal(isTicketId("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(isTicketId("../../tickets"), false);
  assert.equal(isCheckInSource("qr"), true);
  assert.equal(isCheckInSource("manual"), true);
  assert.equal(isCheckInSource("admin"), false);
});

test("unknown database outcomes fail closed as invalid tickets", () => {
  const result = mapGateTicket({
    outcome: "unexpected",
    ticket_id: "00000000-0000-4000-8000-000000000001",
    ticket_code: "DFF-NW-123456",
    holder_name: "Adebayo Kunle",
    ticket_type_name: "Network",
    admission_count: 5,
    ticket_status: "valid",
    checked_in_at: null,
    checked_in_by_name: null,
    order_number: "DFF-ORDER1",
  });
  assert.equal(result.outcome, "invalid");
  assert.equal(result.ticketId, null);
});

test("group tickets preserve one credential with its full admission snapshot", () => {
  const result = mapGateTicket({
    outcome: "checked_in",
    ticket_id: "00000000-0000-4000-8000-000000000001",
    ticket_code: "DFF-NW-123456",
    holder_name: "Adebayo Kunle",
    ticket_type_name: "Network",
    admission_count: 5,
    ticket_status: "checked_in",
    checked_in_at: "2026-09-26T09:00:00Z",
    checked_in_by_name: "Gate Staff",
    order_number: "DFF-ORDER1",
  });
  assert.equal(result.admissionCount, 5);
  assert.equal(result.outcome, "checked_in");
});
