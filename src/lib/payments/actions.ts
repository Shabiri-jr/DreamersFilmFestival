"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import {
  grantOrderAccess,
  hasOrderAccess,
} from "@/lib/orders/access-token";
import {
  type PaymentFieldErrors,
  validatePaymentForm,
  validateReceiptFile,
} from "@/lib/payments/validation";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentActionState = Readonly<{
  status: "idle" | "error";
  message: string;
  fieldErrors: PaymentFieldErrors;
}>;

function errorState(
  message: string,
  fieldErrors: PaymentFieldErrors = {},
): PaymentActionState {
  return { status: "error", message, fieldErrors };
}

function friendlySubmissionError(message: string): string {
  if (message.includes("already been verified")) {
    return "This payment has already been verified.";
  }
  if (message.includes("cancelled")) {
    return "This order has been cancelled.";
  }
  if (message.includes("already been submitted")) {
    return "This payment is already awaiting verification.";
  }
  if (message.includes("not found")) {
    return "We couldn't find this order.";
  }
  return "We couldn't submit your payment information. Please try again.";
}

export async function submitPaymentAction(
  orderNumber: string,
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await assertTrustedOrigin();
  } catch {
    return errorState("This request could not be verified. Refresh and try again.");
  }

  const normalizedOrderNumber = orderNumber.toUpperCase();
  if (!(await hasOrderAccess(normalizedOrderNumber))) {
    return errorState("This order is not available in this browser.");
  }

  const validation = validatePaymentForm(formData);
  if (!validation.success) {
    return errorState(
      "Check the highlighted payment details and try again.",
      validation.errors,
    );
  }

  const receiptValidation = await validateReceiptFile(validation.data.receipt);
  if (!receiptValidation.success) {
    return errorState(receiptValidation.message, {
      receipt: receiptValidation.message,
    });
  }

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("order_number", normalizedOrderNumber)
    .maybeSingle();

  if (orderError || !order) {
    return errorState("We couldn't find this order.");
  }
  if (order.payment_status === "submitted") {
    await grantOrderAccess(normalizedOrderNumber);
    redirect(`/order/${normalizedOrderNumber}`);
  }
  if (order.payment_status === "verified") {
    return errorState("This payment has already been verified.");
  }
  if (order.payment_status === "cancelled") {
    return errorState("This order has been cancelled.");
  }
  if (!(["awaiting_payment", "rejected"] as const).includes(order.payment_status as "awaiting_payment" | "rejected")) {
    return errorState("This order cannot accept a payment submission.");
  }

  const receiptPath = `${order.id}/${randomUUID()}.${receiptValidation.data.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-receipts")
    .upload(receiptPath, receiptValidation.data.bytes, {
      cacheControl: "0",
      contentType: receiptValidation.data.contentType,
      upsert: false,
    });

  if (uploadError) {
    return errorState("We couldn't upload your receipt. Please try again.", {
      receipt: "We couldn't upload your receipt. Please try again.",
    });
  }

  const { data: submission, error: submissionError } = await supabase.rpc(
    "submit_customer_payment",
    {
      p_order_id: order.id,
      p_idempotency_key: validation.data.idempotencyKey,
      p_sender_name: validation.data.senderName,
      p_sender_bank: validation.data.senderBank,
      p_amount_paid: validation.data.amountPaid,
      p_payment_reference: validation.data.paymentReference,
      p_payment_date: validation.data.paymentDate,
      p_payment_time: validation.data.paymentTime,
      p_receipt_path: receiptPath,
    },
  );

  if (submissionError || !submission) {
    await supabase.storage.from("payment-receipts").remove([receiptPath]);
    return errorState(
      friendlySubmissionError(submissionError?.message ?? "Submission failed"),
    );
  }

  if (submission.receipt_path !== receiptPath) {
    await supabase.storage.from("payment-receipts").remove([receiptPath]);
  }

  await grantOrderAccess(normalizedOrderNumber);
  redirect(`/order/${normalizedOrderNumber}`);
}

