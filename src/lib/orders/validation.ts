export type CheckoutFieldErrors = Partial<
  Record<"customerName" | "phone" | "email" | "ticket" | "quantity", string>
>;

export type ValidCheckoutInput = Readonly<{
  customerName: string;
  phone: string;
  email: string | null;
  ticketTypeId: string;
  quantity: number;
  idempotencyKey: string;
}>;

export type CheckoutValidationResult =
  | Readonly<{ success: true; data: ValidCheckoutInput }>
  | Readonly<{ success: false; errors: CheckoutFieldErrors }>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function normalizeCustomerName(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 120
    ? normalized
    : null;
}

export function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  const international = compact.startsWith("+")
    ? compact
    : compact.startsWith("234")
      ? `+${compact}`
      : compact.startsWith("0")
        ? `+234${compact.slice(1)}`
        : null;

  return international && /^\+[0-9]{7,15}$/.test(international)
    ? international
    : null;
}

export function normalizeEmail(value: string): string | null | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

export function validateCheckoutForm(
  formData: FormData,
): CheckoutValidationResult {
  const errors: CheckoutFieldErrors = {};
  const customerName = normalizeCustomerName(readText(formData, "customerName"));
  const phone = normalizePhone(readText(formData, "phone"));
  const email = normalizeEmail(readText(formData, "email"));
  const ticketTypeId = readText(formData, "ticketTypeId");
  const idempotencyKey = readText(formData, "idempotencyKey");
  const quantity = Number(readText(formData, "quantity"));

  if (!customerName) errors.customerName = "Enter your full name.";
  if (!phone) errors.phone = "Enter a valid WhatsApp number with country code.";
  if (email === undefined) errors.email = "Enter a valid email address or leave it blank.";
  if (!UUID_PATTERN.test(ticketTypeId)) errors.ticket = "This ticket is no longer available.";
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    errors.quantity = "Please select a valid quantity.";
  }

  if (!UUID_PATTERN.test(idempotencyKey)) {
    errors.ticket = "Refresh the page and select your ticket again.";
  }

  if (Object.keys(errors).length > 0 || !customerName || !phone || email === undefined) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      customerName,
      phone,
      email,
      ticketTypeId,
      quantity,
      idempotencyKey,
    },
  };
}

