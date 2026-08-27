import assert from "node:assert/strict";
import test from "node:test";

import {
  filterToPaymentStatus,
  getAmountDifference,
  normalizeSearchQuery,
  parseAdminOrderFilter,
  resolveRejectionReason,
} from "@/lib/admin/review";

test("admin order filters default safely and map all to no status", () => {
  assert.equal(parseAdminOrderFilter(undefined), "submitted");
  assert.equal(parseAdminOrderFilter("not-a-status"), "submitted");
  assert.equal(parseAdminOrderFilter("verified"), "verified");
  assert.equal(filterToPaymentStatus("all"), null);
  assert.equal(filterToPaymentStatus("rejected"), "rejected");
});

test("admin search is normalized and bounded", () => {
  assert.equal(normalizeSearchQuery("  DFF   K7A92P "), "DFF K7A92P");
  assert.equal(normalizeSearchQuery("x".repeat(200)).length, 120);
});

test("rejection presets resolve to customer-safe reasons", () => {
  assert.match(resolveRejectionReason("payment_not_found", "") ?? "", /locate/i);
  assert.equal(
    resolveRejectionReason("other", "  Customer   sent a different reference. "),
    "Customer sent a different reference.",
  );
  assert.equal(resolveRejectionReason("other", " "), null);
  assert.equal(resolveRejectionReason("unknown", "anything"), null);
});

test("integer amount differences distinguish underpayment and overpayment", () => {
  assert.deepEqual(getAmountDifference(12000, 10000), {
    kind: "underpayment",
    amount: 2000,
  });
  assert.deepEqual(getAmountDifference(3000, 5000), {
    kind: "overpayment",
    amount: 2000,
  });
  assert.deepEqual(getAmountDifference(3000, 3000), {
    kind: "match",
    amount: 0,
  });
});
