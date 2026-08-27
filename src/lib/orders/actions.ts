"use server";

import { redirect } from "next/navigation";

import { grantOrderAccess } from "@/lib/orders/access-token";
import {
  type CheckoutFieldErrors,
  validateCheckoutForm,
} from "@/lib/orders/validation";
import {
  clearReferralAttributionCookie,
  readReferralAttributionCookie,
} from "@/lib/referrals/cookies";
import { inspectReferralCode } from "@/lib/referrals/server";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutActionState = Readonly<{
  status: "idle" | "error";
  message: string;
  fieldErrors: CheckoutFieldErrors;
}>;

function friendlyDatabaseError(message: string): string {
  if (message.includes("sales are currently closed")) {
    return "Ticket sales are currently closed.";
  }
  if (message.includes("sold out") || message.includes("insufficient")) {
    return "This ticket is sold out or no longer has enough availability.";
  }
  if (message.includes("quantity")) {
    return "Please select a valid quantity.";
  }
  if (message.includes("ticket") || message.includes("Ticket")) {
    return "This ticket is no longer available.";
  }

  return "We couldn't complete your order. Please try again.";
}

export async function createCustomerOrderAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  try {
    await assertTrustedOrigin();
  } catch {
    return {
      status: "error",
      message: "This request could not be verified. Refresh and try again.",
      fieldErrors: {},
    };
  }

  const validation = validateCheckoutForm(formData);
  if (!validation.success) {
    return {
      status: "error",
      message: "Check the highlighted details and try again.",
      fieldErrors: validation.errors,
    };
  }

  let attribution = await readReferralAttributionCookie();
  if (attribution) {
    try {
      const current = await inspectReferralCode(
        attribution.referralCode,
        attribution.source,
      );
      if (
        current.status !== "active" ||
        current.attribution.promoterId !== attribution.promoterId
      ) {
        await clearReferralAttributionCookie();
        attribution = null;
      }
    } catch {
      return {
        status: "error",
        message: "We couldn't validate your referral. Please try again.",
        fieldErrors: {},
      };
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_customer_order", {
      p_checkout_idempotency_key: validation.data.idempotencyKey,
      p_ticket_type_id: validation.data.ticketTypeId,
      p_quantity: validation.data.quantity,
      p_customer_name: validation.data.customerName,
      p_phone: validation.data.phone,
      p_email: validation.data.email,
      p_promoter_id: attribution?.promoterId ?? null,
      p_referral_code: attribution?.referralCode ?? null,
      p_referral_source: attribution?.source ?? null,
    });

  if (error || !data) {
    return {
      status: "error",
      message: friendlyDatabaseError(error?.message ?? "Order creation failed"),
      fieldErrors: {},
    };
  }

  await grantOrderAccess(data.order_number);
  redirect(`/payment/${data.order_number}`);
}
