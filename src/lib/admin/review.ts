import {
  PAYMENT_STATUSES,
  type PaymentStatus,
} from "@/types/domain";

export const ADMIN_ORDER_FILTERS = [
  "submitted",
  "verified",
  "rejected",
  "awaiting_payment",
  "cancelled",
  "all",
] as const;

export type AdminOrderFilter = (typeof ADMIN_ORDER_FILTERS)[number];

export const REJECTION_PRESETS = {
  payment_not_found:
    "We could not locate this transfer using the reference you provided.",
  incorrect_amount:
    "The amount received does not match the amount due for this order.",
  invalid_reference:
    "The submitted transaction reference could not be validated.",
  duplicate_evidence:
    "This payment evidence appears to have been submitted for another order.",
  receipt_unclear:
    "The payment receipt is not clear enough for us to verify the transfer.",
  incorrect_details:
    "The submitted payment details do not match the transfer we received.",
} as const;

export type RejectionPreset = keyof typeof REJECTION_PRESETS | "other";

export function parseAdminOrderFilter(value: string | undefined): AdminOrderFilter {
  return ADMIN_ORDER_FILTERS.includes(value as AdminOrderFilter)
    ? (value as AdminOrderFilter)
    : "submitted";
}

export function filterToPaymentStatus(
  filter: AdminOrderFilter,
): PaymentStatus | null {
  if (filter === "all") return null;
  return PAYMENT_STATUSES.includes(filter as PaymentStatus)
    ? (filter as PaymentStatus)
    : "submitted";
}

export function normalizeSearchQuery(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

export function resolveRejectionReason(
  presetValue: string,
  customValue: string,
): string | null {
  const preset = presetValue as RejectionPreset;
  const reason =
    preset === "other"
      ? customValue.trim().replace(/\s+/g, " ")
      : REJECTION_PRESETS[preset as keyof typeof REJECTION_PRESETS];

  if (!reason || reason.length < 3 || reason.length > 1000) return null;
  return reason;
}

export type AmountDifference = Readonly<{
  kind: "match" | "underpayment" | "overpayment";
  amount: number;
}>;

export function getAmountDifference(
  expected: number,
  submitted: number,
): AmountDifference {
  const difference = submitted - expected;
  if (difference === 0) return { kind: "match", amount: 0 };
  return {
    kind: difference < 0 ? "underpayment" : "overpayment",
    amount: Math.abs(difference),
  };
}
