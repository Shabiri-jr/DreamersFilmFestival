import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReferralLink,
  calculateCommission,
  createReferralAttribution,
  normalizeReferralCode,
  preserveReferralAttribution,
} from "@/lib/referrals/domain";
import {
  createReferralAttributionToken,
  REFERRAL_ATTRIBUTION_WINDOW_SECONDS,
  verifyReferralAttributionToken,
} from "@/lib/referrals/token";

const promoterId = "00000000-0000-4000-8000-000000000001";
const tokenSecret = "dreamers-test-referral-secret-32-chars-minimum";

test("valid referral-link codes normalize and generate the requested link", () => {
  const attribution = createReferralAttribution(
    promoterId,
    "  daniel  ",
    "referral_link",
  );

  assert.deepEqual(attribution, {
    promoterId,
    referralCode: "DANIEL",
    source: "referral_link",
  });
  assert.equal(
    buildReferralLink("https://dreamers.example", attribution.referralCode),
    "https://dreamers.example/tickets?ref=DANIEL",
  );
});

test("manual code is accepted as a fallback only when secure attribution is absent", () => {
  const manual = createReferralAttribution(
    promoterId,
    "offline_01",
    "manual_code",
  );
  const linked = createReferralAttribution(
    "00000000-0000-4000-8000-000000000002",
    "LINKED",
    "referral_link",
  );

  assert.equal(preserveReferralAttribution(null, manual), manual);
  assert.equal(preserveReferralAttribution(linked, manual), linked);
});

test("invalid referral codes are rejected before a database lookup", () => {
  for (const code of ["", "ab", "spaces are invalid", "<>DANIEL", "a".repeat(41)]) {
    assert.equal(normalizeReferralCode(code), null);
  }

  assert.throws(
    () => createReferralAttribution(promoterId, "bad code", "manual_code"),
    /invalid/i,
  );
});

test("all five product rates and multiple quantities calculate per purchased unit", () => {
  const rates = [
    ["Dreamer", 1_000],
    ["D'Shift", 2_000],
    ["Network", 4_000],
    ["Solo", 5_000],
    ["Afatakpa", 10_000],
  ] as const;

  for (const [, rate] of rates) {
    assert.equal(calculateCommission(1, rate), rate);
  }

  assert.equal(calculateCommission(3, 1_000), 3_000);
  assert.equal(
    calculateCommission(2, 1_000) +
      calculateCommission(1, 2_000) +
      calculateCommission(1, 5_000),
    9_000,
  );
});

test("captured rates keep historical commission stable after catalogue changes", () => {
  const capturedRate = 1_000;
  const originalCommission = calculateCommission(2, capturedRate);
  const laterCatalogueRate = 1_500;

  assert.equal(originalCommission, 2_000);
  assert.equal(calculateCommission(2, laterCatalogueRate), 3_000);
  assert.equal(calculateCommission(2, capturedRate), originalCommission);
});

test("invalid quantities and rates are rejected", () => {
  assert.throws(() => calculateCommission(0, 1_000), /positive integer/i);
  assert.throws(() => calculateCommission(1.5, 1_000), /positive integer/i);
  assert.throws(() => calculateCommission(1, -1), /non-negative/i);
});

test("signed attribution survives return visits within the 30-day window", () => {
  const now = new Date("2026-08-26T09:00:00.000Z");
  const attribution = createReferralAttribution(
    promoterId,
    "DANIEL",
    "referral_link",
  );
  const token = createReferralAttributionToken(attribution, tokenSecret, now);
  const later = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1_000);

  assert.deepEqual(
    verifyReferralAttributionToken(token, tokenSecret, later),
    attribution,
  );
});

test("expired or tampered attribution tokens are rejected", () => {
  const now = new Date("2026-08-26T09:00:00.000Z");
  const attribution = createReferralAttribution(
    promoterId,
    "DANIEL",
    "referral_link",
  );
  const token = createReferralAttributionToken(attribution, tokenSecret, now);
  const expiresAt = new Date(
    now.getTime() + REFERRAL_ATTRIBUTION_WINDOW_SECONDS * 1_000,
  );
  const [payload, signature] = token.split(".");
  const tamperedSignature = `${signature?.startsWith("A") ? "B" : "A"}${signature?.slice(1)}`;

  assert.equal(
    verifyReferralAttributionToken(token, tokenSecret, expiresAt),
    null,
  );
  assert.equal(
    verifyReferralAttributionToken(
      `${payload}.${tamperedSignature}`,
      tokenSecret,
      now,
    ),
    null,
  );
});

