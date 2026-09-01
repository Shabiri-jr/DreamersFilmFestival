import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAdmissions,
  formatFestivalDate,
  formatFestivalTime,
  formatNaira,
  formatPassAdmission,
} from "@/lib/format";
import {
  createOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/orders/access-token";
import {
  normalizeCustomerName,
  normalizeEmail,
  normalizePhone,
  validateCheckoutForm,
} from "@/lib/orders/validation";

const ticketId = "00000000-0000-4000-8000-000000000010";
const idempotencyKey = "00000000-0000-4000-8000-000000000011";
const orderSecret = "dreamers-order-access-test-secret-32-characters";

test("Nigerian and international WhatsApp numbers normalize safely", () => {
  assert.equal(normalizePhone("0809 368 2647"), "+2348093682647");
  assert.equal(normalizePhone("234-809-368-2647"), "+2348093682647");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("8093682647"), null);
  assert.equal(normalizePhone("not-a-phone"), null);
});

test("customer names and optional emails normalize before persistence", () => {
  assert.equal(normalizeCustomerName("  Amina   Bello  "), "Amina Bello");
  assert.equal(normalizeCustomerName("A"), null);
  assert.equal(normalizeEmail("  AMINA@EXAMPLE.COM "), "amina@example.com");
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail("bad-email"), undefined);
});

test("valid checkout input contains identifiers and quantity but no client price", () => {
  const formData = new FormData();
  formData.set("customerName", "Amina Bello");
  formData.set("phone", "08093682647");
  formData.set("email", "amina@example.com");
  formData.set("ticketTypeId", ticketId);
  formData.set("quantity", "3");
  formData.set("idempotencyKey", idempotencyKey);
  formData.set("price", "1");
  formData.set("totalAmount", "1");

  const result = validateCheckoutForm(formData);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, {
      customerName: "Amina Bello",
      phone: "+2348093682647",
      email: "amina@example.com",
      ticketTypeId: ticketId,
      quantity: 3,
      idempotencyKey,
    });
    assert.equal("price" in result.data, false);
    assert.equal("totalAmount" in result.data, false);
  }
});

test("invalid checkout inputs produce field-level errors", () => {
  const formData = new FormData();
  formData.set("customerName", "A");
  formData.set("phone", "555");
  formData.set("email", "bad-email");
  formData.set("ticketTypeId", "not-a-uuid");
  formData.set("quantity", "0");
  formData.set("idempotencyKey", "bad-key");

  const result = validateCheckoutForm(formData);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "customerName",
      "email",
      "phone",
      "quantity",
      "ticket",
    ]);
  }
});

test("festival values format for Nigerian customers and admission units", () => {
  assert.equal(formatNaira(70_000), "₦70,000");
  assert.equal(formatFestivalDate("2026-09-26"), "26 September 2026");
  assert.equal(formatFestivalTime("09:00:00", "18:00:00"), "9AM – 6PM");
  assert.equal(formatAdmissions(1), "Admits one");
  assert.equal(formatAdmissions(2), "Admits two");
  assert.equal(formatAdmissions(5), "Admits 5");
  assert.equal(formatPassAdmission("network", 5), "Group of 5 · one pass");
  assert.equal(formatPassAdmission("afatakpa", 2), "Admits two · couple");
  assert.equal(formatPassAdmission("solo", 1), "Admits one");
});

test("payment summaries require a matching, unexpired signed order token", () => {
  const now = new Date("2026-08-26T09:00:00.000Z");
  const token = createOrderAccessToken("DFF-A1B2C3D4E5", orderSecret, now);

  assert.equal(
    verifyOrderAccessToken(
      token,
      "DFF-A1B2C3D4E5",
      orderSecret,
      new Date("2026-08-27T09:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    verifyOrderAccessToken(
      token,
      "DFF-FFFFEEEE11",
      orderSecret,
      new Date("2026-08-27T09:00:00.000Z"),
    ),
    false,
  );
  assert.equal(
    verifyOrderAccessToken(
      token,
      "DFF-A1B2C3D4E5",
      orderSecret,
      new Date("2026-09-03T09:00:00.000Z"),
    ),
    false,
  );
});

test("tampering invalidates payment access tokens", () => {
  const now = new Date("2026-08-26T09:00:00.000Z");
  const token = createOrderAccessToken("DFF-A1B2C3D4E5", orderSecret, now);
  const [payload, signature] = token.split(".");
  const tampered = `${payload}.${signature?.startsWith("A") ? "B" : "A"}${signature?.slice(1)}`;

  assert.equal(
    verifyOrderAccessToken(tampered, "DFF-A1B2C3D4E5", orderSecret, now),
    false,
  );
});
