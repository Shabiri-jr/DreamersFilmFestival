export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export type PaymentFieldErrors = Partial<
  Record<
    | "senderName"
    | "senderBank"
    | "amountPaid"
    | "paymentReference"
    | "paymentDate"
    | "paymentTime"
    | "receipt",
    string
  >
>;

export type ValidPaymentInput = Readonly<{
  senderName: string;
  senderBank: string;
  amountPaid: number;
  paymentReference: string | null;
  paymentDate: string;
  paymentTime: string | null;
  idempotencyKey: string;
  receipt: File;
}>;

export type PaymentValidationResult =
  | Readonly<{ success: true; data: ValidPaymentInput }>
  | Readonly<{ success: false; errors: PaymentFieldErrors }>;

export type ValidatedReceipt = Readonly<{
  bytes: Uint8Array;
  extension: "jpg" | "png" | "webp" | "pdf";
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
}>;

export type ReceiptValidationResult =
  | Readonly<{ success: true; data: ValidatedReceipt }>
  | Readonly<{ success: false; message: string }>;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function normalizeWords(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function localDateInLagos(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function validatePaymentForm(
  formData: FormData,
  now = new Date(),
): PaymentValidationResult {
  const errors: PaymentFieldErrors = {};
  const senderName = normalizeWords(readText(formData, "senderName"));
  const senderBank = normalizeWords(readText(formData, "senderBank"));
  const paymentReferenceValue = normalizeWords(
    readText(formData, "paymentReference"),
  );
  const paymentReference = paymentReferenceValue || null;
  const paymentDate = readText(formData, "paymentDate");
  const paymentTimeValue = readText(formData, "paymentTime");
  const paymentTime = paymentTimeValue || null;
  const idempotencyKey = readText(formData, "idempotencyKey");
  const amountPaid = Number(readText(formData, "amountPaid"));
  const receiptValue = formData.get("receipt");
  const receipt = receiptValue instanceof File ? receiptValue : null;

  if (senderName.length < 2 || senderName.length > 120) {
    errors.senderName = "Enter the account name used for the transfer.";
  }
  if (senderBank.length < 2 || senderBank.length > 120) {
    errors.senderBank = "Enter the bank or payment provider used.";
  }
  if (
    !Number.isSafeInteger(amountPaid) ||
    amountPaid <= 0 ||
    amountPaid > 9_999_999_999
  ) {
    errors.amountPaid = "Enter the whole Naira amount you transferred.";
  }
  if (
    paymentReference &&
    (paymentReference.length < 3 ||
      paymentReference.length > 120 ||
      paymentReference.replace(/[^a-z0-9]/gi, "").length < 3)
  ) {
    errors.paymentReference = "Enter a valid transfer reference or leave it blank.";
  }
  if (
    !isCalendarDate(paymentDate) ||
    paymentDate > localDateInLagos(now)
  ) {
    errors.paymentDate = "Enter a valid payment date that is not in the future.";
  }
  if (paymentTime && !TIME_PATTERN.test(paymentTime)) {
    errors.paymentTime = "Enter a valid transfer time or leave it blank.";
  }
  if (!receipt || receipt.size === 0) {
    errors.receipt = "Upload your payment receipt before continuing.";
  }
  if (!UUID_PATTERN.test(idempotencyKey)) {
    errors.receipt = "Refresh the page and add your receipt again.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !receipt ||
    !Number.isSafeInteger(amountPaid)
  ) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      senderName,
      senderBank,
      amountPaid,
      paymentReference,
      paymentDate,
      paymentTime,
      idempotencyKey,
      receipt,
    },
  };
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function detectReceiptKind(bytes: Uint8Array): ValidatedReceipt["extension"] | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  return null;
}

export async function validateReceiptFile(
  file: File,
): Promise<ReceiptValidationResult> {
  if (file.size === 0) {
    return { success: false, message: "Upload your payment receipt before continuing." };
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return {
      success: false,
      message: "Your receipt is too large. Please upload a file under 5 MB.",
    };
  }

  const suppliedExtension = file.name.split(".").pop()?.toLowerCase();
  const extension = suppliedExtension === "jpeg" ? "jpg" : suppliedExtension;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedExtension = detectReceiptKind(bytes);
  const allowedMimeByExtension = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
  } as const;

  if (
    !extension ||
    !(extension in allowedMimeByExtension) ||
    detectedExtension !== extension
  ) {
    return {
      success: false,
      message: "Please upload a JPG, PNG, WEBP or PDF receipt.",
    };
  }

  const typedExtension = extension as keyof typeof allowedMimeByExtension;
  const contentType = allowedMimeByExtension[typedExtension];
  if (file.type !== contentType) {
    return {
      success: false,
      message: "Please upload a JPG, PNG, WEBP or PDF receipt.",
    };
  }

  return {
    success: true,
    data: { bytes, extension: typedExtension, contentType },
  };
}
