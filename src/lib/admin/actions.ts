"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin, requireSuperAdmin } from "@/lib/admin/auth";
import { resolveRejectionReason } from "@/lib/admin/review";
import {
  normalizeCustomerName,
  normalizeEmail,
  normalizePhone,
} from "@/lib/orders/validation";
import { normalizeReferralCode } from "@/lib/referrals/domain";
import { assertTrustedOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { issueTicketsForOrder } from "@/lib/tickets/issuance";

export type AdminActionState = Readonly<{
  error?: string;
}>;

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function safeReviewError(message: string): string {
  if (/already been verified/i.test(message)) return "This payment has already been verified.";
  if (/already been reviewed|active payment submission/i.test(message)) {
    return "This payment has already been reviewed. Refresh the order state.";
  }
  if (/permission/i.test(message)) return "You do not have permission to perform this action.";
  return "The payment could not be updated. No partial changes were saved.";
}

export async function loginAdmin(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await assertTrustedOrigin();
  const email = readText(formData, "email").trim().toLowerCase();
  const password = readText(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 200) {
    return { error: "Enter a valid staff email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "The email or password is incorrect." };

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("is_active,role")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account does not have active staff access." };
  }
  const requestedDestination = readText(formData, "next");
  if (
    requestedDestination === "/check-in" &&
    profile.role !== "payment_admin"
  ) {
    redirect("/check-in");
  }
  redirect(profile.role === "gate_staff" ? "/check-in" : "/admin");
}

export async function logoutAdmin(): Promise<never> {
  await assertTrustedOrigin();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function verifyPaymentAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  const admin = await getCurrentAdmin();
  if (!admin || admin.role === "gate_staff") {
    redirect("/admin/unauthorized");
  }

  const orderId = readText(formData, "orderId");
  const submissionId = readText(formData, "submissionId");
  const orderNumber = readText(formData, "orderNumber").toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^[0-9a-f-]{36}$/i.test(submissionId)) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=invalid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_customer_payment", {
    p_order_id: orderId,
    p_submission_id: submissionId,
  });
  if (error) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent(safeReviewError(error.message))}`);
  }
  const issuance = await issueTicketsForOrder(orderId);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath(`/order/${orderNumber}`);
  revalidatePath("/admin/tickets");
  redirect(
    `/admin/orders/${encodeURIComponent(orderNumber)}?result=${issuance.success ? "verified_issued" : "verified_pending"}`,
  );
}

export async function issueTicketsAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  const admin = await getCurrentAdmin();
  if (!admin || admin.role === "gate_staff") redirect("/admin/unauthorized");

  const orderId = readText(formData, "orderId");
  const orderNumber = readText(formData, "orderNumber").toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=invalid`);
  }

  const issuance = await issueTicketsForOrder(orderId);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath(`/order/${orderNumber}`);
  revalidatePath("/admin/tickets");
  if (!issuance.success) {
    redirect(
      `/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent(issuance.error)}`,
    );
  }
  redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?result=tickets_issued`);
}

export async function rejectPaymentAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  const admin = await getCurrentAdmin();
  if (!admin || admin.role === "gate_staff") {
    redirect("/admin/unauthorized");
  }

  const orderId = readText(formData, "orderId");
  const submissionId = readText(formData, "submissionId");
  const orderNumber = readText(formData, "orderNumber").toUpperCase();
  const reason = resolveRejectionReason(
    readText(formData, "reasonPreset"),
    readText(formData, "customReason"),
  );
  if (!reason) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent("Choose a rejection reason or enter a clear explanation.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_customer_payment", {
    p_order_id: orderId,
    p_submission_id: submissionId,
    p_reason: reason,
  });
  if (error) {
    redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?error=${encodeURIComponent(safeReviewError(error.message))}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  redirect(`/admin/orders/${encodeURIComponent(orderNumber)}?result=rejected`);
}

function promoterInput(formData: FormData) {
  const name = normalizeCustomerName(readText(formData, "name"));
  const phone = normalizePhone(readText(formData, "phone"));
  const email = normalizeEmail(readText(formData, "email"));
  const referralCode = normalizeReferralCode(readText(formData, "referralCode"));
  return name && phone && email !== undefined && referralCode
    ? { name, phone, email, referral_code: referralCode }
    : null;
}

function promoterError(message: string): string {
  return /duplicate|unique|promoters_referral_code_key/i.test(message)
    ? "That referral code is already in use."
    : "Check the promoter details and try again.";
}

export async function createPromoterAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  await requireSuperAdmin();
  const input = promoterInput(formData);
  if (!input) redirect(`/admin/promoters?error=${encodeURIComponent("Enter a valid name, WhatsApp number, email, and referral code.")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("promoters").insert(input);
  if (error) redirect(`/admin/promoters?error=${encodeURIComponent(promoterError(error.message))}`);
  revalidatePath("/admin/promoters");
  redirect("/admin/promoters?result=created");
}

export async function updatePromoterAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  await requireSuperAdmin();
  const promoterId = readText(formData, "promoterId");
  const input = promoterInput(formData);
  if (!/^[0-9a-f-]{36}$/i.test(promoterId) || !input) {
    redirect(`/admin/promoters/${encodeURIComponent(promoterId)}?error=${encodeURIComponent("Enter valid promoter details.")}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("promoters").update(input).eq("id", promoterId);
  if (error) redirect(`/admin/promoters/${promoterId}?error=${encodeURIComponent(promoterError(error.message))}`);
  revalidatePath("/admin/promoters");
  revalidatePath(`/admin/promoters/${promoterId}`);
  redirect(`/admin/promoters/${promoterId}?result=updated`);
}

export async function togglePromoterAction(formData: FormData): Promise<void> {
  await assertTrustedOrigin();
  await requireSuperAdmin();
  const promoterId = readText(formData, "promoterId");
  const isActive = readText(formData, "isActive") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(promoterId)) redirect("/admin/promoters?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("promoters").update({ is_active: !isActive }).eq("id", promoterId);
  if (error) redirect(`/admin/promoters/${promoterId}?error=${encodeURIComponent("Promoter status could not be changed.")}`);
  revalidatePath("/admin/promoters");
  revalidatePath(`/admin/promoters/${promoterId}`);
  redirect(`/admin/promoters/${promoterId}?result=${isActive ? "deactivated" : "activated"}`);
}
