import assert from "node:assert/strict";
import test from "node:test";

import {
  localDateInLagos,
  MAX_RECEIPT_BYTES,
  validatePaymentForm,
  validateReceiptFile,
} from "@/lib/payments/validation";

const idempotencyKey = "00000000-0000-4000-8000-000000000031";
const now = new Date("2026-08-26T22:30:00.000Z");

function pngFile(name = "receipt.png", type = "image/png") {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    name,
    { type },
  );
}

function validForm(overrides: Record<string, string | File> = {}) {
  const formData = new FormData();
  const values: Record<string, string | File> = {
    senderName: "  Tolu   Adebayo ",
    senderBank: "GTBank",
    amountPaid: "3000",
    paymentReference: "  DFF  123-456  ",
    paymentDate: "2026-08-26",
    paymentTime: "15:42",
    idempotencyKey,
    receipt: pngFile(),
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

test("valid payment details normalize without accepting an expected total", () => {
  const formData = validForm({ amountExpected: "1", paymentStatus: "verified" });
  const result = validatePaymentForm(formData, now);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.senderName, "Tolu Adebayo");
    assert.equal(result.data.paymentReference, "DFF 123-456");
    assert.equal(result.data.amountPaid, 3000);
    assert.equal("amountExpected" in result.data, false);
    assert.equal("paymentStatus" in result.data, false);
  }
});

test("underpayment and overpayment remain valid evidence inputs", () => {
  for (const amount of ["10000", "5000"]) {
    const result = validatePaymentForm(validForm({ amountPaid: amount }), now);
    assert.equal(result.success, true);
  }
});

test("payment reference is optional and blank input is stored as null", () => {
  for (const paymentReference of ["", "   "]) {
    const result = validatePaymentForm(validForm({ paymentReference }), now);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.paymentReference, null);
  }
});

test("missing receipt is blocked", () => {
  const formData = validForm();
  formData.delete("receipt");
  const result = validatePaymentForm(formData, now);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.errors.receipt ?? "", /Upload/);
});

test("future and impossible payment dates are blocked", () => {
  for (const date of ["2026-08-28", "2026-02-30", "not-a-date"]) {
    const result = validatePaymentForm(validForm({ paymentDate: date }), now);
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.errors.paymentDate);
  }
});

test("Lagos calendar date is used around UTC midnight", () => {
  assert.equal(localDateInLagos(now), "2026-08-26");
  assert.equal(
    localDateInLagos(new Date("2026-08-26T23:30:00.000Z")),
    "2026-08-27",
  );
});

test("invalid whole-Naira amounts and malformed nonblank references are blocked", () => {
  for (const amount of ["0", "-1", "3000.5", "not-money"]) {
    const result = validatePaymentForm(validForm({ amountPaid: amount }), now);
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.errors.amountPaid);
  }
  const referenceResult = validatePaymentForm(
    validForm({ paymentReference: " -- " }),
    now,
  );
  assert.equal(referenceResult.success, false);
  if (!referenceResult.success) {
    assert.match(referenceResult.errors.paymentReference ?? "", /valid|blank/i);
  }
});

test("valid PNG receipt passes extension, MIME, and magic-byte checks", async () => {
  const result = await validateReceiptFile(pngFile());
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.extension, "png");
    assert.equal(result.data.contentType, "image/png");
  }
});

test("valid PDF receipt is accepted", async () => {
  const file = new File(
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
    "bank-receipt.pdf",
    { type: "application/pdf" },
  );
  const result = await validateReceiptFile(file);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.extension, "pdf");
});

test("valid WEBP and JPEG signatures are accepted", async () => {
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(
    (await validateReceiptFile(new File([webp], "receipt.webp", { type: "image/webp" }))).success,
    true,
  );
  assert.equal(
    (await validateReceiptFile(new File([jpeg], "receipt.jpeg", { type: "image/jpeg" }))).success,
    true,
  );
});

test("unsupported extension, MIME mismatch, and forged content are rejected", async () => {
  const unsupported = new File([new Uint8Array([0x4d, 0x5a])], "receipt.exe", {
    type: "application/x-msdownload",
  });
  const wrongMime = pngFile("receipt.png", "application/pdf");
  const forged = new File([new TextEncoder().encode("not an image")], "receipt.png", {
    type: "image/png",
  });

  for (const file of [unsupported, wrongMime, forged]) {
    const result = await validateReceiptFile(file);
    assert.equal(result.success, false);
    if (!result.success) assert.match(result.message, /JPG, PNG, WEBP or PDF/);
  }
});

test("receipt larger than five MiB is rejected", async () => {
  const oversized = new File(
    [new Uint8Array(MAX_RECEIPT_BYTES + 1)],
    "large.png",
    { type: "image/png" },
  );
  const result = await validateReceiptFile(oversized);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.message, /under 5 MB/);
});

test("path-like original filename is never returned as storage identity", async () => {
  const jpeg = new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0])],
    "../../customer-phone.jpeg",
    { type: "image/jpeg" },
  );
  const result = await validateReceiptFile(jpeg);
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(Object.keys(result.data).sort(), ["bytes", "contentType", "extension"]);
    assert.equal(result.data.extension, "jpg");
  }
});
