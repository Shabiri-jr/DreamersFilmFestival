import assert from "node:assert/strict";
import test from "node:test";

import jsQR from "jsqr";
import sharp from "sharp";

import {
  buildPublicPassUrl,
  buildQrValidationUrl,
  createTicketCredential,
  createTicketCredentialSet,
  hashTicketCredential,
} from "../src/lib/tickets/credentials";
import type { DigitalPass } from "../src/lib/tickets/data";
import { renderPassPng } from "../src/lib/tickets/png";
import {
  admissionLabel,
  formatEventDate,
  formatEventTime,
} from "../src/lib/tickets/presentation";
import {
  buildTicketWhatsappMessage,
  buildWhatsappUrl,
  whatsappPhone,
} from "../src/lib/tickets/whatsapp";

const fixturePass: DigitalPass = {
  id: "00000000-0000-4000-8000-000000000001",
  unitIndex: 1,
  ticketCode: "DFF-NW-X8P21L",
  ticketTypeName: "Network",
  admissionCount: 5,
  status: "valid",
  issuedAt: "2026-08-27T12:00:00.000Z",
  passUrl: "https://dreamers.example/pass/" + "a".repeat(64),
  downloadUrl: "https://dreamers.example/pass/" + "a".repeat(64) + "/download",
  orderNumber: "DFF-ABC123",
  holderName: "Adebayo Kunle",
  customerPhone: "+2348093682647",
  qrToken: "b".repeat(64),
  qrValidationUrl: "https://dreamers.example/validate/" + "b".repeat(64),
  eventName: "The Dreamers Film Festival",
  eventDate: "26 September 2026",
  eventTime: "9AM – 6PM",
  venue: "The Dreamers Hub, Oluyole Estate, Ringroad, Ibadan, Oyo State",
  supportWhatsapp: "+2348093682647",
};

test("all product categories receive the requested non-sequential ticket code prefix", () => {
  const cases = [
    ["dreamer", "DR"],
    ["d-shift", "DS"],
    ["network", "NW"],
    ["solo", "SO"],
    ["afatakpa", "AF"],
  ] as const;
  for (const [slug, prefix] of cases) {
    const credential = createTicketCredential(slug);
    assert.match(credential.ticketCode, new RegExp(`^DFF-${prefix}-[A-Z2-9]{6}$`));
    assert.match(credential.qrToken, /^[0-9a-f]{64}$/);
    assert.match(credential.publicAccessToken, /^[0-9a-f]{64}$/);
    assert.notEqual(credential.qrToken, credential.publicAccessToken);
  }
});

test("quantity creates one independent credential set per purchased product unit", () => {
  const credentials = createTicketCredentialSet("dreamer", 4);
  assert.equal(credentials.length, 4);
  assert.equal(new Set(credentials.map((item) => item.ticketCode)).size, 4);
  assert.equal(new Set(credentials.map((item) => item.qrToken)).size, 4);
  assert.equal(new Set(credentials.map((item) => item.publicAccessToken)).size, 4);
});

test("a substantial credential sample has no code, QR, or public-token duplicates", () => {
  const credentials = createTicketCredentialSet("network", 100);
  assert.equal(new Set(credentials.map((item) => item.ticketCode)).size, 100);
  assert.equal(new Set(credentials.map((item) => item.qrToken)).size, 100);
  assert.equal(new Set(credentials.map((item) => item.publicAccessToken)).size, 100);
});

test("public and QR routes use separate secure tokens and canonical origins", () => {
  const publicToken = "c".repeat(64);
  const qrToken = "d".repeat(64);
  assert.equal(buildPublicPassUrl("https://dreamers.example", publicToken), `https://dreamers.example/pass/${publicToken}`);
  assert.equal(buildQrValidationUrl("https://dreamers.example", qrToken), `https://dreamers.example/validate/${qrToken}`);
  assert.notEqual(hashTicketCredential(publicToken), publicToken);
  assert.notEqual(hashTicketCredential(qrToken), qrToken);
});

test("admission labels preserve group and couple capacity without multiplying passes", () => {
  assert.equal(admissionLabel(1, "Dreamer"), "Admits 1");
  assert.equal(admissionLabel(5, "Network"), "Admits 5");
  assert.equal(admissionLabel(2, "Afatakpa"), "Admits 2 — Couple");
});

test("festival date, time, and WhatsApp number format for Nigerian delivery", () => {
  assert.equal(formatEventDate("2026-09-26"), "26 September 2026");
  assert.equal(formatEventTime("09:00:00", "18:00:00"), "9AM – 6PM");
  assert.equal(whatsappPhone("+234 809-368-2647"), "2348093682647");
});

test("WhatsApp sharing includes the secure pass link and honestly describes PNG attachment", () => {
  const message = buildTicketWhatsappMessage({
    customerName: fixturePass.holderName,
    ticketTypeName: fixturePass.ticketTypeName,
    ticketCode: fixturePass.ticketCode,
    admissionCount: fixturePass.admissionCount,
    passUrl: fixturePass.passUrl,
    venue: fixturePass.venue,
    eventDate: fixturePass.eventDate,
    eventTime: fixturePass.eventTime,
  });
  const url = buildWhatsappUrl(message, fixturePass.customerPhone);
  assert.match(url, /^https:\/\/wa\.me\/2348093682647\?text=/);
  assert.match(decodeURIComponent(url), /downloaded PNG can be attached separately/i);
  assert.ok(message.includes(fixturePass.passUrl));
  assert.ok(!message.includes(fixturePass.qrToken));
  assert.doesNotMatch(message, /automatically attached/i);
});

test("downloaded ticket PNG is phone-readable and its QR decodes to the validation URL", async () => {
  const png = await renderPassPng(fixturePass);
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 1920);

  const { data, info } = await sharp(png)
    .extract({ left: 250, top: 750, width: 700, height: 700 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.equal(decoded?.data, fixturePass.qrValidationUrl);
});

test("downloaded ticket PNG renders real holder-name glyphs instead of fallback boxes", async () => {
  const alternatePass = {
    ...fixturePass,
    holderName: "Olawale Moses",
  };
  assert.equal(alternatePass.holderName.length, fixturePass.holderName.length);

  const [firstPng, secondPng] = await Promise.all([
    renderPassPng(fixturePass),
    renderPassPng(alternatePass),
  ]);
  const holderRegion = { left: 112, top: 1640, width: 450, height: 64 };
  const [firstHolder, secondHolder] = await Promise.all([
    sharp(firstPng).extract(holderRegion).raw().toBuffer(),
    sharp(secondPng).extract(holderRegion).raw().toBuffer(),
  ]);

  assert.notDeepEqual(
    firstHolder,
    secondHolder,
    "different same-length names must not collapse to identical missing-glyph boxes",
  );
});
